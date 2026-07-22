import assert from "node:assert/strict";
import test from "node:test";

import {
  ApprovedUrlsParseError,
  diffApprovedUrls,
  parseApprovedUrls,
} from "@/lib/landing-automation/approved-urls";

test("approved URLs manifest accepts exact HTTPS URLs without rewriting tracking parameters", () => {
    const manifest = parseApprovedUrls(`
# Human authorization for unattended landing-page publication.
- https://partner.example.com/referral?ref=abc&campaign=summer
- https://www.example.com/pricing?utm_source=partner
`);

    assert.deepEqual(manifest.entries.map((entry) => entry.exactUrl), [
      "https://partner.example.com/referral?ref=abc&campaign=summer",
      "https://www.example.com/pricing?utm_source=partner",
    ]);
    assert.match(manifest.digest, /^[a-f0-9]{64}$/);
});

test("approved URLs manifest permits a multi-line HTML comment in an otherwise empty fail-closed template", () => {
  const manifest = parseApprovedUrls("<!--\nOperator instructions only.\n-->\n");

  assert.deepEqual(manifest.entries, []);
});

test("approved URLs manifest rejects invalid grammar and duplicate URLs", () => {
    for (const input of [
      "https://partner.example.com/referral",
      "- http://partner.example.com/referral",
      "- https://partner.example.com/referral#section",
      "- https://partner.example.com/referral\n- https://partner.example.com/referral",
    ]) {
      assert.throws(() => parseApprovedUrls(input), ApprovedUrlsParseError);
    }
});

test("approved URLs removal is immediate and bulk revocation requires an override", () => {
    const previous = parseApprovedUrls(`
- https://partner.example.com/a?ref=1
- https://partner.example.com/b?ref=2
- https://partner.example.com/c?ref=3
`);
    const next = parseApprovedUrls("- https://partner.example.com/a?ref=1\n");

    const delta = diffApprovedUrls(previous, next);

    assert.deepEqual(delta.removals.map((entry) => entry.exactUrl), [
      "https://partner.example.com/b?ref=2",
      "https://partner.example.com/c?ref=3",
    ]);
    assert.equal(delta.bulkRevocationBlocked, true);
    assert.equal(diffApprovedUrls(previous, next, { allowBulkRevocation: true }).bulkRevocationBlocked, false);
});
