import { spawn } from "node:child_process";

// Small explicit-input helpers shared by the async landing-quality and
// candidate-quality runners. Stage 2 remains synchronous and keeps its own
// generic JSON parser because its acceptance rules differ (it accepts any
// JSON value, not only objects).

export function parseJsonObject(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolveResult) => {
    let settled = false;
    let child;
    let stdout = "";
    let stderr = "";
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveResult(result);
    };
    try {
      child = spawn(command, args, { cwd: options.cwd ?? process.cwd() });
      child.stdout?.on("data", (chunk) => { stdout += chunk; });
      child.stderr?.on("data", (chunk) => { stderr += chunk; });
      child.once("error", (error) => finish({ exitCode: 1, stdout, stderr: `${stderr}${error.message}` }));
      child.once("close", (code) => finish({ exitCode: code ?? 1, stdout, stderr }));
    } catch (error) {
      finish({ exitCode: 1, stdout, stderr: error instanceof Error ? error.message : String(error) });
    }
  });
}
