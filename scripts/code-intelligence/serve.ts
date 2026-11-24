import { spawn } from "node:child_process";
import { binary } from "./common.ts";
// Resolve the verified per-user binary without relying on a GUI process's stale PATH.
const child = spawn(binary(), [], { cwd: process.cwd(), stdio: "inherit" });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
