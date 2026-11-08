#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const SCORE_KEYS = [
  "evidence_score",
  "originality_score",
  "conversion_score",
  "compliance_score",
  "readability_score",
  "seo_safety_score",
  "overall_score",
];

const THRESHOLDS = {
  short_field_token_similarity: 0.8,
  composite_visible_page_similarity: 0.72,
  score_delta_max: 5,
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "before", "by", "can", "for", "from", "in", "into",
  "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "use", "with", "you", "your",
  "review", "page", "affiliate", "official", "offer", "click", "site", "tool", "tools", "product",
]);

const INTERNAL_PROCESS_PATTERNS = [
  /owner[-\s]?reviewed/i,
  /owner approval/i,
  /approval[-\s]?gated/i,
  /publication[-\s]?gated/i,
  /publication checks?/i,
  /compliance checks?/i,
  /compliance gates?/i,
  /review records?/i,
  /approved referral/i,
  /affiliate[-\s]?link vault/i,
  /destination[-\s]?review workflow/i,
];

const RISKY_OVERCLAIM_PATTERNS = [
  { reason_code: "unsupported_sensitive_claim", pattern: /\b(best|top|#1|leading|better than|alternative to|vs\.?|versus)\b/i },
  { reason_code: "unsupported_sensitive_claim", pattern: /\b(discount|free trial|guarantee|guaranteed|refund|pricing|security|privacy|compliance)\b/i },
  { reason_code: "review_basis_overclaim", pattern: /\b(independent|trusted|verified|tested|hands[-\s]?on|recommended|evidence[-\s]?backed)\b/i },
];

function exactFieldReasonCodes(field) {
  const mapped = {
    cta: ["exact_field_collision", "generic_cta_reuse"],
    firstBenefit: ["exact_field_collision", "generic_benefit_reuse"],
    firstLimitation: ["exact_field_collision", "generic_limitation_reuse"],
    firstFaq: ["exact_field_collision", "generic_faq_reuse"],
    scores: ["copied_score_signature", "inflated_or_copied_scores"],
  };
  return mapped[field] ?? ["exact_field_collision"];
}

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
      && entry.publication_source === "agent_verified_release"
      && entry.release_receipt)
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

function firstText(items, field) {
  return Array.isArray(items) && items[0] && typeof items[0][field] === "string"
    ? items[0][field].trim()
    : "";
}

function scoreSignature(scores = {}) {
  return SCORE_KEYS.map((key) => `${key}:${scores[key] ?? ""}`).join("|");
}

function extractExactPage(row) {
  const page = row.data;
  return {
    file: row.file,
    title: page.metadata?.title_tag?.trim() ?? "",
    h1: page.hero?.headline?.trim() ?? "",
    cta: page.hero?.primary_cta_label?.trim() ?? "",
    firstBenefit: firstText(page.benefits, "benefit_title"),
    firstLimitation: firstText(page.limitations, "limitation"),
    firstFaq: firstText(page.faq, "question"),
    scores: scoreSignature(page.quality_scores),
  };
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const groupKey = `${key}:${value.toLowerCase()}`;
    const existing = groups.get(groupKey) ?? {
      type: "exact",
      field: key,
      value,
      reason_code: exactFieldReasonCodes(key)[0],
      reason_codes: exactFieldReasonCodes(key),
      files: [],
    };
    existing.files.push(row.file);
    groups.set(groupKey, existing);
  }
  return [...groups.values()].filter((group) => group.files.length > 1);
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

function tokenCounts(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function multisetDice(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const countsA = tokenCounts(tokensA);
  const countsB = tokenCounts(tokensB);
  let shared = 0;
  for (const [token, countA] of countsA.entries()) shared += Math.min(countA, countsB.get(token) ?? 0);
  return (2 * shared) / (tokensA.length + tokensB.length);
}

function addWeightedText(map, text, weight) {
  for (const token of tokens(text, true)) map.set(token, (map.get(token) ?? 0) + weight);
}

function weightedJaccard(mapA, mapB) {
  const allTokens = new Set([...mapA.keys(), ...mapB.keys()]);
  let shared = 0;
  let total = 0;
  for (const token of allTokens) {
    const a = mapA.get(token) ?? 0;
    const b = mapB.get(token) ?? 0;
    shared += Math.min(a, b);
    total += Math.max(a, b);
  }
  return total === 0 ? 0 : shared / total;
}

function isApprovedVisual(asset) {
  return asset?.approval_status === "approved" && asset?.approved_by_owner === true;
}

function buildVisibleFingerprint(page) {
  const map = new Map();
  addWeightedText(map, page.metadata?.title_tag, 3);
  addWeightedText(map, page.metadata?.meta_description, 2);
  addWeightedText(map, page.hero?.headline, 4);
  addWeightedText(map, page.hero?.subheadline, 2);
  addWeightedText(map, page.hero?.primary_cta_label, 3);
  addWeightedText(map, page.hero?.risk_reversal, 1.5);

  if (!isApprovedVisual(page.hero?.visual_asset)) {
    addWeightedText(map, page.problem_solution?.problem, 2);
    addWeightedText(map, page.problem_solution?.solution, 2);
  } else {
    addWeightedText(map, page.hero?.visual_asset?.alt_text, 1);
  }

  for (const benefit of page.benefits ?? []) {
    addWeightedText(map, benefit.benefit_title, 3);
    addWeightedText(map, benefit.benefit_description, 2);
    if (isApprovedVisual(benefit.visual_asset)) addWeightedText(map, benefit.visual_asset.alt_text, 1);
  }
  for (const step of page.how_it_works ?? []) {
    addWeightedText(map, step.title, 1.5);
    addWeightedText(map, step.description, 1);
  }
  for (const item of page.limitations ?? []) {
    addWeightedText(map, item.limitation, 3);
    addWeightedText(map, item.mitigation, 2);
  }
  for (const item of page.faq ?? []) {
    addWeightedText(map, item.question, 3);
    addWeightedText(map, item.answer, 2);
  }
  return map;
}

function collectShortVisibleFields(row) {
  const page = row.data;
  const fields = [
    ["title", page.metadata?.title_tag],
    ["h1", page.hero?.headline],
    ["cta", page.hero?.primary_cta_label],
    ["risk_reversal", page.hero?.risk_reversal],
  ];
  for (const [index, item] of (page.benefits ?? []).entries()) fields.push([`benefit_title.${index}`, item.benefit_title]);
  for (const [index, item] of (page.how_it_works ?? []).entries()) fields.push([`workflow_title.${index}`, item.title]);
  for (const [index, item] of (page.limitations ?? []).entries()) fields.push([`limitation.${index}`, item.limitation]);
  for (const [index, item] of (page.faq ?? []).entries()) fields.push([`faq_question.${index}`, item.question]);
  return fields
    .map(([field, value]) => ({ file: row.file, field, value: typeof value === "string" ? value.trim() : "" }))
    .filter((item) => item.value);
}

function findNearShortFieldPairs(rows) {
  const items = rows.flatMap(collectShortVisibleFields);
  const pairs = [];
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      const a = items[left];
      const b = items[right];
      if (a.file === b.file || a.field !== b.field) continue;
      const normalizedA = normalizeText(a.value);
      const normalizedB = normalizeText(b.value);
      const tokensA = tokens(a.value);
      const tokensB = tokens(b.value);
      if (tokensA.length < 3 || tokensB.length < 3) continue;
      if (normalizedA.length < 12 || normalizedB.length < 12) continue;
      if (normalizedA === normalizedB) continue;
      const similarity = multisetDice(tokensA, tokensB);
      if (similarity >= THRESHOLDS.short_field_token_similarity) {
        pairs.push({
          field: a.field,
          files: [a.file, b.file],
          similarity: Number(similarity.toFixed(3)),
          values: { [a.file]: a.value, [b.file]: b.value },
          reason_code: "near_duplicate_copy",
        });
      }
    }
  }
  return pairs;
}

function findCompositePairs(rows) {
  const fingerprints = rows.map((row) => ({ file: row.file, map: buildVisibleFingerprint(row.data) }));
  const pairs = [];
  for (let left = 0; left < fingerprints.length; left += 1) {
    for (let right = left + 1; right < fingerprints.length; right += 1) {
      const a = fingerprints[left];
      const b = fingerprints[right];
      const similarity = weightedJaccard(a.map, b.map);
      if (similarity >= THRESHOLDS.composite_visible_page_similarity) {
        pairs.push({
          files: [a.file, b.file],
          similarity: Number(similarity.toFixed(3)),
          reason_code: "near_duplicate_copy",
        });
      }
    }
  }
  return pairs;
}

function collectScoreDeltas(rows) {
  const pairs = [];
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const a = rows[left];
      const b = rows[right];
      const scoresA = a.data.quality_scores ?? {};
      const scoresB = b.data.quality_scores ?? {};
      if (!SCORE_KEYS.every((key) => Number.isFinite(scoresA[key]) && Number.isFinite(scoresB[key]))) continue;
      const deltas = Object.fromEntries(SCORE_KEYS.map((key) => [key, Math.abs(scoresA[key] - scoresB[key])]));
      const maxDelta = Math.max(...Object.values(deltas));
      if (maxDelta <= THRESHOLDS.score_delta_max) {
        const avgDelta = Object.values(deltas).reduce((sum, value) => sum + value, 0) / SCORE_KEYS.length;
        pairs.push({
          files: [a.file, b.file],
          max_delta: maxDelta,
          avg_delta: Number(avgDelta.toFixed(2)),
          deltas,
          reason_code: "copied_score_signature",
        });
      }
    }
  }
  return pairs;
}

function findSemanticPairs(rows, compositePairs) {
  const byFile = new Map(rows.map((row) => [row.file, row.data]));
  const pairs = [];

  for (const pair of compositePairs) {
    const [fileA, fileB] = pair.files;
    const pageA = byFile.get(fileA);
    const pageB = byFile.get(fileB);
    const productA = pageA?.metadata?.product_id;
    const productB = pageB?.metadata?.product_id;
    if (!productA || productA !== productB) continue;

    const keywordA = normalizeText(pageA.metadata?.target_keyword);
    const keywordB = normalizeText(pageB.metadata?.target_keyword);
    const ctaA = normalizeText(pageA.hero?.primary_cta_label);
    const ctaB = normalizeText(pageB.hero?.primary_cta_label);
    const h1A = normalizeText(pageA.hero?.headline);
    const h1B = normalizeText(pageB.hero?.headline);

    const reasonCodes = new Set();
    if (keywordA && keywordB && keywordA !== keywordB) reasonCodes.add("thin_keyword_swap");
    if (ctaA && ctaA === ctaB) reasonCodes.add("same_intent_sibling");
    if (h1A && h1A === h1B) reasonCodes.add("same_intent_sibling");
    if (reasonCodes.size === 0) continue;

    pairs.push({
      files: pair.files,
      similarity: pair.similarity,
      product_id: productA,
      target_keywords: { [fileA]: pageA.metadata?.target_keyword ?? "", [fileB]: pageB.metadata?.target_keyword ?? "" },
      cta_labels: { [fileA]: pageA.hero?.primary_cta_label ?? "", [fileB]: pageB.hero?.primary_cta_label ?? "" },
      reason_code: reasonCodes.has("thin_keyword_swap") ? "thin_keyword_swap" : "same_intent_sibling",
      reason_codes: [...reasonCodes].sort(),
    });
  }

  return pairs;
}

function buildPairGroups(pairs, options) {
  const buckets = new Map();
  for (const pair of pairs) {
    const key = options.bucketKey(pair);
    const bucket = buckets.get(key) ?? [];
    bucket.push(pair);
    buckets.set(key, bucket);
  }

  const groups = [];
  for (const [bucketKey, bucketPairs] of buckets.entries()) {
    const parent = new Map();
    const find = (value) => {
      if (!parent.has(value)) parent.set(value, value);
      const current = parent.get(value);
      if (current === value) return value;
      const root = find(current);
      parent.set(value, root);
      return root;
    };
    const union = (a, b) => parent.set(find(a), find(b));
    for (const pair of bucketPairs) union(pair.files[0], pair.files[1]);

    const byRoot = new Map();
    for (const pair of bucketPairs) {
      const root = find(pair.files[0]);
      const groupPairs = byRoot.get(root) ?? [];
      groupPairs.push(pair);
      byRoot.set(root, groupPairs);
    }

    for (const groupPairs of byRoot.values()) {
      const files = [...new Set(groupPairs.flatMap((pair) => pair.files))].sort();
      const group = {
        type: options.type,
        reason_code: options.reasonCode,
        files,
        pairs: groupPairs,
      };
      if (options.type === "short_field_similarity") {
        group.field = bucketKey;
        group.threshold = THRESHOLDS.short_field_token_similarity;
        group.min_similarity = Math.min(...groupPairs.map((pair) => pair.similarity));
      } else if (options.type === "composite_visible_similarity") {
        group.threshold = THRESHOLDS.composite_visible_page_similarity;
        group.min_similarity = Math.min(...groupPairs.map((pair) => pair.similarity));
      } else if (options.type === "score_delta_similarity") {
        group.threshold = THRESHOLDS.score_delta_max;
        group.max_delta = Math.max(...groupPairs.map((pair) => pair.max_delta));
        group.avg_delta = Number((groupPairs.reduce((sum, pair) => sum + pair.avg_delta, 0) / groupPairs.length).toFixed(2));
      } else if (options.type === "semantic_pattern") {
        group.threshold = THRESHOLDS.composite_visible_page_similarity;
        group.min_similarity = Math.min(...groupPairs.map((pair) => pair.similarity));
        group.reason_codes = [...new Set(groupPairs.flatMap((pair) => pair.reason_codes ?? [pair.reason_code]))].sort();
      }
      groups.push(group);
    }
  }
  return groups;
}

function isLikelyPlaceholderUuid(value) {
  if (typeof value !== "string") return false;
  const normalized = value.toLowerCase().replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(normalized)) return false;
  const counts = [...normalized].reduce((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});
  return Math.max(...Object.values(counts)) >= 24;
}

function collectIds(page) {
  const ids = [
    ["metadata.product_id", page.metadata?.product_id],
    ["hero.primary_cta_link_id", page.hero?.primary_cta_link_id],
  ];
  for (const [index, item] of (page.benefits ?? []).entries()) {
    for (const id of item.source_reference_ids ?? []) ids.push([`benefits.${index}.source_reference_ids`, id]);
  }
  for (const [index, item] of (page.proof_blocks ?? []).entries()) {
    ids.push([`proof_blocks.${index}.source_reference_id`, item.source_reference_id]);
    ids.push([`proof_blocks.${index}.evidence_claim_id`, item.evidence_claim_id]);
  }
  for (const [index, item] of (page.limitations ?? []).entries()) {
    ids.push([`limitations.${index}.evidence_claim_id`, item.evidence_claim_id]);
  }
  for (const [index, item] of (page.objection_handling ?? []).entries()) {
    for (const id of item.source_reference_ids ?? []) ids.push([`objection_handling.${index}.source_reference_ids`, id]);
  }
  for (const [index, item] of (page.cta_blocks ?? []).entries()) {
    ids.push([`cta_blocks.${index}.affiliate_link_id`, item.affiliate_link_id]);
  }
  for (const [index, item] of (page.faq ?? []).entries()) {
    for (const id of item.source_reference_ids ?? []) ids.push([`faq.${index}.source_reference_ids`, id]);
  }
  return ids.filter(([, value]) => typeof value === "string" && value.length > 0);
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

function collectArtifactIssues(rows) {
  const issues = [];
  for (const row of rows) {
    const page = row.data;
    const heroCta = page.hero?.primary_cta_link_id;
    const ctaIds = (page.cta_blocks ?? []).map((item) => item.affiliate_link_id).filter(Boolean);
    const mismatchedCtas = ctaIds.filter((id) => id !== heroCta);
    if (mismatchedCtas.length > 0) {
      issues.push({
        field: "cta_consistency",
        reason_code: "cta_id_mismatch",
        file: row.file,
        message: `hero.primary_cta_link_id ${heroCta} differs from cta_blocks affiliate ids ${mismatchedCtas.join(", ")}`,
      });
    }

    for (const [field, value] of collectIds(page)) {
      if (isLikelyPlaceholderUuid(value)) {
        issues.push({
          field: "placeholder_id",
          reason_code: "placeholder_or_self_attested_record",
          file: row.file,
          message: `${field} looks like a placeholder/test UUID (${value})`,
        });
      }
    }

    const evidenceScore = page.quality_scores?.evidence_score ?? 0;
    if (evidenceScore >= 70 && (!Array.isArray(page.proof_blocks) || page.proof_blocks.length === 0)) {
      issues.push({
        field: "evidence_support",
        reason_code: "inflated_or_copied_scores",
        file: row.file,
        message: `evidence_score is ${evidenceScore} but proof_blocks is empty`,
      });
    }

    const visualAssets = [
      page.hero?.visual_asset,
      ...(page.benefits ?? []).map((item) => item.visual_asset),
    ].filter(Boolean);
    for (const asset of visualAssets) {
      if (asset.approval_status === "approved" || asset.approved_by_owner === true) {
        issues.push({
          field: "self_attested_asset_approval",
          reason_code: "visual_asset_unapproved",
          file: row.file,
          message: "generated artifact contains owner-approval fields; verify against audited owner/gate records",
        });
      }
    }

    const hasAffiliateCta = typeof heroCta === "string" || ctaIds.length > 0;
    const shortDisclosure = page.affiliate_disclosure?.short_disclosure ?? "";
    if (hasAffiliateCta && !/(commission|paid|compensat|earn|referral fee)/i.test(shortDisclosure)) {
      issues.push({
        field: "affiliate_disclosure.short_disclosure",
        reason_code: "weak_affiliate_disclosure",
        file: row.file,
        message: "visible affiliate disclosure should clearly communicate commission, paid, compensated, earn, or referral-fee language",
      });
    }

    for (const [field, value] of renderedTextEntries(page)) {
      const match = INTERNAL_PROCESS_PATTERNS.find((pattern) => pattern.test(value));
      if (match) {
        issues.push({
          field,
          reason_code: "internal_process_as_public_proof",
          file: row.file,
          message: `${field} uses internal process language as public proof (${match.source})`,
        });
      }
      for (const { reason_code, pattern } of RISKY_OVERCLAIM_PATTERNS) {
        if (pattern.test(value)) {
          issues.push({
            field,
            reason_code,
            file: row.file,
            message: `${field} contains claim language that requires claim-level evidence (${pattern.source})`,
          });
          break;
        }
      }
    }
  }
  return issues;
}

function containsTarget(group, target) {
  if (!target) return true;
  return group.files?.includes(target) || group.file === target;
}

function filterPairGroupForTarget(group, target) {
  if (!target) return group;
  const pairs = group.pairs.filter((pair) => pair.files.includes(target));
  if (pairs.length === 0) return null;
  const files = [...new Set(pairs.flatMap((pair) => pair.files))].sort();
  return { ...group, files, pairs };
}

function filterReport(report, target) {
  if (!target) return report;
  return {
    ...report,
    duplicate_groups: report.duplicate_groups.filter((group) => containsTarget(group, target)),
    near_duplicate_groups: report.near_duplicate_groups
      .map((group) => filterPairGroupForTarget(group, target))
      .filter(Boolean),
    composite_fingerprint_groups: report.composite_fingerprint_groups
      .map((group) => filterPairGroupForTarget(group, target))
      .filter(Boolean),
    semantic_pattern_groups: report.semantic_pattern_groups
      .map((group) => filterPairGroupForTarget(group, target))
      .filter(Boolean),
    score_signature_groups: report.score_signature_groups.filter((group) => containsTarget(group, target)),
    score_delta_groups: report.score_delta_groups
      .map((group) => filterPairGroupForTarget(group, target))
      .filter(Boolean),
    artifact_qa_issues: report.artifact_qa_issues.filter((issue) => issue.file === target),
  };
}

function summarize(report) {
  const findingCount =
    report.duplicate_groups.length +
    report.near_duplicate_groups.length +
    report.semantic_pattern_groups.length +
    report.score_delta_groups.length +
    report.artifact_qa_issues.length;
  return {
    duplicate_group_count: report.duplicate_groups.length,
    near_duplicate_group_count: report.near_duplicate_groups.length,
    composite_fingerprint_group_count: report.composite_fingerprint_groups.length,
    semantic_pattern_group_count: report.semantic_pattern_groups.length,
    score_signature_group_count: report.score_signature_groups.length,
    score_delta_group_count: report.score_delta_groups.length,
    artifact_issue_count: report.artifact_qa_issues.length,
    finding_count: findingCount,
  };
}

function buildReport(options) {
  const rows = readJsonFiles(options.targetDir, options.draftInput);
  if (options.target && !rows.some((row) => row.file === options.target)) {
    throw new Error(`Target file not found: ${options.target}`);
  }

  const exactRows = rows.map(extractExactPage);
  const duplicateGroups = [
    ...groupBy(exactRows, "title"),
    ...groupBy(exactRows, "h1"),
    ...groupBy(exactRows, "cta"),
    ...groupBy(exactRows, "firstBenefit"),
    ...groupBy(exactRows, "firstLimitation"),
    ...groupBy(exactRows, "firstFaq"),
    ...groupBy(exactRows, "scores"),
  ];
  const scoreSignatureGroups = duplicateGroups.filter((group) => group.field === "scores");
  const shortGroups = buildPairGroups(findNearShortFieldPairs(rows), {
    type: "short_field_similarity",
    reasonCode: "near_duplicate_copy",
    bucketKey: (pair) => pair.field,
  });
  const compositePairs = findCompositePairs(rows);
  const compositeGroups = buildPairGroups(compositePairs, {
    type: "composite_visible_similarity",
    reasonCode: "near_duplicate_copy",
    bucketKey: () => "composite",
  });
  const semanticGroups = buildPairGroups(findSemanticPairs(rows, compositePairs), {
    type: "semantic_pattern",
    reasonCode: "thin_keyword_swap",
    bucketKey: () => "semantic",
  });
  const scoreDeltaGroups = buildPairGroups(collectScoreDeltas(rows), {
    type: "score_delta_similarity",
    reasonCode: "copied_score_signature",
    bucketKey: () => "quality_scores",
  });

  const report = filterReport({
    schema_version: 1,
    tool: "summarize-page-duplicates",
    input_mode: options.draftInput ? "draft" : "production",
    target_dir: options.targetDir,
    target: options.target,
    status: "pass",
    report_only: options.reportOnly,
    scanned_count: rows.length,
    thresholds: THRESHOLDS,
    duplicate_groups: duplicateGroups,
    near_duplicate_groups: [...shortGroups, ...compositeGroups],
    composite_fingerprint_groups: compositeGroups,
    semantic_pattern_groups: semanticGroups,
    score_signature_groups: scoreSignatureGroups,
    score_delta_groups: scoreDeltaGroups,
    artifact_qa_issues: collectArtifactIssues(rows),
    summary: {},
  }, options.target);

  report.summary = summarize(report);
  report.status = report.summary.finding_count === 0 ? "pass" : "fail";
  return report;
}

function printHumanReport(report) {
  const scope = report.target ? `${report.target_dir} for target ${report.target}` : report.target_dir;
  console.log(`Scanned ${report.scanned_count} landing page artifacts in ${scope}.`);

  if (report.status === "pass") {
    console.log("No duplicate hard-gate fields, near-duplicate patterns, copied score patterns, or artifact QA issues found.");
    return;
  }

  if (report.duplicate_groups.length > 0) console.log(`Found ${report.duplicate_groups.length} duplicate hard-gate group(s):`);
  for (const group of report.duplicate_groups) {
    console.log(`\n[${group.field}] ${group.value}`);
    for (const file of group.files) console.log(`- ${file}`);
  }

  const nonCompositeNearGroups = report.near_duplicate_groups.filter((group) => group.type !== "composite_visible_similarity");
  if (nonCompositeNearGroups.length > 0) console.log(`\nFound ${nonCompositeNearGroups.length} near-duplicate visible-field group(s):`);
  for (const group of nonCompositeNearGroups) {
    console.log(`\n[${group.field}] minimum similarity ${group.min_similarity}`);
    for (const pair of group.pairs) console.log(`- ${pair.files.join(" <-> ")} (${pair.similarity})`);
  }

  if (report.composite_fingerprint_groups.length > 0) console.log(`\nFound ${report.composite_fingerprint_groups.length} composite visible-page similarity group(s):`);
  for (const group of report.composite_fingerprint_groups) {
    console.log(`\n[composite] minimum similarity ${group.min_similarity}`);
    for (const pair of group.pairs) console.log(`- ${pair.files.join(" <-> ")} (${pair.similarity})`);
  }

  if (report.semantic_pattern_groups.length > 0) console.log(`\nFound ${report.semantic_pattern_groups.length} same-product semantic pattern group(s):`);
  for (const group of report.semantic_pattern_groups) {
    console.log(`\n[semantic] ${group.reason_codes.join(", ")}; minimum similarity ${group.min_similarity}`);
    for (const pair of group.pairs) console.log(`- ${pair.files.join(" <-> ")} (${pair.reason_codes.join(", ")})`);
  }

  if (report.score_delta_groups.length > 0) console.log(`\nFound ${report.score_delta_groups.length} near-copied quality-score group(s):`);
  for (const group of report.score_delta_groups) {
    console.log(`\n[scores] max delta ${group.max_delta}, average delta ${group.avg_delta}`);
    for (const pair of group.pairs) console.log(`- ${pair.files.join(" <-> ")} (max delta ${pair.max_delta})`);
  }

  if (report.artifact_qa_issues.length > 0) {
    console.log(`\nFound ${report.artifact_qa_issues.length} artifact QA issue(s):`);
    for (const issue of report.artifact_qa_issues) {
      console.log(`\n[${issue.field}] ${issue.file}`);
      console.log(`- ${issue.message}`);
    }
  }
}

function emitError(error, options) {
  if (options?.json) {
    console.log(JSON.stringify({
      schema_version: 1,
      tool: "summarize-page-duplicates",
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
