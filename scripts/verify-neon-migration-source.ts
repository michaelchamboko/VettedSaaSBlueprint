import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(path.join(process.cwd(), "db", "repository-intelligence-v001.sql"), "utf8");
const required = [
  "create schema if not exists repository_intelligence_v1",
  "repository_intelligence_v1.snapshots",
  "repository_intelligence_v1.nodes",
  "repository_intelligence_v1.edges",
  "repository_intelligence_v1.impact",
  "on delete cascade",
];
const missing = required.filter((fragment) => !migration.toLowerCase().includes(fragment.toLowerCase()));
if (missing.length) throw new Error(`Migration is missing required fragments: ${missing.join(", ")}`);
process.stdout.write(JSON.stringify({ status: "pass", migration: "repository-intelligence-v001", requiredFragments: required.length }) + "\n");
