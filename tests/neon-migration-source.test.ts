import assert from "node:assert/strict";
import test from "node:test";

import { computeMigrationSourceChecksum } from "../scripts/verify-neon-migration-source";

test("migration checksum is stable across LF and CRLF checkouts", () => {
  const marker = "a".repeat(64);
  const lfSource = `begin;\nvalues ('V001', '${marker}');\ncommit;\n`;
  const crlfSource = lfSource.replaceAll("\n", "\r\n");

  assert.equal(computeMigrationSourceChecksum(crlfSource), computeMigrationSourceChecksum(lfSource));
});
