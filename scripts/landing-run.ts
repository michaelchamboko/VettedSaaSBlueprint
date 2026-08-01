import { dispatchLandingResearch } from "./landing-research-prep";

export type LandingRunCommandResultV2 = {
  schema_version: "LandingRunCommandResultV2";
  created: boolean;
  job_id: string;
  exact_url: string;
  url_fingerprint: string;
  manifest_digest: string;
  source_commit_sha: string;
  state: string;
  current_stage_id: string | null;
  next_action: "run_hermes_product_identity" | "run_hermes_research" | "research_complete";
};

type CommandIo = { write: (value: string) => void };

export async function runLandingCommand(
  args: string[] = process.argv.slice(2),
  io: CommandIo = { write: (value) => process.stdout.write(value) },
): Promise<LandingRunCommandResultV2> {
  if (args.includes("--event-file")) {
    throw new Error("Local event files cannot advance Neon workflow state.");
  }
  const dispatch = await dispatchLandingResearch(args);
  const next_action = dispatch.current_stage_id === "product_identity"
    ? "run_hermes_product_identity"
    : dispatch.current_stage_id === "research"
      ? "run_hermes_research"
      : "research_complete";
  const result: LandingRunCommandResultV2 = {
    schema_version: "LandingRunCommandResultV2",
    created: dispatch.created,
    job_id: dispatch.job_id,
    exact_url: dispatch.exact_url,
    url_fingerprint: dispatch.url_fingerprint,
    manifest_digest: dispatch.manifest_digest,
    source_commit_sha: dispatch.source_commit_sha,
    state: dispatch.state,
    current_stage_id: dispatch.current_stage_id,
    next_action,
  };
  io.write(`${JSON.stringify(result)}\n`);
  return result;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/landing-run.ts")) {
  runLandingCommand().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown landing run failure.";
    process.stderr.write(`landing:run blocked: ${message}\n`);
    process.exitCode = 1;
  });
}
