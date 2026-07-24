export type LandingQualityMode = "draft" | "production";

export type LandingQualityScanner = {
  scan: string;
  script: string;
  kind?: "static" | "specialist";
  nodeArgs?: string[];
};

export type LandingQualityCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type LandingQualityResult = {
  status: "pass" | "fail";
  scannerFailures: Array<LandingQualityScanner & { failed: boolean }>;
  gate: {
    exit_code: number;
    stdout: string;
    stderr: string;
    duration_ms: number;
  };
};

export const landingQualityScanners: Array<LandingQualityScanner & {
  kind: "static" | "specialist";
}>;

export function stage2GateArgs(context: {
  scannerReportDir: string;
  mode: LandingQualityMode;
  summaryFile: string;
  scope: Record<string, unknown>;
  ciParallelCore?: boolean;
}): string[];

export function runLandingQuality(options?: {
  mode?: LandingQualityMode;
  batchId?: string;
  batchRoot?: string;
  expectedGitCommitSha?: string;
  ciParallelCore?: boolean;
  reportDir?: string;
  scanners?: LandingQualityScanner[];
  runScanner?: (scanner: LandingQualityScanner) => Promise<LandingQualityCommandResult>;
  runSpecialistProcess?: (command: string, args: string[]) => Promise<LandingQualityCommandResult>;
  runStage2Gate?: (context: {
    scannerReportDir: string;
    mode: LandingQualityMode;
    summaryFile: string;
    scope: Record<string, unknown>;
    ciParallelCore?: boolean;
  }) => Promise<LandingQualityCommandResult>;
  loadStaticContext?: (options?: Record<string, unknown>) => unknown;
  loadDraftBatchScope?: (options: {
    batchId: string;
    batchRoot?: string;
    expectedGitCommitSha?: string;
  }) => Promise<{
    batchId: string;
    targetDir: string;
    draftFiles: string[];
    candidateCount: number;
  }>;
}): Promise<LandingQualityResult>;
