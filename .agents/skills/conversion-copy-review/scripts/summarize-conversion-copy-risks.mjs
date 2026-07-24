#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const CANONICAL_REASON_CODES = new Set([
  "missing_required_context",
  "generic_hero",
  "vague_buyer_decision",
  "audience_not_narrowed",
  "site_workflow_over_product_decision",
  "generic_benefit_copy",
  "generic_objection_faq",
  "generic_limitation",
  "cta_intent_mismatch",
  "cta_destination_mismatch",
  "weak_disclosure_cta_relationship",
  "mobile_scan_unclear",
  "sibling_pattern_reuse",
  "hidden_value_dependency",
  "unsupported_hype_or_pressure",
  "overclaimed_independence",
  "weak_trust_net_impression",
  "unverifiable_social_proof",
  "unanswered_buyer_question",
  "destination_continuity_gap",
  "rewrite_requires_prior_gate",
  "missing_required_rewrites",
]);

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "before", "by", "can", "for", "from", "in", "into",
  "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "use", "with", "you", "your",
  "review", "page", "affiliate", "official", "offer", "click", "site", "tool", "tools", "product",
]);

const REQUIRED_VISIBLE_FIELDS = [
  ["hero.headline", (page) => page.hero?.headline],
  ["hero.subheadline", (page) => page.hero?.subheadline],
  ["affiliate_disclosure.short_disclosure", (page) => page.affiliate_disclosure?.short_disclosure],
  ["hero.primary_cta_label", (page) => page.hero?.primary_cta_label],
];

const GENERIC_CTA_LABELS = [
  "get started",
  "learn more",
  "try it now",
  "start now",
  "click here",
  "visit site",
  "visit website",
];

const GENERIC_LIMITATION_PATTERNS = [
  /\bpricing (may|can|could|might) change\b/i,
  /\bterms (may|can|could|might) change\b/i,
  /\bcheck the official site\b/i,
  /\bnot for everyone\b/i,
  /\bmay not be the right fit\b/i,
];

const GENERIC_FAQ_PATTERNS = [
  /\bis .+ worth it\??$/i,
  /\bis .+ legit\??$/i,
  /\bwhat is .+\??$/i,
  /\bwhy use .+\??$/i,
  /\bdo you earn (a )?commission\b/i,
  /\baffiliate disclosure\b/i,
];

const GENERIC_BENEFIT_PATTERNS = [
  /\bsave time\b/i,
  /\beasy to use\b/i,
  /\bstreamline(s|d)? your workflow\b/i,
  /\bboost productivity\b/i,
  /\bmake(s)? it easier\b/i,
];

const INTERNAL_PROCESS_PATTERNS = [
  /owner[-\s]?reviewed/i,
  /owner approval/i,
  /approval[-\s]?gated/i,
  /publication[-\s]?gated/i,
  /publication checks?/i,
  /compliance checks?/i,
  /compliance gates?/i,
  /affiliate[-\s]?link vault/i,
  /destination[-\s]?review workflow/i,
];

const OVERCLAIM_PATTERNS = [
  { reason_code: "unsupported_hype_or_pressure", pattern: /\b(best|top|#1|leading|ultimate|must[-\s]?have|guaranteed|guarantee|proven)\b/i },
  { reason_code: "unsupported_hype_or_pressure", pattern: /\b(only today|limited time|act now|lock in|claim this deal|get \d+% off|lifetime deal)\b/i },
  { reason_code: "overclaimed_independence", pattern: /\b(independent|unbiased|objective|verified|tested|hands[-\s]?on|recommended|officially approved|official partner)\b/i },
  { reason_code: "unverifiable_social_proof", pattern: /\b(trusted by|loved by|rated|five[-\s]?star|5[-\s]?star|thousands of users|customers say)\b/i },
];

const SENSITIVE_CTA_PATTERNS = [
  /\bclaim\b/i,
  /\bdiscount\b/i,
  /\bdeal\b/i,
  /\bfree trial\b/i,
  /\bguarantee\b/i,
  /\bbest price\b/i,
  /\block in\b/i,
];

function parseArgs(argv) {
  const parsed = {
    targetDir: undefined,
    reportOnly: false,
    json: false,
    target: null,
    draftInput: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--report-only") {
      parsed.reportOnly = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--draft-input") {
      parsed.draftInput = true;
    } else if (arg === "--target") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--target requires a filename");
      parsed.target = basename(value);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      parsed.target = basename(arg.slice("--target=".length));
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!parsed.targetDir) {
      parsed.targetDir = arg;
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }

  parsed.targetDir ??= "src/generated/landing-pages";
  if (parsed.target === "index.json") throw new Error("--target cannot be index.json");
  return parsed;
}

function readJsonFiles(dir, draftInput = false) {
  if (!existsSync(dir)) return [];
  if (draftInput) {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json") && name !== "index.json")
      .sort()
      .map((name) => ({ file: name, data: JSON.parse(readFileSync(join(dir, name), "utf8")) }));
  }
  const manifestPath = join(dir, "index.json");
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const approvedFiles = new Set((manifest.pages ?? [])
    .filter((entry) => entry.status === "published"
      && entry.published_at
      && entry.current_version_id
      && ((entry.publication_source === "oracle_dynamic_pages" && entry.owner_publish_audit_id)
        || (entry.publication_source === "agent_verified_release" && entry.release_receipt)))
    .map((entry) => basename(entry.artifact ?? "")));
  return readdirSync(dir)
    .filter((name) => approvedFiles.has(name))
    .sort()
    .map((name) => {
      const fullPath = join(dir, name);
      try {
        return { file: name, data: JSON.parse(readFileSync(fullPath, "utf8")) };
      } catch (error) {
        throw new Error(`Failed to parse ${name}: ${error.message}`);
      }
    });
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value, dropStopwords = false) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const raw = normalized.split(" ");
  return dropStopwords ? raw.filter((token) => !STOPWORDS.has(token)) : raw;
}

function firstText(items, field) {
  return Array.isArray(items) && items[0] && typeof items[0][field] === "string"
    ? items[0][field].trim()
    : "";
}

function isApprovedVisual(asset) {
  return asset?.approval_status === "approved" && asset?.approved_by_owner === true;
}

function renderedTextEntries(page) {
  const entries = [
    ["metadata.title_tag", page.metadata?.title_tag],
    ["metadata.meta_description", page.metadata?.meta_description],
    ["affiliate_disclosure.short_disclosure", page.affiliate_disclosure?.short_disclosure],
    ["hero.headline", page.hero?.headline],
    ["hero.subheadline", page.hero?.subheadline],
    ["hero.primary_cta_label", page.hero?.primary_cta_label],
    ["hero.risk_reversal", page.hero?.risk_reversal],
    ["problem_solution.problem", page.problem_solution?.problem],
    ["problem_solution.solution", page.problem_solution?.solution],
  ];

  for (const [index, item] of (page.benefits ?? []).entries()) {
    entries.push([`benefits.${index}.benefit_title`, item.benefit_title]);
    entries.push([`benefits.${index}.benefit_description`, item.benefit_description]);
  }
  for (const [index, item] of (page.how_it_works ?? []).entries()) {
    entries.push([`how_it_works.${index}.title`, item.title]);
    entries.push([`how_it_works.${index}.description`, item.description]);
  }
  for (const [index, item] of (page.limitations ?? []).entries()) {
    entries.push([`limitations.${index}.limitation`, item.limitation]);
    entries.push([`limitations.${index}.mitigation`, item.mitigation]);
  }
  for (const [index, item] of (page.faq ?? []).entries()) {
    entries.push([`faq.${index}.question`, item.question]);
    entries.push([`faq.${index}.answer`, item.answer]);
  }

  return entries.filter(([, value]) => typeof value === "string" && value.trim());
}

function issue(file, reasonCode, fieldPath, message, severity = "high") {
  if (!CANONICAL_REASON_CODES.has(reasonCode)) {
    throw new Error(`Internal scanner bug: unknown reason code ${reasonCode}`);
  }
  return { file, reason_code: reasonCode, severity, field_path: fieldPath, message };
}

function textIssueChecks(row) {
  const page = row.data;
  const issues = [];

  for (const [fieldPath, getter] of REQUIRED_VISIBLE_FIELDS) {
    const value = getter(page);
    if (typeof value !== "string" || !value.trim()) {
      issues.push(issue(row.file, "mobile_scan_unclear", fieldPath, `${fieldPath} is missing from the first visible decision path.`));
    }
  }

  const disclosure = page.affiliate_disclosure?.short_disclosure ?? "";
  if (!/(commission|paid|compensat|earn|referral fee|affiliate)/i.test(disclosure)) {
    issues.push(issue(
      row.file,
      "weak_disclosure_cta_relationship",
      "affiliate_disclosure.short_disclosure",
      "Visible disclosure should clearly communicate the affiliate or compensation relationship near the first CTA.",
    ));
  }

  const headline = page.hero?.headline ?? "";
  const headlineTokens = tokens(headline, true);
  if (headlineTokens.length < 4 || /\b(review|official site|best tool|software tool)\b/i.test(headline)) {
    issues.push(issue(
      row.file,
      "generic_hero",
      "hero.headline",
      "Hero headline appears generic; semantic review must verify it names a concrete buyer decision or use case.",
      "medium",
    ));
  }

  const subheadline = page.hero?.subheadline ?? "";
  if (subheadline.length > 260) {
    issues.push(issue(
      row.file,
      "mobile_scan_unclear",
      "hero.subheadline",
      "Hero subheadline is long enough to weaken first-viewport scan quality on mobile.",
      "medium",
    ));
  }

  const ctaLabel = page.hero?.primary_cta_label ?? "";
  if (GENERIC_CTA_LABELS.includes(normalizeText(ctaLabel))) {
    issues.push(issue(row.file, "cta_intent_mismatch", "hero.primary_cta_label", "CTA label is too generic to predict the destination action."));
  }
  if (SENSITIVE_CTA_PATTERNS.some((pattern) => pattern.test(ctaLabel))) {
    issues.push(issue(
      row.file,
      "cta_destination_mismatch",
      "hero.primary_cta_label",
      "CTA label implies a sensitive offer state that requires destination and compliance support.",
    ));
  }

  const heroCtaId = page.hero?.primary_cta_link_id;
  for (const [index, block] of (page.cta_blocks ?? []).entries()) {
    if (block.affiliate_link_id && heroCtaId && block.affiliate_link_id !== heroCtaId) {
      issues.push(issue(
        row.file,
        "rewrite_requires_prior_gate",
        `cta_blocks.${index}.affiliate_link_id`,
        "CTA block affiliate link id differs from hero CTA id; this must be resolved by the owning link/compliance gate.",
      ));
    }
  }

  const firstBenefit = firstText(page.benefits, "benefit_title");
  if (!firstBenefit || GENERIC_BENEFIT_PATTERNS.some((pattern) => pattern.test(firstBenefit))) {
    issues.push(issue(row.file, "generic_benefit_copy", "benefits.0.benefit_title", "First benefit appears generic or missing.", "medium"));
  }

  const firstLimitation = firstText(page.limitations, "limitation");
  if (!firstLimitation || GENERIC_LIMITATION_PATTERNS.some((pattern) => pattern.test(firstLimitation))) {
    issues.push(issue(row.file, "generic_limitation", "limitations.0.limitation", "First limitation appears generic or missing.", "medium"));
  }

  const firstFaq = firstText(page.faq, "question");
  if (!firstFaq || GENERIC_FAQ_PATTERNS.some((pattern) => pattern.test(firstFaq))) {
    issues.push(issue(row.file, "generic_objection_faq", "faq.0.question", "First FAQ appears generic, affiliate-focused, or missing.", "medium"));
  }

  if ((page.objection_handling ?? []).length > 0 && (page.faq ?? []).length === 0) {
    issues.push(issue(
      row.file,
      "hidden_value_dependency",
      "objection_handling",
      "Objection handling exists only in non-rendered fields; buyer friction should appear in rendered FAQ or visible copy.",
    ));
  }

  if ((page.proof_blocks ?? []).length > 0 && renderedTextEntries(page).length < 8) {
    issues.push(issue(
      row.file,
      "hidden_value_dependency",
      "proof_blocks",
      "Proof exists but visible copy is sparse; semantic review must verify critical value is rendered.",
      "medium",
    ));
  }

  const visualAssets = [
    page.hero?.visual_asset,
    ...(page.benefits ?? []).map((item) => item.visual_asset),
  ].filter(Boolean);
  for (const [index, asset] of visualAssets.entries()) {
    if (asset.approval_status === "approved" || asset.approved_by_owner === true) {
      issues.push(issue(
        row.file,
        "rewrite_requires_prior_gate",
        `visual_asset.${index}`,
        "Generated artifact self-attests asset approval; conversion review must rely on audited owner/gate records.",
      ));
    }
    if (!isApprovedVisual(asset) && (asset.alt_text || asset.prompt_summary)) {
      issues.push(issue(
        row.file,
        "hidden_value_dependency",
        `visual_asset.${index}`,
        "Visual asset text is present but unapproved assets are not rendered as persuasion in the current component.",
        "low",
      ));
    }
  }

  for (const [fieldPath, value] of renderedTextEntries(page)) {
    const internalMatch = INTERNAL_PROCESS_PATTERNS.find((pattern) => pattern.test(value));
    if (internalMatch) {
      issues.push(issue(
        row.file,
        "site_workflow_over_product_decision",
        fieldPath,
        `Visible copy uses internal process language as public proof (${internalMatch.source}).`,
      ));
    }

    const overclaim = OVERCLAIM_PATTERNS.find(({ pattern }) => pattern.test(value));
    if (overclaim) {
      issues.push(issue(
        row.file,
        overclaim.reason_code,
        fieldPath,
        `Visible copy contains language that requires prior evidence, review-basis, or compliance support (${overclaim.pattern.source}).`,
      ));
    }
  }

  return issues;
}

function exactFieldRows(rows) {
  return rows.map((row) => {
    const page = row.data;
    return {
      file: row.file,
      h1: page.hero?.headline?.trim() ?? "",
      cta: page.hero?.primary_cta_label?.trim() ?? "",
      firstBenefit: firstText(page.benefits, "benefit_title"),
      firstLimitation: firstText(page.limitations, "limitation"),
      firstFaq: firstText(page.faq, "question"),
    };
  });
}

function groupBy(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[field];
    if (!value) continue;
    const key = `${field}:${normalizeText(value)}`;
    const existing = groups.get(key) ?? { field, value, files: [] };
    existing.files.push(row.file);
    groups.set(key, existing);
  }
  return [...groups.values()].filter((group) => group.files.length > 1);
}

function duplicateReasonForField(field) {
  if (field === "cta") return "cta_intent_mismatch";
  if (field === "firstBenefit") return "generic_benefit_copy";
  if (field === "firstLimitation") return "generic_limitation";
  if (field === "firstFaq") return "generic_objection_faq";
  return "sibling_pattern_reuse";
}

function duplicateGroups(rows) {
  const exactRows = exactFieldRows(rows);
  return ["h1", "cta", "firstBenefit", "firstLimitation", "firstFaq"].flatMap((field) =>
    groupBy(exactRows, field).map((group) => {
      const reasonCode = duplicateReasonForField(field);
      return {
        ...group,
        reason_code: reasonCode,
        secondary_reason_code: reasonCode === "sibling_pattern_reuse" ? null : "sibling_pattern_reuse",
      };
    }),
  );
}

function containsTarget(item, target) {
  if (!target) return true;
  if (item.file) return item.file === target;
  return item.files?.includes(target);
}

function buildReport(options) {
  const rows = readJsonFiles(options.targetDir, options.draftInput);
  if (options.target && !rows.some((row) => row.file === options.target)) {
    throw new Error(`Target file not found: ${options.target}`);
  }

  const allIssues = rows.flatMap(textIssueChecks);
  const allDuplicateGroups = duplicateGroups(rows);
  const issues = allIssues.filter((item) => containsTarget(item, options.target));
  const duplicates = allDuplicateGroups.filter((item) => containsTarget(item, options.target));

  const summary = {
    issue_count: issues.length,
    duplicate_group_count: duplicates.length,
    high_severity_issue_count: issues.filter((item) => item.severity === "high").length,
    finding_count: issues.length + duplicates.length,
  };

  return {
    schema_version: 1,
    tool: "summarize-conversion-copy-risks",
    input_mode: options.draftInput ? "draft" : "production",
    status: summary.finding_count === 0 ? "pass" : "fail",
    report_only: options.reportOnly,
    target_dir: options.targetDir,
    target: options.target,
    scanned_count: rows.length,
    summary,
    duplicate_groups: duplicates,
    issues,
  };
}

function printHumanReport(report) {
  const scope = report.target ? `${report.target_dir} for target ${report.target}` : report.target_dir;
  console.log(`Scanned ${report.scanned_count} landing page artifact(s) in ${scope}.`);

  if (report.status === "pass") {
    console.log("No advisory conversion-copy risks found.");
    return;
  }

  if (report.duplicate_groups.length > 0) {
    console.log(`Found ${report.duplicate_groups.length} repeated visible-field group(s):`);
    for (const group of report.duplicate_groups) {
      console.log(`\n[${group.field}] ${group.value}`);
      const reasons = [group.reason_code, group.secondary_reason_code].filter(Boolean).join(", ");
      console.log(`- reason: ${reasons}`);
      for (const file of group.files) console.log(`- ${file}`);
    }
  }

  if (report.issues.length > 0) {
    console.log(`\nFound ${report.issues.length} advisory issue(s):`);
    for (const item of report.issues) {
      console.log(`\n[${item.reason_code}] ${item.file} ${item.field_path}`);
      console.log(`- severity: ${item.severity}`);
      console.log(`- ${item.message}`);
    }
  }
}

function emitError(error, options) {
  if (options?.json) {
    console.log(JSON.stringify({
      schema_version: 1,
      tool: "summarize-conversion-copy-risks",
      status: "error",
      report_only: options.reportOnly ?? false,
      error: error.message,
    }, null, 2));
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(2);
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printHumanReport(report);
  if (report.status === "fail" && !options.reportOnly) process.exit(1);
} catch (error) {
  emitError(error, options);
}
