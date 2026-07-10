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

export const landingStaticScanModes: readonly string[];
export function loadLandingStaticContext(): Record<string, unknown>;
export function buildLandingStaticReport(
  mode: string,
  context?: Record<string, unknown>,
): LandingStaticReport;
