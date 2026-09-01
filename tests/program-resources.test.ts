import assert from "node:assert/strict";
import test from "node:test";
import { partnerstackProgramResourceSchema } from "../src/lib/schemas/contracts";

test("program resources require an offer folder", () => {
  assert.throws(() =>
    partnerstackProgramResourceSchema.parse({
      resource_type: "pdf",
      title: "Terms PDF",
    })
  );
});

test("program resources accept metadata for storage pointers", () => {
  const resource = partnerstackProgramResourceSchema.parse({
    offer_folder_id: "550e8400-e29b-41d4-a716-446655440000",
    resource_type: "link",
    title: "Terms link",
    source_url: "https://example.com/terms",
    storage_url: "https://storage.example.com/terms.pdf",
  });
  assert.equal(resource.analysis_status, "pending");
  assert.equal(resource.owner_review_status, "pending");
});
