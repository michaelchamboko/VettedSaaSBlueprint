export type LandingStaticIssue = {
  code: string;
  message: string;
  file: string | null;
  severity: string;
};

export type LandingStaticReport = {
  status: "pass" | "fail" | "error";
  issues: LandingStaticIssue[];
  warnings: LandingStaticIssue[];
  [key: string]: unknown;
};

export type LandingStaticContext = {
  inputMode?: "draft" | "production";
  targetDir?: string;
  rows: unknown[];
  editorialRows?: unknown[];
  manifest: Record<string, unknown>;
  routeSource: string;
  componentSource: string;
  editorialComponentSource: string;
  stylesSource: string;
  generatedSource: string;
};

export type LoadedLandingStaticContext = LandingStaticContext & {
  editorialRows: unknown[];
};

export const landingStaticScanModes: readonly string[];
export function loadLandingStaticContext(options?: {
  inputMode?: "draft" | "production";
  /** Uses this catalogue root for production scans and this draft root for draft scans. */
  targetDir?: string;
  draftFiles?: string[];
}): LoadedLandingStaticContext;
export function buildLandingStaticReport(
  mode: string,
  context?: LandingStaticContext,
): LandingStaticReport;
