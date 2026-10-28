import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

type Requirement = {
  id: string;
  status: string;
  tasks: string[];
};

const requirements = JSON.parse(readFileSync("build-pack/requirements.json", "utf8")).requirements as Requirement[];
const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));

test("only the explicit retired workflow requirements lose executable mappings", () => {
  const retiredIds = [
    "R-C-D03-S-5aed3f9cadd5",
    "R-C-D08-S-1419bc672bd8",
    "R-C-D08-S-8a9b77a9a639",
    "R-C-D08-S-aeebd36c92f4",
  ];

  assert.deepEqual(
    requirements.filter((requirement) => requirement.status === "owner-retired").map((requirement) => requirement.id),
    retiredIds,
  );
  for (const id of retiredIds) assert.deepEqual(byId.get(id)?.tasks, []);
});

test("generic automation and reliability requirements remain outside the retired programme", () => {
  for (const id of ["R-C-D03-S-92b5963026d8", "R-C-D10-S-745a692f3a77"]) {
    assert.notEqual(byId.get(id)?.status, "owner-retired");
  }
});
