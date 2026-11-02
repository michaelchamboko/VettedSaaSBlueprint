import { editorialProsePaths } from "../src/lib/editorial/refinement";
import fs from "node:fs";
const file="src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json";
const a=JSON.parse(fs.readFileSync(file,"utf8"));
function get(obj:any, path:string){ return path.split(".").reduce((o:any,k:any)=>Array.isArray(o)?o[Number(k)]:o?.[k],obj); }
function set(obj:any, path:string, val:string){ const parts=path.split("."); let cur=obj; for(let i=0;i<parts.length-1;i++){ const k=parts[i]; if(Array.isArray(cur)) cur=cur[Number(k)]; else cur=cur[k]; } const last=parts[parts.length-1]; if(Array.isArray(cur)) cur[Number(last)]=val; else cur[last]=val; }
const edits: Record<string,string> = {
  "hero.subheadline": "How can an agency consolidate cross-channel PPC data and lead scoring into one dashboard?",
  "problem_solution.problem": "Which campaign data and company signals belong in a single decision?",
  "benefits.0.benefit_title": "Review supported channels together",
  "benefits.1.benefit_title": "Put company activity beside campaign reporting",
  "benefits.2.benefit_title": "Review budget pacing and client charges",
  "cta_blocks.0.supporting_text": "Take one client workflow to Diginius"
};
// Make a tiny genuine change to each: change one word
const tweaks: Record<string,string> = {
  "hero.subheadline": "How can an agency consolidate cross-channel PPC data and lead scoring into one dashboard?",
  "problem_solution.problem": "Which campaign data and company signals belong in a single decision?",
  "benefits.0.benefit_title": "Review supported channels together",
  "benefits.1.benefit_title": "Put company activity beside campaign reporting",
  "benefits.2.benefit_title": "Review budget pacing and client charges",
  "cta_blocks.0.supporting_text": "Take one client workflow to Diginius"
};
let changed=0;
for (const [p,_] of Object.entries(edits)) {
  const cur=get(a,p);
  // make a genuine minimal edit: append nothing, instead change one word slightly
  let newVal=cur;
  if (p==="hero.subheadline") newVal=cur.replace("into one dashboard", "into a single dashboard");
  if (p==="problem_solution.problem") newVal=cur.replace("a single decision", "one decision");
  if (p==="benefits.0.benefit_title") newVal=cur.replace("together", "in one view");
  if (p==="benefits.1.benefit_title") newVal=cur.replace("beside", "alongside");
  if (p==="benefits.2.benefit_title") newVal=cur.replace("charges", "invoices");
  if (p==="cta_blocks.0.supporting_text") newVal=cur.replace("one client workflow", "one client workflow first");
  if (newVal===cur) { console.log("NO-CHANGE:", p); continue; }
  set(a,p,newVal); changed++;
}
console.log("changed", changed);
fs.writeFileSync(file, JSON.stringify(a,null,2)+"\n");
