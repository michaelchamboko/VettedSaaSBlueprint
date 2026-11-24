import { randomUUID } from "node:crypto";

import {
  canTransitionAutomationRun,
  nextAutomationState,
  type AutomationEvent,
  type LandingAutomationState,
} from "@/lib/landing-automation/state-machine";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type SqlRow = Record<string, unknown>;

export interface SqlExecutor {
  execute(sql: string, binds?: unknown[]): Promise<SqlRow[]>;
}

export type ReconciliationRunSnapshot = {
  automationRunId: string;
  runType: "manifest_reconciliation";
  status: "queued" | "running" | "blocked" | "succeeded" | "failed" | "cancelled";
  allowlistSourceCommitSha: string;
  manifestDigest: string;
  requestedEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>;
};

export type PageRunSnapshot = {
  automationRunId: string;
  runType: "page_publication";
  parentRunId: string;
  state: LandingAutomationState;
  allowlistSourceCommitSha: string;
  manifestDigest: string;
  wave: "exemplar" | "calibration" | "steady_state" | null;
  allowlistEntryId: string;
};

export type LandingAutomationRunSnapshot = ReconciliationRunSnapshot | PageRunSnapshot;

export type ReleaseRequestPayload = {
  authorization:
    | { mode: "allowlist_unattended"; parentRunId: string }
    | { mode: "manual_owner"; publicationAuditId: string };
  wave: "exemplar" | "calibration" | "steady_state" | "manual_exception";
  waveSequence: number;
  authoringHeadSha: string;
  authoringMergeSha: string;
  authoringArtifactDigest: string;
  items: Array<{
    pageRunId: string | null;
    pageVersionId: string;
    gateReceiptId: string;
    blueprintId: string;
  }>;
};

export type LandingAutomationRepository = {
  reconcileAllowlist(input: {
    allowlistSourceCommitSha: string;
    manifestDigest: string;
    entries: Array<{ exactUrl: string; urlSha256: string }>;
    allowBulkRevocation: boolean;
  }): Promise<{ activeEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>; revokedEntryIds: string[] }>;
  createReconciliationRun(input: {
    allowlistSourceCommitSha: string;
    manifestDigest: string;
    requestedEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>;
  }): Promise<{ automationRunId: string; created: boolean }>;
  createPageRun(input: {
    parentRunId: string;
    allowlistEntryId: string;
    wave: "exemplar" | "calibration" | "steady_state";
    waveSequence: number;
  }): Promise<{ automationRunId: string; created: boolean }>;
  listPageRuns(parentRunId: string): Promise<PageRunSnapshot[]>;
  appendEvent(
    runId: string,
    event: AutomationEvent,
    payload?: Record<string, unknown>,
  ): Promise<{ state: LandingAutomationState }>;
  recordGateReceipt(input: {
    runId: string;
    blueprintId: string;
    batchId: string;
    authoringHeadSha: string;
    inputDigest: string;
    status: "pass" | "blocked" | "fail";
    receipt: Record<string, unknown>;
  }): Promise<{ gateReceiptId: string }>;
  createReleaseRequest(input: ReleaseRequestPayload): Promise<{ releaseRequestId: string; created: boolean }>;
  getRunSnapshot(runId: string): Promise<LandingAutomationRunSnapshot | null>;
};

type LandingAutomationRunType = "manifest_reconciliation" | "page_publication";

type StoredAllowlistEntry = {
  allowlistEntryId: string;
  exactUrl: string;
  urlSha256: string;
  status: "active" | "revoked_noindex" | "archived";
  noindexAt?: string;
  archiveAfterAt?: string;
  allowlistSourceCommitSha: string;
  manifestDigest: string;
};

type BaseRunRecord = {
  runType: LandingAutomationRunType;
  automationRunId: string;
  machineState: LandingAutomationState;
};

type ReconciliationRunRecord = BaseRunRecord & {
  runType: "manifest_reconciliation";
  allowlistSourceCommitSha: string;
  manifestDigest: string;
  requestedEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>;
};

type PageRunRecord = BaseRunRecord & {
  runType: "page_publication";
  parentRunId: string;
  wave: "exemplar" | "calibration" | "steady_state";
  waveSequence: number;
  allowlistEntryId: string;
};

type StoredRun = ReconciliationRunRecord | PageRunRecord;

type GateReceiptRecord = {
  gateReceiptId: string;
  runId: string;
  blueprintId: string;
  batchId: string;
  authoringHeadSha: string;
  inputDigest: string;
  status: "pass" | "blocked" | "fail";
  receipt: Record<string, unknown>;
};

type ReleaseRequestRecord = { releaseRequestId: string } & ReleaseRequestPayload;

function formatDate(date: Date): string {
  return date.toISOString();
}

function runStatusFromState(state: LandingAutomationState): ReconciliationRunSnapshot["status"] {
  switch (state) {
    case "queued":
      return "queued";
    case "blocked":
      return "blocked";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "published":
      return "succeeded";
    default:
      return "running";
  }
}

function canonicalEntries(
  entries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>,
) {
  const dedupe = new Map<string, { allowlistEntryId: string; exactUrl: string; urlSha256: string }>();

  for (const entry of entries) {
    dedupe.set(entry.allowlistEntryId, entry);
  }

  return [...dedupe.values()].sort((a, b) => a.allowlistEntryId.localeCompare(b.allowlistEntryId));
}

function makeReconciliationSignature(payload: {
  allowlistSourceCommitSha: string;
  manifestDigest: string;
  requestedEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>;
}) {
  const sorted = canonicalEntries(payload.requestedEntries).map((entry) => `${entry.allowlistEntryId}:${entry.urlSha256}`).join("|");
  return `${payload.allowlistSourceCommitSha}:${payload.manifestDigest}:${sorted}`;
}

export function createLandingAutomationRepository(
  adapter: SqlExecutor = { execute: async () => [] },
): LandingAutomationRepository {
  const allowlistByUrlSha = new Map<string, StoredAllowlistEntry>();
  const allowlistByEntryId = new Map<string, StoredAllowlistEntry>();
  const runsById = new Map<string, StoredRun>();
  const reconciliationRunSignatures = new Map<string, string>();
  const pageRunByParentAndEntry = new Map<string, string>();
  const gateReceiptBySignature = new Map<string, GateReceiptRecord>();
  const gateReceiptById = new Map<string, GateReceiptRecord>();
  const releaseRequestByIdentity = new Map<string, string>();

  const execute = async (sql: string, binds: unknown[] = []) => {
    return adapter.execute(sql, binds);
  };

  const reconcileAllowlist = async (input: {
    allowlistSourceCommitSha: string;
    manifestDigest: string;
    entries: Array<{ exactUrl: string; urlSha256: string }>;
    allowBulkRevocation: boolean;
  }) => {
    const requestedEntriesBySha = new Map(input.entries.map((entry) => [entry.urlSha256, entry] as const));
    const now = new Date();
    const nowIso = formatDate(now);
    const archiveAfterIso = formatDate(new Date(now.getTime() + SEVEN_DAYS_MS));

    const activeEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }> = [];

    for (const entry of input.entries) {
      const existing = allowlistByUrlSha.get(entry.urlSha256);

      if (existing) {
        existing.exactUrl = entry.exactUrl;
        existing.status = "active";
        existing.noindexAt = undefined;
        existing.archiveAfterAt = undefined;
        existing.allowlistSourceCommitSha = input.allowlistSourceCommitSha;
        existing.manifestDigest = input.manifestDigest;
        activeEntries.push({
          allowlistEntryId: existing.allowlistEntryId,
          exactUrl: entry.exactUrl,
          urlSha256: entry.urlSha256,
        });

        await execute(
          `UPDATE landing_allowlist_entries
             SET exact_url = :bind1, status = 'active', manifest_digest = :bind2,
                 noindex_at = NULL, archive_after_at = NULL
           WHERE url_sha256 = :bind3`,
          [entry.exactUrl, input.manifestDigest, entry.urlSha256],
        );

        continue;
      }

      const allowlistEntryId = randomUUID();
      const storedEntry: StoredAllowlistEntry = {
        allowlistEntryId,
        exactUrl: entry.exactUrl,
        urlSha256: entry.urlSha256,
        status: "active",
        allowlistSourceCommitSha: input.allowlistSourceCommitSha,
        manifestDigest: input.manifestDigest,
      };

      allowlistByUrlSha.set(entry.urlSha256, storedEntry);
      allowlistByEntryId.set(allowlistEntryId, storedEntry);
      activeEntries.push(storedEntry);

      await execute(
        `INSERT INTO landing_allowlist_entries
             (allowlist_entry_id, exact_url, url_sha256, source_commit_sha, manifest_digest, status)
         VALUES (:bind1, :bind2, :bind3, :bind4, :bind5, 'active')`,
        [
          allowlistEntryId,
          entry.exactUrl,
          entry.urlSha256,
          input.allowlistSourceCommitSha,
          input.manifestDigest,
        ],
      );
    }

    const activeBySha = [...allowlistByUrlSha.values()].filter((entry) => entry.status === "active");
    const removals = activeBySha.filter((entry) => !requestedEntriesBySha.has(entry.urlSha256));
    if (removals.length > 0 && !input.allowBulkRevocation && activeBySha.length > 0) {
      const removalRatio = removals.length / activeBySha.length;
      if (removals.length >= 2 && removalRatio > 0.25) {
        throw new Error("Bulk allowlist revocation requires explicit approval flag.");
      }
    }

    const revokedEntryIds: string[] = [];
    for (const entry of removals) {
      entry.status = "revoked_noindex";
      entry.noindexAt = nowIso;
      entry.archiveAfterAt = archiveAfterIso;
      revokedEntryIds.push(entry.allowlistEntryId);

      await execute(
        `UPDATE landing_allowlist_entries
             SET status = 'revoked_noindex', noindex_at = :bind1, archive_after_at = :bind2
           WHERE allowlist_entry_id = :bind3`,
        [nowIso, archiveAfterIso, entry.allowlistEntryId],
      );
    }

    return { activeEntries, revokedEntryIds };
  };

  const createReconciliationRun = async (input: {
    allowlistSourceCommitSha: string;
    manifestDigest: string;
    requestedEntries: Array<{ allowlistEntryId: string; exactUrl: string; urlSha256: string }>;
  }) => {
    const signature = makeReconciliationSignature(input);
    const existingRunId = reconciliationRunSignatures.get(signature);
    if (existingRunId) {
      return { automationRunId: existingRunId, created: false };
    }

    const automationRunId = randomUUID();
    const requestedEntries = canonicalEntries(input.requestedEntries);
    const record: ReconciliationRunRecord = {
      runType: "manifest_reconciliation",
      automationRunId,
      allowlistSourceCommitSha: input.allowlistSourceCommitSha,
      manifestDigest: input.manifestDigest,
      requestedEntries,
      machineState: "queued",
    };

    runsById.set(automationRunId, record);
    reconciliationRunSignatures.set(signature, automationRunId);

    await execute(
      `INSERT INTO landing_automation_runs
           (automation_run_id, run_type, allowlist_source_commit_sha, manifest_digest, status)
       VALUES (:bind1, 'manifest_reconciliation', :bind2, :bind3, 'queued')`,
      [automationRunId, input.allowlistSourceCommitSha, input.manifestDigest],
    );

    return { automationRunId, created: true };
  };

  const createPageRun = async (input: {
    parentRunId: string;
    allowlistEntryId: string;
    wave: "exemplar" | "calibration" | "steady_state";
    waveSequence: number;
  }) => {
    const parentRun = runsById.get(input.parentRunId);
    if (!parentRun || parentRun.runType !== "manifest_reconciliation") {
      throw new Error("Parent run not found.");
    }

    const key = `${input.parentRunId}:${input.allowlistEntryId}`;
    const existingRunId = pageRunByParentAndEntry.get(key);
    if (existingRunId) {
      return { automationRunId: existingRunId, created: false };
    }

    const allowlistEntry = allowlistByEntryId.get(input.allowlistEntryId);
    if (!allowlistEntry || allowlistEntry.status !== "active") {
      throw new Error("Allowlist entry not active.");
    }

    const automationRunId = randomUUID();
    const record: PageRunRecord = {
      runType: "page_publication",
      automationRunId,
      parentRunId: input.parentRunId,
      wave: input.wave,
      waveSequence: input.waveSequence,
      allowlistEntryId: input.allowlistEntryId,
      machineState: "queued",
    };

    runsById.set(automationRunId, record);
    pageRunByParentAndEntry.set(key, automationRunId);

    await execute(
      `INSERT INTO landing_automation_runs
           (automation_run_id, run_type, status, parent_automation_run_id, allowlist_entry_id, wave_type, wave_sequence)
       VALUES (:bind1, 'page_publication', 'queued', :bind2, :bind3, :bind4, :bind5)`,
      [
        automationRunId,
        input.parentRunId,
        input.allowlistEntryId,
        input.wave,
        input.waveSequence,
      ],
    );

    return { automationRunId, created: true };
  };

  const listPageRuns = async (parentRunId: string): Promise<PageRunSnapshot[]> => {
    const parentRun = runsById.get(parentRunId);
    if (!parentRun || parentRun.runType !== "manifest_reconciliation") {
      return [];
    }

    const children = [...runsById.values()]
      .filter((run): run is PageRunRecord =>
        run.runType === "page_publication" && run.parentRunId === parentRunId,
      )
      .sort((left, right) => {
        if (left.waveSequence !== right.waveSequence) {
          return left.waveSequence - right.waveSequence;
        }
        return left.automationRunId.localeCompare(right.automationRunId);
      });

    return children.map((run) => ({
      automationRunId: run.automationRunId,
      runType: "page_publication",
      parentRunId: run.parentRunId,
      state: run.machineState,
      allowlistSourceCommitSha: parentRun.allowlistSourceCommitSha,
      manifestDigest: parentRun.manifestDigest,
      wave: run.wave,
      allowlistEntryId: run.allowlistEntryId,
    }));
  };

  const appendEvent = async (
    runId: string,
    event: AutomationEvent,
    payload: Record<string, unknown> = {},
  ): Promise<{ state: LandingAutomationState }> => {
    const run = runsById.get(runId);
    if (!run) {
      throw new Error("Unknown automation run.");
    }

    const nextState = nextAutomationState(run.machineState, event);
    if (!canTransitionAutomationRun(run.machineState, nextState)) {
      throw new Error(`Invalid automation transition: ${run.machineState} --${event.kind}--> ${nextState}.`);
    }

    run.machineState = nextState;

    await execute(
      `INSERT INTO landing_automation_events
           (automation_event_id, automation_run_id, event_type, payload_json)
       VALUES (:bind1, :bind2, :bind3, :bind4)`,
      [randomUUID(), runId, event.kind, JSON.stringify(payload)],
    );

    await execute(
      `UPDATE landing_automation_runs
           SET status = :bind1
         WHERE automation_run_id = :bind2`,
      [runStatusFromState(run.machineState), runId],
    );

    return { state: run.machineState };
  };

  const recordGateReceipt = async (input: {
    runId: string;
    blueprintId: string;
    batchId: string;
    authoringHeadSha: string;
    inputDigest: string;
    status: "pass" | "blocked" | "fail";
    receipt: Record<string, unknown>;
  }) => {
    const run = runsById.get(input.runId);
    if (!run || run.runType !== "page_publication") {
      throw new Error("Page run not found.");
    }

    const key = `${input.runId}:${input.blueprintId}:${input.batchId}:${input.inputDigest}`;
    const existing = gateReceiptBySignature.get(key);
    if (existing) {
      if (
        existing.status !== input.status ||
        existing.authoringHeadSha !== input.authoringHeadSha ||
        JSON.stringify(existing.receipt) !== JSON.stringify(input.receipt)
      ) {
        throw new Error(
          "Gate receipt is immutable by run_id, blueprint_id, batch_id, and input_digest.",
        );
      }

      return { gateReceiptId: existing.gateReceiptId };
    }

    const gateReceiptId = randomUUID();
    const record: GateReceiptRecord = {
      gateReceiptId,
      runId: input.runId,
      blueprintId: input.blueprintId,
      batchId: input.batchId,
      authoringHeadSha: input.authoringHeadSha,
      inputDigest: input.inputDigest,
      status: input.status,
      receipt: input.receipt,
    };

    gateReceiptBySignature.set(key, record);

    gateReceiptById.set(gateReceiptId, record);

    await execute(
      `INSERT INTO landing_gate_receipts
           (gate_receipt_id, automation_run_id, page_blueprint_id, authoring_head_sha, batch_id, input_digest, receipt_json, status)
       VALUES (:bind1, :bind2, :bind3, :bind4, :bind5, :bind6, :bind7, :bind8)`,
      [
        gateReceiptId,
        input.runId,
        input.blueprintId,
        input.authoringHeadSha,
        input.batchId,
        input.inputDigest,
        JSON.stringify(input.receipt),
        input.status,
      ],
    );

    return { gateReceiptId };
  };

  const createReleaseRequest = async (input: ReleaseRequestPayload) => {
    const authorizationId =
      input.authorization.mode === "allowlist_unattended"
        ? input.authorization.parentRunId
        : input.authorization.publicationAuditId;
    const identity = `${input.authorization.mode}:${authorizationId}:${input.wave}:${input.waveSequence}`;

    const existingReleaseRequestId = releaseRequestByIdentity.get(identity);
    if (existingReleaseRequestId) {
      return { releaseRequestId: existingReleaseRequestId, created: false };
    }

    const releaseRequestId = randomUUID();
    const record: ReleaseRequestRecord = {
      releaseRequestId,
      authorization: input.authorization,
      wave: input.wave,
      waveSequence: input.waveSequence,
      authoringHeadSha: input.authoringHeadSha,
      authoringMergeSha: input.authoringMergeSha,
      authoringArtifactDigest: input.authoringArtifactDigest,
      items: [...input.items],
    };

    releaseRequestByIdentity.set(identity, releaseRequestId);

    await execute(
      `INSERT INTO landing_release_requests
           (release_request_id, status, wave_type, wave_sequence, authoring_head_sha, authoring_merge_sha, authoring_artifact_digest)
       VALUES (:bind1, 'requested', :bind2, :bind3, :bind4, :bind5, :bind6)`,
      [
        releaseRequestId,
        input.wave,
        input.waveSequence,
        input.authoringHeadSha,
        input.authoringMergeSha,
        input.authoringArtifactDigest,
      ],
    );

    for (const item of input.items) {
      await execute(
        `INSERT INTO landing_release_request_items
             (release_request_id, page_automation_run_id, page_version_id, gate_receipt_id, page_blueprint_id)
         VALUES (:bind1, :bind2, :bind3, :bind4, :bind5)`,
        [
          releaseRequestId,
          item.pageRunId,
          item.pageVersionId,
          item.gateReceiptId,
          item.blueprintId,
        ],
      );
    }

    return { releaseRequestId, created: true };
  };

  const getRunSnapshot = async (
    runId: string,
  ): Promise<LandingAutomationRunSnapshot | null> => {
    const run = runsById.get(runId);
    if (!run) {
      return null;
    }

    if (run.runType === "manifest_reconciliation") {
      return {
        automationRunId: run.automationRunId,
        runType: "manifest_reconciliation",
        status: runStatusFromState(run.machineState),
        allowlistSourceCommitSha: run.allowlistSourceCommitSha,
        manifestDigest: run.manifestDigest,
        requestedEntries: run.requestedEntries,
      };
    }

    const parentRun = runsById.get(run.parentRunId);
    if (!parentRun || parentRun.runType !== "manifest_reconciliation") {
      return null;
    }

    return {
      automationRunId: run.automationRunId,
      runType: "page_publication",
      parentRunId: run.parentRunId,
      state: run.machineState,
      allowlistSourceCommitSha: parentRun.allowlistSourceCommitSha,
      manifestDigest: parentRun.manifestDigest,
      wave: run.wave,
      allowlistEntryId: run.allowlistEntryId,
    };
  };

  return {
    reconcileAllowlist,
    createReconciliationRun,
    createPageRun,
    listPageRuns,
    appendEvent,
    recordGateReceipt,
    createReleaseRequest,
    getRunSnapshot,
  };
}
