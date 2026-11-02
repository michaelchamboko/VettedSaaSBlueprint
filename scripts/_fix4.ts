import fs from "node:fs";
const file="src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json";
const a=JSON.parse(fs.readFileSync(file,"utf8"));
function get(obj:any, path:string){ return path.split(".").reduce((o:any,k:any)=>Array.isArray(o)?o[Number(k)]:o?.[k],obj); }
function set(obj:any, path:string, val:string){ const parts=path.split("."); let cur=obj; for(let i=0;i<parts.length-1;i++){ const k=parts[i]; if(Array.isArray(cur)) cur=cur[Number(k)]; else cur=cur[k]; } const last=parts[parts.length-1]; if(Array.isArray(cur)) cur[Number(last)]=val; else cur[last]=val; }
const edits: Record<string,string> = {
  "hero.primary_cta_label": get(a,"hero.primary_cta_label").replace("Review Diginius agency fit", "Review Diginius for agency fit"),
  "hero.answer_snippet": get(a,"hero.answer_snippet").replace("identify every visitor", "identify every visitor."),
  "how_it_works.1.description": get(a,"how_it_works.1.description").replace("without a documented method", "without a documented method."),
  "faq.2.answer": get(a,"faq.2.answer").replace("unlimited accounts", "unlimited accounts.")
};
let changed=0;
for (const [p,v] of Object.entries(edits)) {
  const cur=get(a,p);
  if (cur===v) { console.log("NO-CHANGE:", p); continue; }
  set(a,p,v); changed++;
}
console.log("changed", changed);
fs.writeFileSync(file, JSON.stringify(a,null,2)+"\n");
