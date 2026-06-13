import assert from "node:assert/strict";
import test from "node:test";
import { affiliateLinkSchema, productSchema } from "../src/lib/schemas/contracts";

test("product schema accepts the vault defaults", () => {
  const product = productSchema.parse({
    name: "Acme",
    slug: "acme",
  });
  assert.equal(product.status, "draft");
  assert.deepEqual(product.target_countries, []);
});

test("affiliate link schema requires an original PartnerStack URL", () => {
  assert.throws(() =>
    affiliateLinkSchema.parse({
      product_id: "550e8400-e29b-41d4-a716-446655440000",
      partnerstack_url: "https://example.com/nope",
      link_type: "cta",
    })
  );
});

test("affiliate link schema accepts a PartnerStack referral URL", () => {
  const affiliateLink = affiliateLinkSchema.parse({
    product_id: "550e8400-e29b-41d4-a716-446655440000",
    partnerstack_url: "https://partnerstack.com/redirect/example",
    link_type: "cta",
  });
  assert.equal(affiliateLink.status, "draft");
});
