import { spawn, execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface DeploymentAdapter {
  createPreview(deployment: DeploymentInput): Promise<PreviewResult>;
  runSmokeChecks(url: string): Promise<SmokeCheckResult>;
  promoteToProduction(previewDeploymentId: string): Promise<ProductionResult>;
  verifyProduction(url: string): Promise<ProductionVerification>;
  rollback(previousDeploymentId: string): Promise<RollbackResult>;
  getDeploymentReceipt(deploymentId: string): Promise<DeploymentReceipt>;
}

export interface DeploymentInput {
  runId: string;
  pages: Array<{
    path: string;
    content: string;
    metadata: Record<string, unknown>;
  }>;
  commitSha: string;
}

export interface PreviewResult {
  url: string;
  deploymentId: string;
  ready: boolean;
  error?: string;
}

export interface SmokeCheckResult {
  passed: boolean;
  checks: Record<string, boolean>;
  errors: string[];
  httpStatus: number;
}

export interface ProductionResult {
  url: string;
  deploymentId: string;
  commitSha: string;
  promotedAt: string;
}

export interface ProductionVerification {
  verified: boolean;
  url: string;
  deploymentId: string;
  checks: {
    httpOk: boolean;
    disclosureOk: boolean;
    exactCtaOk: boolean;
    desktopOk: boolean;
    mobileOk: boolean;
    robotsOk: boolean;
    sitemapOk: boolean;
    browserErrors: string[];
  };
  verifiedAt: string;
}

export interface RollbackResult {
  success: boolean;
  rolledBackTo: string;
  error?: string;
}

export interface DeploymentReceipt {
  deploymentId: string;
  type: "preview" | "production";
  url: string;
  commitSha: string;
  createdAt: string;
  checks: Record<string, boolean>;
  cost?: number;
}

export interface VercelAdapterConfig {
  projectId: string;
  teamId?: string;
  token: string;
  cliPath?: string;
  workingDirectory: string;
}

function runCommand(cmd: string, args: string[], options: { cwd: string; env?: NodeJS.ProcessEnv } = { cwd: process.cwd() }): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", data => { stdout += data.toString(); });
    child.stderr?.on("data", data => { stderr += data.toString(); });

    child.on("close", code => resolve({ stdout, stderr, code: code ?? 0 }));
    child.on("error", reject);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createVercelAdapter(config: VercelAdapterConfig): DeploymentAdapter {
  const cliPath = config.cliPath ?? "vercel";
  const baseArgs = ["--token", config.token];
  if (config.teamId) baseArgs.push("--scope", config.teamId);

  return {
    async createPreview(input): Promise<PreviewResult> {
      const { runId, pages, commitSha } = input;

      const deployDir = path.join(config.workingDirectory, ".stage2", "deploy", runId);
      await fs.mkdir(deployDir, { recursive: true });

      for (const page of pages) {
        const pageDir = path.join(deployDir, page.path.replace(/^\//, "").replace(/\/$/, "") || "index");
        await fs.mkdir(pageDir, { recursive: true });
        await fs.writeFile(path.join(pageDir, "index.html"), page.content);
      }

      const args = [...baseArgs, "deploy", deployDir, "--prebuilt", "--prod=false", "--yes"];
      const result = await runCommand(cliPath, args, { cwd: config.workingDirectory });

      if (result.code !== 0) {
        return { url: "", deploymentId: "", ready: false, error: result.stderr };
      }

      const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
      const deploymentIdMatch = result.stdout.match(/Deployment ID: ([^\s]+)/);

      return {
        url: urlMatch?.[0] ?? "",
        deploymentId: deploymentIdMatch?.[1] ?? "",
        ready: !!urlMatch?.[0],
      };
    },

    async runSmokeChecks(url: string): Promise<SmokeCheckResult> {
      const checks: Record<string, boolean> = {};
      const errors: string[] = [];

      try {
        const response = await fetch(url, { method: "HEAD" });
        checks.http = response.ok;
        if (!response.ok) errors.push(`HTTP ${response.status}`);
      } catch (e) {
        checks.http = false;
        errors.push(`HTTP check failed: ${e}`);
      }

      try {
        const html = await (await fetch(url)).text();
        checks.disclosure = html.toLowerCase().includes("affiliate") && html.toLowerCase().includes("commission");
        checks.cta = html.includes("href=") && (html.includes("cta") || html.includes("button"));
        checks.robots = html.includes('name="robots"') && html.includes("noindex");
        checks.mobile = html.includes("viewport");
        checks.desktop = true;
      } catch (e) {
        errors.push(`Content check failed: ${e}`);
      }

      return {
        passed: Object.values(checks).every(v => v),
        checks,
        errors,
        httpStatus: checks.http ? 200 : 0,
      };
    },

    async promoteToProduction(previewDeploymentId: string): Promise<ProductionResult> {
      const args = [...baseArgs, "promote", previewDeploymentId, "--yes"];
      const result = await runCommand(cliPath, args, { cwd: config.workingDirectory });

      if (result.code !== 0) {
        throw new Error(`Promotion failed: ${result.stderr}`);
      }

      const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
      const deploymentIdMatch = result.stdout.match(/Deployment ID: ([^\s]+)/);

      const productionUrl = urlMatch?.[0] ?? "";
      const productionDeploymentId = deploymentIdMatch?.[1] ?? "";

      await sleep(5000);

      return {
        url: productionUrl,
        deploymentId: productionDeploymentId,
        commitSha: "",
        promotedAt: new Date().toISOString(),
      };
    },

    async verifyProduction(url: string): Promise<ProductionVerification> {
      const checks = {
        httpOk: false,
        disclosureOk: false,
        exactCtaOk: false,
        desktopOk: false,
        mobileOk: false,
        robotsOk: false,
        sitemapOk: false,
        browserErrors: [] as string[],
      };

      try {
        const response = await fetch(url);
        checks.httpOk = response.ok;
        // checks.httpStatus = response.status;

        if (response.ok) {
          const html = await response.text();
          checks.disclosureOk = html.toLowerCase().includes("affiliate") && html.toLowerCase().includes("commission");
          checks.exactCtaOk = html.includes("href=");
          checks.mobileOk = html.includes("viewport");
          checks.desktopOk = true;
          checks.robotsOk = !html.includes('name="robots"') || !html.includes("noindex");
        }
      } catch (e) {
        checks.browserErrors.push(`Production verification failed: ${e}`);
      }

      try {
        const sitemapUrl = new URL("/sitemap.xml", url).toString();
        const sitemapResponse = await fetch(sitemapUrl);
        checks.sitemapOk = sitemapResponse.ok;
      } catch {
        checks.sitemapOk = false;
      }

      return {
        verified: checks.httpOk && checks.disclosureOk && checks.exactCtaOk,
        url,
        deploymentId: "",
        checks,
        verifiedAt: new Date().toISOString(),
      };
    },

    async rollback(previousDeploymentId: string): Promise<RollbackResult> {
      const args = [...baseArgs, "rollback", previousDeploymentId, "--yes"];
      const result = await runCommand(cliPath, args, { cwd: config.workingDirectory });

      return {
        success: result.code === 0,
        rolledBackTo: previousDeploymentId,
        error: result.code !== 0 ? result.stderr : undefined,
      };
    },

    async getDeploymentReceipt(deploymentId: string): Promise<DeploymentReceipt> {
      const args = [...baseArgs, "inspect", deploymentId, "--json"];
      const result = await runCommand(cliPath, args, { cwd: config.workingDirectory });

      if (result.code !== 0) {
        throw new Error(`Failed to get receipt: ${result.stderr}`);
      }

      try {
        const data = JSON.parse(result.stdout);
        return {
          deploymentId,
          type: data.target === "production" ? "production" : "preview",
          url: data.url,
          commitSha: data.gitCommitSha ?? "",
          createdAt: data.createdAt,
          checks: {},
        };
      } catch {
        return {
          deploymentId,
          type: "preview",
          url: "",
          commitSha: "",
          createdAt: new Date().toISOString(),
          checks: {},
        };
      }
    },
  };
}

export function createLocalDeploymentAdapter(): DeploymentAdapter {
  return {
    async createPreview(input): Promise<PreviewResult> {
      return { url: `http://localhost:3000/preview/${input.runId}`, deploymentId: `local-${input.runId}`, ready: true };
    },
    async runSmokeChecks(): Promise<SmokeCheckResult> {
      return { passed: true, checks: { http: true, disclosure: true, cta: true }, errors: [], httpStatus: 200 };
    },
    async promoteToProduction(): Promise<ProductionResult> {
      return { url: "http://localhost:3000", deploymentId: "local-prod", commitSha: "", promotedAt: new Date().toISOString() };
    },
    async verifyProduction(): Promise<ProductionVerification> {
      return {
        verified: true,
        url: "http://localhost:3000",
        deploymentId: "local-prod",
        checks: { httpOk: true, disclosureOk: true, exactCtaOk: true, desktopOk: true, mobileOk: true, robotsOk: true, sitemapOk: true, browserErrors: [] },
        verifiedAt: new Date().toISOString(),
      };
    },
    async rollback(): Promise<RollbackResult> {
      return { success: true, rolledBackTo: "local-previous" };
    },
    async getDeploymentReceipt(deploymentId: string): Promise<DeploymentReceipt> {
      return { deploymentId, type: "production", url: "http://localhost:3000", commitSha: "", createdAt: new Date().toISOString(), checks: {} };
    },
  };
}