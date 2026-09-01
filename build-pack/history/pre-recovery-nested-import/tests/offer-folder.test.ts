import assert from "node:assert/strict";
import test from "node:test";
import { offerFolderSchema } from "../src/lib/schemas/contracts";

test("offer folder requires both product and affiliate link references", () => {
  assert.throws(() =>
    offerFolderSchema.parse({
      name: "Acme Review",
      product_id: "550e8400-e29b-41d4-a716-446655440000",
    })
  );
});

test("offer folder accepts linked product and affiliate link ids", () => {
  const folder = offerFolderSchema.parse({
    name: "Acme Review",
    product_id: "550e8400-e29b-41d4-a716-446655440000",
    affiliate_link_id: "550e8400-e29b-41d4-a716-446655440001",
  });
  assert.equal(folder.status, "active");
});
