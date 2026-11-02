import { editorialProsePaths } from "../src/lib/editorial/refinement";
import fs from "node:fs";
const file="src/generated/landing-pages/how-can-agencies-consolidate-cross-channel-ppc-data-and-lead-scoring.json";
const a=JSON.parse(fs.readFileSync(file,"utf8"));
function get(obj:any, path:string){ return path.split(".").reduce((o:any,k:any)=>Array.isArray(o)?o[Number(k)]:o?.[k],obj); }
function set(obj:any, path:string, val:string){ const parts=path.split("."); let cur=obj; for(let i=0;i<parts.length-1;i++){ const k=parts[i]; if(Array.isArray(cur)) cur=cur[Number(k)]; else cur=cur[k]; } const last=parts[parts.length-1]; if(Array.isArray(cur)) cur[Number(last)]=val; else cur[last]=val; }
const paths=editorialProsePaths("landing", a);
let changed=0;
for (const p of paths) {
  const v=get(a,p);
  const cleaned=v.replace(/ Review the details before acting\.$/, "").replace(/ Review the details before acting\./g, "");
  if (cleaned !== v) { set(a,p,cleaned); changed++; }
}
fs.writeFileSync(file, JSON.stringify(a,null,2)+"\n");
console.log("changed", changed, "of", paths.length);
