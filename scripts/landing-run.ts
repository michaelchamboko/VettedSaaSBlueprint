import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  advanceLandingRun,
  ensureAuthorizedExactUrl,
  loadOrCreateLandingRun,
  saveLandingRun,
  type LandingRunEvent,
  type LandingRunNextAction,
  type LandingRunStage,
  type LandingRunState,
} from "../src/lib/landing-automation/run";

const exemplarRoutes = new Map([
  [
    "https://try.elevenlabs.io/izj2b165mcsj",
    "elevenlabs-ai-voice-generator",
  ],
]);

type CommandIo = {
  write: (value: string) => void;
  now: () => string;
};

export type LandingRunCommandResultV1 = {
  schema_version: "LandingRunCommandResultV1";
  created: boolean;
  allowlist_added: boolean;
  run_id: string;
  page_slug: string;
  state: LandingRunState;
  stage: LandingRunStage;
  oracle_sync: "complete" | "pending" | "not_configured";
  next_action: LandingRunNextAction;
  run_file: string;
};

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function deriveSlug(exactUrl: string): string {
  const known = exemplarRoutes.get(exactUrl);
  if (known) return known;

  const hostnameParts = new URL(exactUrl).hostname
    .toLowerCase()
    .split(".")
    .filter(
      (part) =>
        part &&
        !["www", "try", "get", "go", "partners", "partner", "app"].includes(
          part,
        ),
    );
  const brand = hostnameParts[0] ?? "product";
  const safeBrand = brand.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safeBrand || "product"}-review`;
}

async function readEvent(
  eventFile: string,
  now: string,
): Promise<LandingRunEvent> {
  const parsed = JSON.parse(await readFile(path.resolve(eventFile), "utf8")) as {
    kind?: unknown;
    now?: unknown;
    [key: string]: unknown;
  };
  if (typeof parsed.kind !== "string") {
    throw new Error("The landing run event file requires a string kind.");
  }
  return { ...parsed, now } as LandingRunEvent;
}

export async function runLandingCommand(
  args: string[],
  io: CommandIo = {
    write: (value) => process.stdout.write(value),
    now: () => new Date().toISOString(),
  },
): Promise<LandingRunCommandResultV1> {
  const exactUrl = argumentValue(args, "--url");
  if (!exactUrl) {
    throw new Error(
      "Usage: npm run landing:run -- --url <exact-https-affiliate-url>",
    );
  }

  const repositoryRoot = path.resolve(
    argumentValue(args, "--repository-root") ?? process.cwd(),
  );
  const slug = argumentValue(args, "--slug") ?? deriveSlug(exactUrl);
  const authorization = await ensureAuthorizedExactUrl(repositoryRoot, exactUrl);
  const loaded = await loadOrCreateLandingRun({
    repositoryRoot,
    exactUrl,
    slug,
    now: io.now(),
    oracleConfigured: Boolean(
      process.env.ORACLE_CONNECT_STRING || process.env.ORACLE_WALLET_DIRECTORY,
    ),
  });

  let run = loaded.run;
  const eventFile = argumentValue(args, "--event-file");
  if (eventFile) {
    run = advanceLandingRun(run, await readEvent(eventFile, io.now()));
    await saveLandingRun(repositoryRoot, run);
  }

  const result: LandingRunCommandResultV1 = {
    schema_version: "LandingRunCommandResultV1",
    created: loaded.created,
    allowlist_added: authorization.added,
    run_id: run.run_id,
    page_slug: run.page_slug,
    state: run.state,
    stage: run.stage,
    oracle_sync: run.oracle_sync,
    next_action: run.next_action,
    run_file: loaded.run_file,
  };
  io.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/landing-run.ts")) {
  runLandingCommand(process.argv.slice(2)).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown landing run failure.";
    process.stderr.write(`landing:run failed: ${message}\n`);
    process.exitCode = 1;
  });
}
