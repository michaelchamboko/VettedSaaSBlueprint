// The host keeps the deadline and exit receipt alive if the dispatcher exits.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { writeFileSync, renameSync } from "node:fs";

process.once("message", message => {
  const input = typeof message === "string" ? JSON.parse(message) : message;
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("STATE_INTEGRITY: invalid worker host message");
  if (process.connected) process.disconnect();
  const marker = (suffix, value) => writeFileSync(input.ownershipFile + suffix, value, { flag: "wx", flush: true });
  marker(".start", "launch");
  const windows = process.platform === "win32";
  const guard = fileURLToPath(new URL("./worker-job.ps1", import.meta.url));
  const child = spawn(windows ? "pwsh" : input.executable,
    windows ? ["-NoProfile", "-NonInteractive", "-File", guard] : input.args, {
      cwd: input.cwd, windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"], detached: !windows,
    });
  child.stdin.on("error", () => {}); // Spawn and exit failures are recorded below.
  child.stdin.end(windows ? JSON.stringify({ executable: input.executable, cwd: input.cwd, args: input.args }) : undefined);
  let stdout = "";
  let stderr = "";
  let bytes = 0;
  let timedOut = false;
  let hardDeadline;
  const terminate = () => {
    if (timedOut) return;
    timedOut = true;
    hardDeadline = setTimeout(() => process.exit(1), 5000);
    if (!child.pid) return;
    if (windows) child.kill();
    else {
      try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
  };
  if (child.pid) marker(".pid", String(child.pid));
  const deadline = setTimeout(terminate, input.timeoutMs);
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 16 * 1024 * 1024) terminate();
      else if (stream === child.stdout) stdout += chunk;
      else stderr += chunk;
    });
  }
  child.once("error", error => {
    stderr += error.message;
    if (!child.pid) marker(".pid", "spawn-failed");
  });
  child.once("close", exitCode => {
    clearTimeout(deadline);
    clearTimeout(hardDeadline);
    marker(".tmp", JSON.stringify({ stdout, stderr, exitCode, timedOut }));
    renameSync(input.ownershipFile + ".tmp", input.ownershipFile + ".out");
  });
});
