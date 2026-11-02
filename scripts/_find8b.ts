import { editorialProsePaths } from "../src/lib/editorial/refinement";
import fs from "node:fs";
const a=JSON.parse(fs.readFileSync("src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json","utf8"));
function get(obj:any, path:string){ return path.split(".").reduce((o:any,k:any)=>Array.isArray(o)?o[Number(k)]:o?.[k],obj); }
const paths=editorialProsePaths("landing", a);
for (const p of paths) {
  const v=get(a,p);
  if (!v.includes("Review the details before acting")) console.log(p+" => "+v);
}
console.log("done");
