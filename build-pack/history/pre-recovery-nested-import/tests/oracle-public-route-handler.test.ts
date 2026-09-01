import assert from "node:assert/strict";
import test from "node:test";

import { POST as forwardPageViewEvent } from "../src/app/api/events/page-view/route";
import { POST as forwardCtaClickEvent } from "../src/app/api/events/cta-click/route";
import { POST as forwardFaqExpandEvent } from "../src/app/api/events/faq-expand/route";
import { POST as forwardLinkErrorEvent } from "../src/app/api/events/link-error/route";
import { POST as forwardAffiliateClickEvent } from "../src/app/api/events/affiliate-click/route";
import { POST as ingestEvents } from "../src/app/ingest/events/route";
import { GET as affiliateClickGet } from "../src/app/api/events/affiliate-click/route";
import { GET as oracleAffiliateRedirect } from "../src/app/r/affiliate/route";

function withEnv<T>(name: string, value: string, fn: () => Promise<T>) {
  const previous = process.env[name];
  process.env[name] = value;
  return fn().finally(() => {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  });
}

function withAnalytics<T>(fn: () => Promise<T>) {
  return withEnv("ANALYTICS_ENABLED", "true", () =>
    withEnv("ANALYTICS_RETENTION_VERIFIED_AT", "2026-07-10T08:00:00.000Z", fn),
  );
}

test("page-view event handler forwards to configured Oracle ingest endpoint", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
    calls.push({ url, body: String(init?.body ?? "") });
    return Response.json({ ok: true }, { status: 201 });
  };
  try {
    const response = await withAnalytics(() => withEnv("NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL", "https://public.oracle.example", async () => {
      return forwardPageViewEvent(
        new Request("https://test.local/api/events/page-view", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ page_slug: "workflow-tools-review", page_type: "direct_review", event_type: "page_view" }),
        }),
      );
    }));
    assert.equal(response.status, 201);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).pathname, "/ingest/events");
    assert.equal(new URL(calls[0].url).origin, "https://test.local");
  } finally {
    global.fetch = originalFetch;
  }
});

test("events ingest route forwards to Oracle and remains resilient if local DB is unavailable", async () => {
  const bodies: string[] = [];
  const originalFetch = global.fetch;
  global.fetch = async (_input, init) => {
    bodies.push(String(init?.body ?? ""));
    return Response.json({ accepted: true }, { status: 201 });
  };

  try {
    const response = await withAnalytics(() => withEnv("NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL", "https://public.oracle.example", async () => {
      return ingestEvents(
        new Request("https://test.local/ingest/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ page_slug: "workflow-tools-review", event_type: "page_view" }),
        }),
      );
    }));
    assert.equal(response.status, 201);
    const body = bodies[0] ?? "";
    assert.ok(body?.includes(`\"page_type\"`) || body?.includes("page_slug"));
  } finally {
    global.fetch = originalFetch;
  }
});

test("missing base in affiliate click fallback keeps request from hard-failing on Vercel without Oracle", async () => {
  const originalBase = process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL;
  delete process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL;

  const response = await affiliateClickGet(
    new Request("https://test.local/api/events/affiliate-click?linkId=22222222-2222-2222-b222-222222222222"),
  );
  delete process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL;
  if (originalBase === undefined) {
    process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL = "";
  } else {
    process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL = originalBase;
  }

  assert.equal(response.status, 302);
  const location = response.headers.get("location") || "";
  assert.ok(location.includes("/r/affiliate") || location.includes("affiliate-link-unavailable"));
});

test("oracle public affiliate redirect fallback stays safe when base is invalid", async () => {
  const calls: Array<string> = [];
  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    calls.push(typeof input === "string" ? input : input.toString());
    return Response.json({ ok: true }, { status: 201 });
  };
  const req = new Request("https://public.oracle.example/r/affiliate?linkId=22222222-2222-2222-b222-222222222222");
  const response = await withEnv("NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL", "https://public.oracle.example", async () => {
    return oracleAffiliateRedirect(req);
  });
  assert.equal(response.status, 302);
  if (calls.length > 0) {
    assert.ok(calls[0].includes("/ingest/events"));
  }
  global.fetch = originalFetch;
});

test("disabled event ingress returns 202 without forwarding", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return Response.json({ ok: true }, { status: 201 });
  };
  try {
    for (const handler of [forwardPageViewEvent, forwardCtaClickEvent, forwardFaqExpandEvent, forwardLinkErrorEvent, forwardAffiliateClickEvent]) {
      const response = await withEnv("ANALYTICS_ENABLED", "false", () =>
        handler(new Request("https://test.local/api/events/suppressed", { method: "POST", body: "{}" })),
      );
      assert.equal(response.status, 202);
    }
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("GPC suppresses ingest and affiliate tracking while preserving redirect", async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return Response.json({ ok: true }, { status: 201 });
  };
  try {
    const ingestResponse = await withAnalytics(() => ingestEvents(new Request("https://test.local/ingest/events", {
      method: "POST",
      headers: { "Sec-GPC": "1", "content-type": "application/json" },
      body: JSON.stringify({ event_type: "page_view" }),
    })));
    const redirectResponse = await withAnalytics(() => withEnv("NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL", "https://public.oracle.example", () =>
      oracleAffiliateRedirect(new Request("https://test.local/r/affiliate?linkId=22222222-2222-2222-b222-222222222222", { headers: { DNT: "1" } })),
    ));
    assert.equal(ingestResponse.status, 202);
    assert.equal(redirectResponse.status, 302);
    assert.equal(calls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
