import assert from "node:assert/strict";
import test from "node:test";

import { buildOracleAffiliateRedirectUrl, buildOracleEventIngestUrl } from "../src/lib/tracking/oracle-public-endpoints";

const base = "https://public.oracle-gateway.example.com";
const nestedBase = "https://public.oracle-gateway.example.com/edge/api";

test("buildOracleEventIngestUrl uses configured base", () => {
  const url = buildOracleEventIngestUrl(base);
  assert.equal(url, `${base}/ingest/events`);
});

test("buildOracleEventIngestUrl supports nested base paths without duplicating slashes", () => {
  const url = buildOracleEventIngestUrl(`${nestedBase}/`);
  assert.equal(url, `${nestedBase}/ingest/events`);
});

test("buildOracleAffiliateRedirectUrl preserves requested link id", () => {
  const url = buildOracleAffiliateRedirectUrl("11111111-1111-1111-1111-111111111111", base);
  assert.equal(url, `${base}/r/affiliate?linkId=11111111-1111-1111-1111-111111111111`);
});

test("buildOracleAffiliateRedirectUrl supports nested base paths without duplicating slashes", () => {
  const url = buildOracleAffiliateRedirectUrl("11111111-1111-1111-1111-111111111111", nestedBase);
  assert.equal(url, `${nestedBase}/r/affiliate?linkId=11111111-1111-1111-1111-111111111111`);
});

test("buildOracleEventIngestUrl falls back when base missing", () => {
  const original = process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL;
  process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL = "";
  const url = buildOracleEventIngestUrl();
  assert.equal(url, "/ingest/events");
  process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL = original;
});
