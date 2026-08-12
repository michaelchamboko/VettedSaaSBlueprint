import assert from "node:assert/strict";
import test from "node:test";

import { computeResearchAuthorityMigrationChecksum } from "../scripts/verify-neon-landing-research-authority-source";

test("R001 migration checksum is stable across LF and CRLF checkouts", () => {
  const marker = "b".repeat(64);
  const lfSource = `begin;\nvalues ('R001', '${marker}');\ncommit;\n`;

  assert.equal(
    computeResearchAuthorityMigrationChecksum(lfSource.replaceAll("\n", "\r\n")),
    computeResearchAuthorityMigrationChecksum(lfSource),
  );
});
