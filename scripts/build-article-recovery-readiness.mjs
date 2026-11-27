import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const baselineRevision = "bebb4fe644b3d97e9a21f46a6e06938ed35684cb";
const baselineTraceabilityPath = "docs/designs/recovery-evidence/123/historical/traceability-109.json";
const findingInventoryPath = "docs/designs/recovery-evidence/123/historical/webcatalog-finding-traceability-108.md";
const baselineTraceabilityBlob = "4f970bdb1b227d415b8be8cb3782d85c54914dfa";
const findingInventoryBlob = "c8b8a3d69b5496a685e3c8c49f256e6a293e2a5d";
const testedProductRevision = "29bf7f229849bce0029a07807ce140dc07ccf033";
const testedProductTree = "c175f3afd8c707c85e9db2efc65a23dcac5b4077";

const sourceLegend = {
  Hero: ["Vetted SaaS Blueprint - Design System and Experience Standards", "9.1 Hero as a complete pitch", "D04-S-039819730d12"],
  Restraint: ["Vetted SaaS Blueprint - Design System and Experience Standards", "9.4 White space and restraint", "D04-S-3f0f90c64b2f"],
  "Point-of-doubt": ["Vetted SaaS Blueprint - Design System and Experience Standards", "9.6 Proof at the point of doubt", "D04-S-76c9675d41ba"],
  "Visual priority": ["Vetted SaaS Blueprint - Design System and Experience Standards", "17.2 Priority order", "D04-S-12b1f74d0e51"],
  Writing: ["Vetted SaaS Blueprint - Design System and Experience Standards", "21.2 Required writing qualities", "D04-S-7ddc1a780270"],
  Translation: ["Vetted SaaS Blueprint - Design System and Experience Standards", "21.3 Customer-first translation", "D04-S-d9110ce256e1"],
  "CTA language": ["Vetted SaaS Blueprint - Design System and Experience Standards", "21.4 CTA language", "D04-S-1497bdd3519d"],
  "Evidence checks": ["Vetted SaaS Blueprint - Design System and Experience Standards", "27.4 Evidence checks", "D04-S-433fa6bc3810"],
  "CTA checks": ["Vetted SaaS Blueprint - Design System and Experience Standards", "27.5 CTA checks", "D04-S-41ae60fc2d84"],
  "Motion checks": ["Vetted SaaS Blueprint - Design System and Experience Standards", "27.6 Motion checks", "D04-S-31e587200603"],
  "Type checks": ["Vetted SaaS Blueprint - Design System and Experience Standards", "27.7 Typography and colour checks", "D04-S-d6d7612a593e"],
  "Mobile checks": ["Vetted SaaS Blueprint - Design System and Experience Standards", "27.8 Mobile checks", "D04-S-2da91aade9ee"],
  Ending: ["Vetted SaaS Blueprint - Design System and Experience Standards", "7.5 Deterministic rule", "D04-S-1ebfc692b28b"],
  Accessibility: ["Vetted SaaS Blueprint - Design System and Experience Standards", "24 Responsive and Accessibility Standards", "D04-S-62f9ae869475"],
  "Public page": ["Vetted SaaS Blueprint - Master Product Requirements Document", "26.2 Public Page Requirements", "D05-S-5151b43d272f"],
  Editorial: ["Vetted SaaS Blueprint - Long-Form Affiliate Content Strategy", "32 Editorial Quality Standard", "D07-S-761a1d533ac1"],
  "Content QA": ["Vetted SaaS Blueprint - Quality Assurance, Governance and Release Standard", "9.4 Content and editorial quality", "D10-S-574481d73201"],
  "Design QA": ["Vetted SaaS Blueprint - Quality Assurance, Governance and Release Standard", "9.5 Design-system and art-direction conformance", "D10-S-baefe5610843"],
  "Motion QA": ["Vetted SaaS Blueprint - Quality Assurance, Governance and Release Standard", "9.6 Motion and interaction", "D10-S-61fa8542796b"],
  "Visual QA": ["Vetted SaaS Blueprint - Quality Assurance, Governance and Release Standard", "9.7 Graphics, imagery, and visual evidence", "D10-S-24845d227219"],
  "A11y QA": ["Vetted SaaS Blueprint - Quality Assurance, Governance and Release Standard", "9.9 Accessibility", "D10-S-c0d3d9bdb705"],
};

const testingPurposes = {
  1: ["Drive a synthetic article through interruption, reload and normal-entry resume while preserving identity, evidence, retry counts and external-call boundaries.", "synthetic article controller and isolated adapters"],
  2: ["Keep a rejected finding open across omission, unchanged resubmission, relevant change, unrelated change and late superseded output until independent resolution.", "synthetic editorial and presentation review activities"],
  3: ["Interrupt cleanup at each mutation boundary and prove readable protected evidence, stable identity, bounded retries and verified handoff.", "synthetic gate-cleanup files"],
  4: ["Lose a synthetic deployment response or local save and observe reconciliation, call count, rollback evidence and remaining verification.", "synthetic release adapter"],
  5: ["Blindly judge three defective/adequate pairs for CTA destination, account-context rewrite and keyboard scrolling, with six accurate attributable explanations.", "three specified blinded reviewer pairs"],
  6: ["Map all 38 findings to authority, owner, existing coverage, reviewer evidence and historical-causation confidence.", "WebCatalog inventory and comparable article criteria"],
  7: ["Exercise activity restart, cumulative repair diagnosis, stale receipts, missing observations, measurement changes, resolution classes and shared-failure shutdown.", "synthetic editorial and presentation activity controller"],
  8: ["Vary registered evidence relevance, support, integrity and freshness, then resolve retained research, judgment, resolution, observation and production references.", "isolated article evidence store"],
  9: ["Exercise catalogue and import approval with one synthetic article while varying content, renderer, styles, assets and rules against an unaffected control.", "synthetic public catalogue and import approval paths"],
  10: ["Enumerate and exercise gate handoff, retention, immediate disposal, 30-day recovery, expiry recheck and newly claimed dependencies.", "synthetic files at every existing gate"],
  11: ["Keep prior evidence, fresh observation, unreachable state and future acceptance separate; only genuine blinded judgments count as reviewer effectiveness.", "all issue-96 synthetic cases and evidence records"],
};

function interviewPurpose(question) {
  if (["Original Q41", "Q41", "Q41a", "Q41b", "Q41c"].includes(question)) return undefined;
  const number = Number(question.slice(1));
  if ([1, 2, 3, 4, 7].includes(number)) return "Record each finding's purpose, applicability, release-era authority, owner, actual check, observation and causal limit.";
  if ([5, 6, 8, 9, 10].includes(number)) return "Preserve checkpoint order, cause-based rejection routing, dependent invalidation and bounded same-article recovery.";
  if (number >= 11 && number <= 15) return "Require catalogue, import, deployment, approval and terminal evidence to agree before LIVE, while separating repair from IMPROVE.";
  if (number >= 16 && number <= 23) return "Retain conflicting reviews and finding identity; use defective and adequate controls plus independent repair or dismissal verification.";
  if (number >= 24 && number <= 32) return "Bind repair relevance, attempt identity, diagnosis, regression review, cumulative counts, measurement changes and failure categories.";
  if (number >= 33 && number <= 39) return "Protect retained references through declared handoff, dispatch barriers, recorded disposition and recoverable cleanup.";
  if (number === 40) return "Keep legacy-access, current-compliance and routing policy unresolved until the owner decides a concrete case.";
  if (number >= 42 && number <= 44) return "Preserve stable retry identity, retention roots, durable intent and recovery order during housekeeping.";
  if (number >= 45 && number <= 48) return "Bind blinded reviewer evidence, late-result selection and the three-attempt cleanup limit to attributable receipts.";
  return `Preserve the accepted issue-96 decision boundary for ${question}.`;
}

function markdownRows(markdown) {
  return markdown.split(/\r?\n/).filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function sourceFor(cell) {
  const keys = Object.keys(sourceLegend).sort((left, right) => right.length - left.length).filter((key) => cell.toLowerCase().includes(key.toLowerCase()));
  const key = keys[0];
  if (!key) throw new Error(`Unknown finding source: ${cell}`);
  const [document, heading, stableId] = sourceLegend[key];
  return {
    document,
    heading,
    stableId,
    supportingSources: keys.slice(1).map((supporting) => {
      const [supportingDocument, supportingHeading, supportingStableId] = sourceLegend[supporting];
      return { document: supportingDocument, heading: supportingHeading, stableId: supportingStableId };
    }),
  };
}

function common(kind, id, source, purpose, format, owner, observation, disposition) {
  return {
    kind,
    id,
    source,
    purpose,
    applicableFormat: format,
    owningActivity: owner,
    observation,
    fingerprint: {
      historicalRevision: baselineRevision,
      historicalTraceabilityBlob: baselineTraceabilityBlob,
      testedBaseRevision: testedProductRevision,
      testedBaseTree: testedProductTree,
    },
    reviewer: { historical: "issue-109-fresh-context-reconciler", current: "issue-123-dedicated-fresh-context-agent" },
    disposition,
  };
}

export async function buildReadinessLedger({ root = process.cwd() } = {}) {
  const baseline = JSON.parse(await readFile(path.join(root, baselineTraceabilityPath), "utf8"));
  const inventory = await readFile(path.join(root, findingInventoryPath), "utf8");
  const findingRows = markdownRows(inventory);
  if (findingRows.length !== 38) throw new Error(`Expected 38 finding rows, got ${findingRows.length}`);

  const stories = baseline.userStories.map((entry) => common(
    "story", entry.story,
    { document: "GitHub issue #96", heading: "User Stories", stableId: `GH-96-US-${String(entry.story).padStart(2, "0")}` },
    entry.criterion, "article-workflow", "supervising-controller", entry.evidence,
    entry.status.includes("future") || entry.status.includes("unreachable") ? "missing-current-proof" : "historical-evidence-only",
  ));
  const testingDecisions = baseline.testingDecisions.map((entry) => common(
    "testing-decision", entry.decision,
    { document: "GitHub issue #96", heading: "Testing Decisions", stableId: `GH-96-TD-${String(entry.decision).padStart(2, "0")}` },
    testingPurposes[entry.decision][0], testingPurposes[entry.decision][1], "verification-harness", entry.evidence,
    entry.status?.includes("future") ? "missing-current-proof" : "historical-evidence-only",
  ));
  const q41Purpose = {
    "Original Q41": "Keep missing historical proof visible; a fresh judgment cannot become retrospective approval.",
    Q41: "Preserve the original Q41 historical-proof boundary beside the accepted follow-up decisions.",
    Q41a: "Use the canonical database evidence register for validated reusable evidence without displacing source authority.",
    Q41b: "Route missing, invalid, stale, or insufficient registered evidence back to recovery and validation.",
    Q41c: "Register research, rejected findings and resolutions, editorial judgments, browser observations, and production proof with integrity and retention dependencies.",
  };
  const interviewQuestions = baseline.interviewCoverage.flatMap((group) => group.questions.map((question) => common(
    "interview-question", question,
    { document: "GitHub issue #96", heading: "Interview coverage and open decisions", stableId: `GH-96-${question.replaceAll(" ", "-").toUpperCase()}` },
    q41Purpose[question] ?? interviewPurpose(question), "article-workflow", "product-owner-and-controller", group.evidence,
    question === "Q40" ? "open-owner-decision" : group.status === "undecided" ? "open-owner-decision" : "accepted-directive-current-proof-required",
  )));
  const findings = baseline.findings.map((entry, index) => {
    const row = findingRows[index];
    const [number, title, sourcePurposeFormat, ownerExpected, observed, laterEvidence, attribution] = row;
    if (Number(number) !== entry.finding) throw new Error(`Finding row mismatch at ${entry.finding}`);
    const primarySource = sourceFor(sourcePurposeFormat);
    if (entry.finding === 36 || entry.finding === 38) {
      primarySource.supportingSources.unshift({ document: primarySource.document, heading: primarySource.heading, stableId: primarySource.stableId });
      primarySource.document = "Owner directive transcribed in retained issue #108 finding map";
      primarySource.heading = "Owner-added P1 criteria";
      primarySource.stableId = `OWNER-P1-F${entry.finding}`;
    }
    const owner = entry.finding === 36 ? "TRANSFORMING/REFINING (later owner directive)" : entry.finding === 38 ? "VALIDATING (later owner directive)" : (ownerExpected.match(/^[A-Z/ -]+(?=\.)/)?.[0] ?? "cross-activity review");
    return {
      ...common(
        "finding", entry.finding, primarySource, sourcePurposeFormat,
        sourcePurposeFormat,
        owner,
        { historical: observed, currentCoverage: laterEvidence, freshIssue123: "pending exact-head synthetic observation" },
        entry.finding === 36 || entry.finding === 38
          ? "later-directive-current-proof-required"
          : "historical-unknown-fresh-proof-required",
      ),
      title,
      expected: ownerExpected,
      historicalAttribution: attribution,
      futureCheck: entry.futureCheck,
      retainedArtifact: entry.retainedArtifact,
      inventoryFingerprint: findingInventoryBlob,
    };
  });

  let browserObservation;
  let browserObservationSha256;
  try {
    const bytes = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/browser/independent/independent-summary.json"));
    browserObservation = JSON.parse(bytes.toString("utf8"));
    browserObservationSha256 = createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  let controllerVerdicts;
  let controllerVerdictsSha256;
  try {
    const bytes = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/controller-verdicts.json"));
    controllerVerdicts = JSON.parse(bytes.toString("utf8"));
    controllerVerdictsSha256 = createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  let controllerObserver;
  let controllerObserverSha256;
  try {
    const bytes = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/controller-observer.json"));
    controllerObserver = JSON.parse(bytes.toString("utf8"));
    controllerObserverSha256 = createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  let commandLedgerSha256;
  try {
    const bytes = await readFile(path.join(root, "build-pack/repairs/article-recovery-123/verification-commands.json"));
    commandLedgerSha256 = createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const browserFindingObservations = browserObservation ? {
    12: "Fresh exact-artifact browser proof: the target CTA is fully visible and keyboard-focusable, but its generic label does not disclose the synthetic destination. The control's descriptive label and exact destination activation work.",
    14: "Fresh exact-artifact browser proof: the target renders zero decoded article visuals. The frozen synthetic control decodes its 1600x900 deterministic diagram at all tested sizes.",
    18: "Fresh exact-artifact browser proof: the complete CTA is inside and hit-testable in both 390x844 and 320x800 initial viewports.",
    19: "Fresh exact-artifact browser proof: the direct-review target exposes no internally scrolling region, so the keyboard-scroll criterion is unavailable on this route rather than passed.",
    28: "Fresh exact-artifact browser proof: the target exposes no accordion. In the control, Tab gives visible focus and Enter changes the native indicator from disclosure-closed to disclosure-open, reveals the answer, and changes 59 marker pixels at every tested width.",
    36: "Fresh exact-artifact browser proof: the target's 2,078 visible tokens include 2,005 literal repetitions of 'decision', so numeric range passes but substantive depth fails. The control is also not a positive editorial control: 4,588 tokens and 144 templated sentences.",
    37: "Fresh exact-artifact browser proof: target samples show one state and zero Web Animations in normal and reduced modes. The control shows 2/3/2 distinct normal-motion states across 390/320/1440 and one static reduced-motion state with unchanged text.",
    38: "Fresh exact-artifact browser proof: the target has zero decoded visuals. The control diagram decodes with truthful alt text but has deterministic fixture provenance, not ImageGen original/derivative or brand/no-people review proof.",
  } : {};
  for (const finding of findings) {
    if (browserFindingObservations[finding.id]) finding.observation.freshIssue123 = browserFindingObservations[finding.id];
    finding.controllerAssessment = {
      applicableCriterion: finding.expected,
      observedDefect: browserFindingObservations[finding.id] ?? "No fresh issue-123 browser defect is bound to this finding.",
      gateStatus: finding.id === 36 ? "caught" : "unverified",
      actualVerdict: finding.id === 36 ? controllerVerdicts?.target?.suppliedOutcome ?? "missing normal-controller verdict" : "not exercised through a finding-specific normal-controller activity",
      nextAction: finding.id === 36 ? controllerVerdicts?.target?.nextAction ?? "Retain the purpose-and-structure obligation." : "Retain the obligation until a criterion-specific normal-controller verdict is captured.",
      attribution: finding.id === 36 ? "The purpose-and-structure activity received the repeated-copy observation. Other simultaneous browser defects were not attributed to this verdict." : "No controller catch is inferred from the browser observation alone.",
    };
  }
  const browserRef = browserObservationSha256 ? { path: "build-pack/repairs/article-recovery-123/browser/independent/independent-summary.json", sha256: browserObservationSha256 } : undefined;
  const controllerRef = controllerVerdictsSha256 ? { path: "build-pack/repairs/article-recovery-123/controller-verdicts.json", sha256: controllerVerdictsSha256 } : undefined;
  const controllerObserverRef = controllerObserverSha256 ? { path: "build-pack/repairs/article-recovery-123/controller-observer.json", sha256: controllerObserverSha256 } : undefined;
  const commandRef = commandLedgerSha256 ? { path: "build-pack/repairs/article-recovery-123/verification-commands.json", sha256: commandLedgerSha256 } : undefined;
  const priorBlindRef = { path: "docs/designs/recovery-evidence/122/reviewer-manifest.json", sha256: "99ca76171121190d295177a5561f7b170179419d13e311fca2dd1a3996b1a9f0" };
  const setCurrent = (row, status, observation, refs = []) => {
    row.currentIssue123Evidence = { status, observation, refs: refs.filter(Boolean) };
  };
  for (const row of [...stories, ...testingDecisions, ...interviewQuestions, ...findings]) {
    setCurrent(row, "not-exercised", "No criterion-specific issue-123 execution is bound to this row. Historical evidence and future acceptance remain separate.");
  }
  for (const findingId of [12, 14, 18, 19, 28, 36, 37, 38]) {
    const finding = findings.find((row) => row.id === findingId);
    setCurrent(finding, findingId === 36 ? "controller-rejected" : "browser-observed-controller-unverified", finding.observation.freshIssue123, [browserRef, ...(findingId === 36 ? [controllerRef] : [])]);
  }
  const storyEvidence = new Map([
    [1, [controllerRef]],
    [2, [controllerRef]],
    [4, [commandRef]],
    [7, [commandRef]],
    [11, [controllerObserverRef, commandRef]],
    [15, [controllerObserverRef, commandRef]],
    [16, [browserRef, commandRef]],
    [19, [browserRef, controllerRef]],
    [20, [browserRef, controllerRef]],
    [21, [browserRef, controllerRef]],
    [25, [browserRef, commandRef]],
    [28, [browserRef, controllerRef]],
  ]);
  for (const [storyId, refs] of storyEvidence) {
    const story = stories.find((row) => row.id === storyId);
    setCurrent(story, "partially-exercised", `Current synthetic evidence exercises only the mechanism recorded in the referenced receipt for story ${storyId}; it does not establish the story's remaining acceptance paths.`, refs);
  }
  for (const storyId of [18, 26]) {
    const story = stories.find((row) => row.id === storyId);
    setCurrent(story, "prior-proof-only", "The six genuine blinded judgments are retained from issue 122's recorded configuration and examined revision. Issue 123 did not rerun a new blind set.", [priorBlindRef]);
  }
  const decisionEvidence = new Map([
    [1, [controllerRef, controllerObserverRef, commandRef]],
    [2, [commandRef]],
    [4, [controllerObserverRef, commandRef]],
    [7, [commandRef]],
    [9, [browserRef, commandRef]],
    [11, [controllerRef, controllerObserverRef, browserRef, commandRef]],
  ]);
  for (const [decisionId, refs] of decisionEvidence) {
    const decision = testingDecisions.find((row) => row.id === decisionId);
    setCurrent(decision, "partially-exercised", `Issue 123 exercises only the exact retained observation applicable to testing decision ${decisionId}; unreferenced mechanisms in that decision remain untested.`, refs);
  }
  setCurrent(testingDecisions.find((row) => row.id === 5), "prior-proof-only", "Issue 122 retains the genuine 6/6 blind result. It is applicable only to its unchanged packets, examined revision and recorded reviewer configuration; issue 123 supplied no new blind judgments.", [priorBlindRef]);
  setCurrent(testingDecisions.find((row) => row.id === 6), "ledger-complete-readiness-red", "All 38 rows are present. Only finding 36 has a finding-specific normal-controller rejection; the other browser observations remain controller-unverified.", [browserRef, controllerRef]);
  for (const question of interviewQuestions) {
    if (question.id === "Q40") continue;
    const numeric = /^Q\d+$/.test(question.id) ? Number(question.id.slice(1)) : undefined;
    if (numeric && [1, 2, 3, 4, 7].includes(numeric)) {
      setCurrent(question, "partially-exercised", `${question.id} is exercised only by the exact inventory and browser observation retained for issue 123.`, [browserRef]);
    } else if (numeric && [11, 12, 13, 14, 15].includes(numeric)) {
      setCurrent(question, "partially-exercised", `${question.id} is exercised only by the exact synthetic release or catalogue observation retained for issue 123.`, [controllerObserverRef, browserRef, commandRef]);
    } else if (numeric && [18, 19, 20, 21].includes(numeric)) {
      setCurrent(question, "partially-exercised", `${question.id} is exercised only by the retained target/control browser and controller observations; unobserved review mechanisms remain open.`, [browserRef, controllerRef]);
    } else if (numeric === 45 || numeric === 46) {
      setCurrent(question, "prior-proof-only", "The six genuine blinded judgments are retained from issue 122. Issue 123 did not perform a fresh blind reviewer run.", [priorBlindRef]);
    }
  }
  if (controllerObserver) {
    const regressionObservation = controllerObserver.regressions.map((entry) => `${entry.test}: ${entry.observed}`).join("; ");
    setCurrent(testingDecisions.find((row) => row.id === 4), "final-head-focused-pass", `The independent e14ece1 observation retained seven synthetic passes and found three fixture-bound early stops: ${regressionObservation}. The corrected final product revision supplies a faithful reviewed-tree test adapter; the focused rollback and resume cases pass there.`, [controllerObserverRef, commandRef]);
  }
  const ledger = {
    schemaVersion: 1,
    readiness: "NOT_READY",
    authority: {
      planning: { document: "planning.md", heading: "Article recovery remediation (ARTICLE-RECOVERY-1127)", stableId: "ARTICLE-RECOVERY-1127" },
      ticket: { repository: "michaelchamboko/VettedSaaSBlueprint", issue: 123 },
      baselineRevision,
      testedBaseRevision: testedProductRevision,
      testedBaseTree: testedProductTree,
    },
    stories,
    testingDecisions,
    interviewQuestions,
    findings,
    blindedJudgments: {
      source: "docs/designs/recovery-evidence/122",
      examinedRevision: "cf0012f0b8d0795e9717ca427bc8bad4ce41ed2e",
      configurationBlob: "4928e25bacf0c89ebb46374f566d5a18b1b33b1d",
      resultRevision: "4597dc9249346cb4f5899dd3e11a3f8c8f5a7d12",
      total: 6,
      accurate: 6,
      misses: 0,
      falseAlarms: 0,
      disposition: "genuine-prior-proof-applicable-to-unchanged-packets-and-recorded-config",
    },
    controllerEvidence: {
      normalEntryPoint: "executePendingImport",
      targetControlTest: "tests/article-publication-http.test.ts",
      mutationScopes: ["asset", "content", "renderer", "rule", "style"],
      testedRevision: controllerVerdicts?.testedRevision,
      target: controllerVerdicts ? { artifactSha256: controllerVerdicts.target.artifactSha256, outcome: controllerVerdicts.target.suppliedOutcome, resultingStage: controllerVerdicts.target.resultingStage, nextAction: controllerVerdicts.target.nextAction } : undefined,
      control: controllerVerdicts ? { artifactSha256: controllerVerdicts.control.artifactSha256, outcome: controllerVerdicts.control.suppliedOutcome, resultingStage: controllerVerdicts.control.resultingStage, nextAction: controllerVerdicts.control.nextAction } : undefined,
      disposition: controllerVerdicts ? "target-rejected-control-unverified" : "focused-execution-required-at-tested-revision",
    },
    browserEvidence: {
      status: browserObservation ? "independent-exact-artifact-capture-retained" : "missing-exact-artifact-controller-bound-capture",
      observedRevision: browserObservation?.revision,
      promotedToRevision: testedProductRevision,
      promotionBasis: "The 1625b26..29bf7f2 delta changes historical rendering-input replay and synthetic release-test reviewed-tree injection. The served route, components, styles, assets and frozen target/control bytes are unchanged.",
      reviewer: "/root/browser_observer (independent)",
      sourceBindings: browserObservation ? { target: browserObservation.target, control: browserObservation.control } : undefined,
      requiredViewports: ["390x844", "320x800", "1440x900"],
      requiredChecks: ["first-screen-cta", "keyboard-focus-and-scroll", "normal-motion", "reduced-motion", "imagery", "applicable-content"],
    },
    missingProof: [
      "No adequate positive content-depth control is retained: the target repeats one word 2,005 times and the synthetic control has 4,588 tokens with 144 templated sentences.",
      "ImageGen original PNG, deterministic derivative, provenance, independent no-people/brand judgment, integration, and truthful alternative text remain unproven for the issue-123 target.",
      "Only finding 36 received a finding-specific normal-controller rejection. Browser observations for the other findings do not by themselves prove a supervisor catch.",
    ],
  };
  ledger.digest = createHash("sha256").update(JSON.stringify(ledger)).digest("hex");
  const output = path.join(root, "docs/designs/recovery-evidence/123/readiness-ledger.json");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ledger = await buildReadinessLedger();
  process.stdout.write(`${ledger.digest}\n`);
}
