import assert from "node:assert/strict";
import test from "node:test";

import { buildPublicAffiliateRedirectUrl, buildPublicEventIngestUrl } from "../src/lib/tracking/public-tracking-endpoints";

const base = "https://public.storage-gateway.example.com";
const nestedBase = "https://public.storage-gateway.example.com/edge/api";

test("buildPublicEventIngestUrl uses configured base", () => {
  const url = buildPublicEventIngestUrl(base);
  assert.equal(url, `${base}/ingest/events`);
});

test("buildPublicEventIngestUrl supports nested base paths without duplicating slashes", () => {
  const url = buildPublicEventIngestUrl(`${nestedBase}/`);
  assert.equal(url, `${nestedBase}/ingest/events`);
});

test("buildPublicAffiliateRedirectUrl preserves requested link id", () => {
  const url = buildPublicAffiliateRedirectUrl("11111111-1111-1111-1111-111111111111", base);
  assert.equal(url, `${base}/r/affiliate?linkId=11111111-1111-1111-1111-111111111111`);
});

test("buildPublicAffiliateRedirectUrl supports nested base paths without duplicating slashes", () => {
  const url = buildPublicAffiliateRedirectUrl("11111111-1111-1111-1111-111111111111", nestedBase);
  assert.equal(url, `${nestedBase}/r/affiliate?linkId=11111111-1111-1111-1111-111111111111`);
});

test("buildPublicEventIngestUrl falls back when base missing", () => {
  const original = process.env.NEXT_PUBLIC_TRACKING_BASE_URL;
  process.env.NEXT_PUBLIC_TRACKING_BASE_URL = "";
  const url = buildPublicEventIngestUrl();
  assert.equal(url, "/ingest/events");
  process.env.NEXT_PUBLIC_TRACKING_BASE_URL = original;
});
