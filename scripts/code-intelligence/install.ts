import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { CBM_VERSION } from "./common.ts";

const assets = {
  "win32-x64": { archiveName: "codebase-memory-mcp-windows-amd64.zip", sha256: "4e4e0f16b45233af5c757a1fcbe3c3b16e9056375b1fbe2ce020b6de75dedcc0", binaryName: "codebase-memory-mcp.exe", kind: "zip" },
  "linux-x64": { archiveName: "codebase-memory-mcp-linux-amd64.tar.gz", sha256: "8453015145f072c1b9b019cbdd02cea8cc6f18cc5e116036dd20992631c638c7", binaryName: "codebase-memory-mcp", kind: "tar.gz" },
} as const;

async function main(): Promise<void> {
  const platform = `${process.platform}-${process.arch}`;
  const asset = assets[platform as keyof typeof assets];
  if (!asset) throw new Error(`Unsupported platform: ${platform}`);
  const privateRoot = process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || path.join(homedir(), "AppData", "Local"), "codebase-memory-setup")
    : path.join(homedir(), ".cache", "codebase-memory-setup");
  mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  if (lstatSync(privateRoot).isSymbolicLink()) throw new Error("Installer cache must not be a symlink.");
  const temporary = mkdtempSync(path.join(privateRoot, "install-"));
  try {
    const response = await fetch(`https://github.com/DeusData/codebase-memory-mcp/releases/download/v${CBM_VERSION}/${asset.archiveName}`);
    if (!response.ok) throw new Error(`Release download failed: HTTP ${response.status}`);
    const archiveBytes = Buffer.from(await response.arrayBuffer());
    const digest = createHash("sha256").update(archiveBytes).digest("hex");
    if (digest !== asset.sha256) throw new Error(`Release SHA256 mismatch: expected ${asset.sha256}, got ${digest}`);
    const archive = path.join(temporary, asset.archiveName);
    writeFileSync(archive, archiveBytes, { mode: 0o600 });
    const extracted = path.join(temporary, "extracted");
    mkdirSync(extracted, { mode: 0o700 });
    if (asset.kind === "zip") {
      const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
      execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(extracted)}`], { stdio: "inherit", windowsHide: true });
    } else {
      execFileSync("tar", ["-xzf", archive, "-C", extracted], { stdio: "inherit" });
    }
    const findBinary = (directory: string): string | undefined => {
      for (const name of readdirSync(directory)) {
        const candidate = path.join(directory, name);
        const stat = lstatSync(candidate);
        if (stat.isSymbolicLink()) throw new Error("Release archive contains an unexpected symlink.");
        if (stat.isDirectory()) {
          const found = findBinary(candidate);
          if (found) return found;
        } else if (stat.isFile() && name === asset.binaryName) return candidate;
      }
      return undefined;
    };
    const binary = findBinary(extracted);
    if (!binary) throw new Error("Official binary is missing from the verified archive.");
    if (process.platform !== "win32") chmodSync(binary, 0o700);
    const installed = path.join(homedir(), ".local", "bin", asset.binaryName);
    const reused = existsSync(installed) && readFileSync(installed).equals(readFileSync(binary));
    if (!reused) execFileSync(binary, ["install", "--skip-config", "-y"], { stdio: "inherit", windowsHide: true });
    if (!existsSync(installed) || !readFileSync(installed).equals(readFileSync(binary))) {
      throw new Error("Installed binary does not match the verified release.");
    }
    const version = execFileSync(installed, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
    if (!version.includes(CBM_VERSION)) throw new Error(`Installed version mismatch: ${version}`);
    console.log(JSON.stringify({ status: reused ? "verified-existing" : "installed", version: CBM_VERSION, binary: installed, archiveSha256: digest }));
  } finally {
    if (path.dirname(temporary) !== privateRoot) throw new Error("Invalid installer temporary path.");
    rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
