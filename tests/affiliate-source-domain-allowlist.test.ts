import assert from "node:assert/strict";
import test from "node:test";

import { affiliateLinkSchema } from "../src/lib/schemas/contracts";

test("affiliate link schema accepts the four user-supplied non-404 affiliate domains", () => {
  const urls = [
    "https://get.carepatron.com/michaelmedium",
    "https://get.datahawk.co/mau0otko9lz4-o5aq3q",
    "https://free-trial.adcreative.ai/8phdnllve4xi",
    "https://partners.snowfire.ai/j1a8kovs1uez",
  ];

  for (const partnerstack_url of urls) {
    const affiliateLink = affiliateLinkSchema.parse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      partnerstack_url,
      link_type: "primary_cta",
    });
    assert.equal(affiliateLink.partnerstack_url, partnerstack_url);
  }
});
