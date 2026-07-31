import { parseApprovedUrls } from "./approved-urls";

const REQUIRED_CONFIGURATION = [
  "LANDING_CONTROL_DATABASE_URL",
  "LANDING_ORACLE_WORKER_DATABASE_URL",
  "HERMES_PRODUCT_IDENTITY_COMMAND",
  "HERMES_LANDING_RESEARCH_COMMAND",
] as const;

type RequiredConfigurationName = (typeof REQUIRED_CONFIGURATION)[number];

export type LandingResearchPreflightResult = {
  blockers: string[];
  configuration: Array<{
    configured: boolean;
    name: RequiredConfigurationName;
  }>;
  manifestDigest: string;
  status: "blocked" | "ready";
  urlCount: number;
};

/**
 * Checks only whether the research-prep authorities are configured. Values are
 * deliberately discarded so diagnostics cannot expose credentials or command
 * paths.
 */
export function inspectLandingResearchPreflight(
  approvedUrlsMarkdown: string,
  environment: Readonly<Record<string, string | undefined>>,
): LandingResearchPreflightResult {
  const manifest = parseApprovedUrls(approvedUrlsMarkdown);
  const configuration = REQUIRED_CONFIGURATION.map((name) => ({
    configured: Boolean(environment[name]?.trim()),
    name,
  }));
  const blockers: string[] = [];

  if (manifest.entries.length === 0) {
    blockers.push("approved-urls.md contains no authorized URLs.");
  }

  for (const item of configuration) {
    if (!item.configured) blockers.push(`${item.name} is missing.`);
  }

  return {
    blockers,
    configuration,
    manifestDigest: manifest.digest,
    status: blockers.length === 0 ? "ready" : "blocked",
    urlCount: manifest.entries.length,
  };
}
