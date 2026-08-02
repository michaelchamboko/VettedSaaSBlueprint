import { spawn } from "node:child_process";

import { hermesExecutorCapabilitiesSchema, hermesExecutorResponseSchema } from "../../src/lib/landing-research/contracts";

const capability = process.env.HERMES_EXECUTOR_CAPABILITY;
if (capability !== "hermes_product_identity" && capability !== "hermes_research") {
  process.stderr.write("HERMES_EXECUTOR_CAPABILITY is invalid.\n");
  process.exitCode = 78;
} else if (process.argv.includes("--probe")) {
  process.stdout.write(`${JSON.stringify(hermesExecutorCapabilitiesSchema.parse({ schema_version: "HermesExecutorCapabilitiesV1", capability, contract_version: "HermesResearchContractV1", supports: ["--probe", "stdin-json"] }))}\n`);
} else {
  const cliPath = process.env.HERMES_CLI_PATH?.trim() || "/usr/local/bin/hermes";
  const child = spawn(cliPath, ["send", "--json"], {
    shell: false,
    windowsHide: true,
    env: { NODE_ENV: process.env.NODE_ENV ?? "production", PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    stdio: "pipe",
  });
  let stdout = "";
  let stderrBytes = 0;
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
    if (Buffer.byteLength(stdout, "utf8") > 8 * 1024 * 1024) child.kill("SIGKILL");
  });
  child.stderr.on("data", (chunk: Buffer) => { stderrBytes += chunk.length; });
  child.on("error", () => { process.exitCode = 78; });
  child.on("close", (code: number | null) => {
    if (code !== 0 || stderrBytes > 64 * 1024) {
      process.exitCode = code === 75 ? 75 : 65;
      return;
    }
    try {
      const parsed = hermesExecutorResponseSchema.parse(JSON.parse(stdout.trim()));
      if (parsed.capability !== capability) throw new Error("capability mismatch");
      process.stdout.write(`${JSON.stringify(parsed)}\n`);
    } catch {
      process.exitCode = 65;
    }
  });
  process.stdin.pipe(child.stdin);
}
