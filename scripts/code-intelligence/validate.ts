import { validate } from "./common.ts";
const result = validate(process.cwd());
if (process.argv.includes("--current") && !result.current) throw new Error("Published graph needs a source refresh");
console.log(JSON.stringify(result, null, 2));
