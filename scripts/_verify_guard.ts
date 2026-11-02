import { assertEditorialVoiceSignals } from "../src/lib/editorial/refinement";
import fs from "node:fs";
const a=JSON.parse(fs.readFileSync("src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json","utf8"));
try { assertEditorialVoiceSignals("landing", a); console.log("PASS: editorial voice guard"); } catch(e) { console.log("FAIL:", e.message); }
