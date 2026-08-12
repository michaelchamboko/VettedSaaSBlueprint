import { spawn } from "node:child_process";
import { extname, isAbsolute } from "node:path";

export type ExecutorExitCode = 65 | 75 | 78;

export class ExecutorError extends Error {
  readonly exitCode: ExecutorExitCode | undefined;
  readonly retryable: boolean;

  constructor(message: string, options: { exitCode?: ExecutorExitCode; retryable?: boolean } = {}) {
    super(message);
    this.name = "ExecutorError";
    this.exitCode = options.exitCode;
    this.retryable = options.retryable ?? false;
  }
}

export type ApprovedExecutorOptions = {
  timeoutMs: number;
  stdoutLimitBytes: number;
  stderrLimitBytes?: number;
  environment?: Record<string, string | undefined>;
};

export type ApprovedExecutorInvocation = {
  args: string[];
  command: string;
};

/**
 * Resolves one approved executable path without ever parsing a shell command.
 * Bundled ESM executors are scripts, so they must be launched by Node rather
 * than relying on deployment-specific execute bits or shebangs.
 */
export function resolveApprovedExecutorInvocation(commandPath: string): ApprovedExecutorInvocation {
  if (!isAbsolute(commandPath) || /[\r\n;&|`$]/.test(commandPath)) {
    throw new ExecutorError("Executor command must be an absolute path without shell syntax.", { exitCode: 78 });
  }
  if (extname(commandPath).toLowerCase() === ".mjs") {
    return { command: process.execPath, args: [commandPath] };
  }
  return { command: commandPath, args: [] };
}

export async function runApprovedExecutor<T>(
  commandPath: string,
  request: unknown,
  options: ApprovedExecutorOptions,
  parse: (value: unknown) => T,
): Promise<T> {
  const invocation = resolveApprovedExecutorInvocation(commandPath);
  const child = spawn(invocation.command, invocation.args, {
    shell: false,
    windowsHide: true,
    env: { NODE_ENV: process.env.NODE_ENV ?? "production", ...(options.environment ?? {}) },
    stdio: "pipe",
  });
  const stdout: Buffer[] = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stderrOverflow = false;
  let settled = false;

  const result = await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ExecutorError("Executor timed out.", { exitCode: 75, retryable: true }));
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > options.stdoutLimitBytes) {
        child.kill("SIGKILL");
        reject(new ExecutorError("Executor output exceeded the configured limit.", { exitCode: 65 }));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > (options.stderrLimitBytes ?? 64 * 1024)) stderrOverflow = true;
    });
    child.on("error", () => reject(new ExecutorError("Executor could not be started.", { exitCode: 78 })));
    child.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new ExecutorError(stderrOverflow ? "Executor failed with oversized diagnostics." : "Executor returned a non-zero exit code.", {
          exitCode: code === 75 ? 75 : code === 78 ? 78 : 65,
          retryable: code === 75,
        }));
        return;
      }
      const output = Buffer.concat(stdout).toString("utf8").trim();
      if (!output || output.includes("\n")) {
        reject(new ExecutorError("Executor must emit exactly one JSON object.", { exitCode: 65 }));
        return;
      }
      try {
        resolve(parse(JSON.parse(output)));
      } catch {
        reject(new ExecutorError("Executor emitted invalid contract JSON.", { exitCode: 65 }));
      }
    });

    child.stdin.end(`${JSON.stringify(request)}\n`, "utf8");
  });

  return result;
}
