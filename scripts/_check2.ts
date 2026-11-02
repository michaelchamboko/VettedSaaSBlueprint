import { editorialProse } from "../src/lib/editorial/refinement";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const a=JSON.parse(fs.readFileSync("src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json","utf8"));
const prose=editorialProse("landing", a);
const r=spawnSync(process.env.PYTHON ?? "python", [".agents/skills/eleanor-editorial/tools/deslop.py","--text",prose], {encoding:"utf8", env:{...process.env,PYTHONIOENCODING:"utf-8"}});
console.log("STATUS", r.status);
console.log(r.stdout);