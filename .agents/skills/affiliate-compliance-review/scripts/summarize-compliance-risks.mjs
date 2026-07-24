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

const ISSUE_ARRAYS = [
  "disclosure_issues",
  "claim_issues",
  "evidence_issues",
  "partnerstack_issues",
  "destination_issues",
  "artifact_qa_issues",
  "renderer_static_issues",
];

const ALLOWED_AFFILIATE_HOSTS = new Set([
  "aff.flowith.io",
  "get.cloudtalk.io",
  "grow.amplemarket.com",
  "join.rankprompt.com",
  "partners.browse.ai",
  "try.elevenlabs.io",
  "try.landingi.com",
  "try.leadpages.com",
  "trymoo.moosend.com",
]);

const DISCLOSURE_TERMS = /\b(commission|paid|compensat(?:ed|ion)?|earn|referral fee|referral commission)\b/i;
const WEAK_DISCLOSURE_PATTERNS = [
  /\baffiliate links?\b/i,
  /\bcommissionable link\b/i,
  /\bpartner links?\b/i,
  /\bsponsored links?\b/i,
  /\bsupport us\b/i,
  /\bmay include affiliate links?\b/i,
  /\bif (?:a |an )?(?:reviewed )?offer is attached\b/i,
];
const CONDITIONAL_DISCLOSURE = /\b(?:may|might|could)\s+include\s+(?:affiliate|referral|partner|sponsored)?\s*links?\b|\bif (?:a |an )?(?:reviewed )?offer is attached\b/i;

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
  /manual owner approval/i,
  /publication controls?/i,
];

const RISK_PATTERNS = [
  {
    reason_code: "unsupported_sensitive_claim",
    risk_type: "pricing_offer",
    pattern: /(?:\$|USD|\/mo\b|per month|annual|lifetime|% off|discount|coupon|deal|free trial|refund|money[-\s]?back|guarantee|guaranteed|cancel(?:lation)?)/i,
    required_fix: "Remove the offer/pricing claim or attach current claim-level evidence, destination match, program permission, and independent release authorization.",
  },
  {
    reason_code: "unsupported_sensitive_claim",
    risk_type: "ranking_comparison",
    pattern: /(?:#\s*1|no\.?\s*1|number one|\bbest\b|\btop\b|\bleading\b|better than|beats\b|outperform|superior|winner|alternative to|\bvs\.?\b|versus|direct comparison)/i,
    required_fix: "Remove ranking/comparison language or provide approved methodology and claim-level evidence.",
  },
  {
    reason_code: "unsupported_sensitive_claim",
    risk_type: "security_privacy",
    pattern: /(?:SOC\s*2|ISO\s*27001|GDPR|HIPAA|CCPA|\bsecure\b|security|privacy|encrypted|compliant|compliance|audit|SSO|data residency)/i,
    required_fix: "Remove security/privacy/compliance claims or attach current approved source evidence.",
  },
  {
    reason_code: "review_basis_overclaim",
    risk_type: "review_basis",
    pattern: /(?:independent|trusted|verified|tested|hands[-\s]?on|recommended|evidence[-\s]?backed|proven|our tests?|we tested|our experience|unbiased)/i,
    required_fix: "Rewrite review-basis language or attach an audited review-basis/evidence record.",
  },
  {
    reason_code: "fake_review_or_social_proof_risk",
    risk_type: "social_proof",
    pattern: /(?:\b[1-5](?:\.\d)?\s*stars?\b|ratings?|review counts?|reviews say|users love|trusted by|customers?|case stud(?:y|ies)|testimonial|happy users?|happy customers?)/i,
    required_fix: "Remove social-proof language or attach genuine, usage-allowed, claim-level proof.",
  },
  {
    reason_code: "unsupported_sensitive_claim",
    risk_type: "urgency_scarcity",
    pattern: /(?:only today|limited time|last chance|expires|hurry|spots left|seats left|countdown|while supplies last|lock in this price)/i,
    required_fix: "Remove urgency/scarcity language unless verified, freshness-dated, program-permitted, and approved.",
  },
];

const NEUTRAL_PRICING_CAVEATS = [
  /confirm (?:the )?(?:latest |current )?(?:pricing|details|terms)/i,
  /check (?:the )?(?:latest |current )?(?:pricing|details|terms)/i,
  /review (?:the )?(?:latest |current |today's )?(?:plans|pricing|trial details|terms)/i,
  /visit (?:the )?official (?:pricing page|site|destination)/i,
  /pricing and terms can change/i,
  /vendor pricing and terms can change/i,
  /see (?:the )?(?:current )?offer/i,
];

const SELF_ATTESTED_KEY_PATTERNS = [
  /approved_by_owner$/i,
  /approved_by$/i,
  /approval_status$/i,
  /published_at$/i,
  /compliance_pass$/i,
  /publishable$/i,
  /owner_override$/i,
  /affiliate_link_status$/i,
  /link_status$/i,
];

const SELF_ATTESTED_STATUS_VALUES = new Set([
  "approved",
  "published",
  "active",
  "complete",
  "reviewed",
  "passed",
]);

function readTextIfAvailable(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

const DIRECT_REVIEW_COMPONENT_SOURCE = readTextIfAvailable("src/components/landing/DirectReviewPage.tsx");

function rendererMarksAffiliateLinksSponsored() {
  return /rel=["'](?:nofollow\s+sponsored|sponsored\s+nofollow|sponsored)["']/.test(DIRECT_REVIEW_COMPONENT_SOURCE);
}

function parseArgs(argv) {
  const options = {
    targetDir: undefined,
    target: null,
    json: false,
    reportOnly: false,
    draftInput: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--report-only") {
      options.reportOnly = true;
    } else if (arg === "--draft-input") {
      options.draftInput = true;
    } else if (arg === "--target") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--target requires a filename");
      options.target = safeTargetName(value);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      options.target = safeTargetName(arg.slice("--target=".length));
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!options.targetDir) {
      options.targetDir = arg;
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }
  }

  options.targetDir ??= "src/generated/landing-pages";
  return options;
}

function safeTargetName(value) {
  const name = basename(value);
  if (!name.endsWith(".json")) throw new Error("--target must be a JSON filename");
  if (name === "index.json") throw new Error("--target cannot be index.json");
  return name;
}

function readJsonFiles(dir, draftInput = false) {
  if (!existsSync(dir)) return [];
  if (draftInput) {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json") && name !== "index.json")
      .sort()
      .map((name) => ({ file: name, data: JSON.parse(readFileSync(join(dir, name), "utf8")) }));
  }
  const manifest = readIndexManifest(dir);
  const approvedFiles = new Set((manifest?.pages ?? [])
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

function readIndexManifest(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Failed to parse index.json: ${error.message}`);
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAffiliateCta(page) {
  return Boolean(page.hero?.primary_cta_link_id || (page.cta_blocks ?? []).some((cta) => cta?.affiliate_link_id));
}

function createIssue({ file, input_path, category, reason_code, message, required_fix, severity = "blocker", evidence = {} }) {
  return { file, input_path, category, severity, reason_code, message, required_fix, evidence };
}

function addIssue(arrays, issue) {
  arrays[issue.category].push(issue);
}

function collectIds(page) {
  const ids = [
    ["metadata.product_id", page.metadata?.product_id],
    ["hero.primary_cta_link_id", page.hero?.primary_cta_link_id],
  ];

  for (const [index, item] of (page.cta_blocks ?? []).entries()) {
    ids.push([`cta_blocks.${index}.affiliate_link_id`, item.affiliate_link_id]);
  }
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
  for (const [index, item] of (page.faq ?? []).entries()) {
    for (const id of item.source_reference_ids ?? []) ids.push([`faq.${index}.source_reference_ids`, id]);
  }

  return ids.filter(([, value]) => typeof value === "string" && value.trim());
}

function isLikelyPlaceholderUuid(value) {
  if (typeof value !== "string") return false;
  const normalized = value.toLowerCase().replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(normalized)) return false;
  if (/^0{32}$/.test(normalized)) return true;
  if (normalized === "550e8400e29b41d4a716446655440000") return true;
  const counts = [...normalized].reduce((acc, char) => {
    acc[char] = (acc[char] ?? 0) + 1;
    return acc;
  }, {});
  return Math.max(...Object.values(counts)) >= 24;
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
    ["problem_solution.agitation", page.problem_solution?.agitation],
    ["problem_solution.solution", page.problem_solution?.solution],
  ];

  for (const [index, item] of (page.benefits ?? []).entries()) {
    entries.push([`benefits.${index}.benefit_title`, item.benefit_title]);
    entries.push([`benefits.${index}.benefit_description`, item.benefit_description]);
    entries.push([`benefits.${index}.feature_supporting_it`, item.feature_supporting_it]);
  }
  for (const [index, item] of (page.how_it_works ?? []).entries()) {
    entries.push([`how_it_works.${index}.title`, item.title]);
    entries.push([`how_it_works.${index}.description`, item.description]);
  }
  for (const [index, item] of (page.limitations ?? []).entries()) {
    entries.push([`limitations.${index}.limitation`, item.limitation]);
    entries.push([`limitations.${index}.who_it_affects`, item.who_it_affects]);
    entries.push([`limitations.${index}.mitigation`, item.mitigation]);
  }
  for (const [index, item] of (page.cta_blocks ?? []).entries()) {
    entries.push([`cta_blocks.${index}.label`, item.label]);
    entries.push([`cta_blocks.${index}.supporting_text`, item.supporting_text]);
  }
  for (const [index, item] of (page.faq ?? []).entries()) {
    entries.push([`faq.${index}.question`, item.question]);
    entries.push([`faq.${index}.answer`, item.answer]);
  }

  return entries
    .map(([path, value]) => [path, normalizeText(value)])
    .filter(([, value]) => value);
}

function proofTextEntries(page) {
  const entries = [];
  for (const [index, item] of (page.proof_blocks ?? []).entries()) {
    entries.push([`proof_blocks.${index}.proof_type`, item.proof_type]);
    entries.push([`proof_blocks.${index}.summary`, item.summary]);
  }
  return entries
    .map(([path, value]) => [path, normalizeText(value)])
    .filter(([, value]) => value);
}

function isNeutralPricingCaveat(value) {
  if (!NEUTRAL_PRICING_CAVEATS.some((pattern) => pattern.test(value))) return false;
  return !/(?:\$|USD|% off|discount|coupon|free trial|refund|money[-\s]?back|guarantee|guaranteed|only today|limited time|lock in this price)/i.test(value);
}

function isNegatedSocialProofSafetyStatement(value) {
  const guard = /\b(no|not|never|without|avoid|avoids|avoiding|block|blocks|blocked|exclude|excludes|excluding|not by default)\b/i;
  const socialProof = /\b(ratings?|stars?|testimonials?|review counts?|social proof|fake screenshots?|screenshots?)\b/i;
  return guard.test(value) && socialProof.test(value);
}

function scanDisclosure(row, arrays) {
  const page = row.data;
  if (!hasAffiliateCta(page)) return;

  const placement = page.affiliate_disclosure?.placement;
  const shortDisclosure = normalizeText(page.affiliate_disclosure?.short_disclosure);

  if (!shortDisclosure) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "affiliate_disclosure.short_disclosure",
      category: "disclosure_issues",
      reason_code: "missing_visible_disclosure",
      message: "Affiliate CTA exists but visible short disclosure is missing.",
      required_fix: "Add visible pre-CTA disclosure that clearly states commission/paid/referral-fee relationship.",
    }));
  }

  if (placement !== "above_first_cta") {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "affiliate_disclosure.placement",
      category: "disclosure_issues",
      reason_code: "disclosure_not_before_first_cta",
      message: `Disclosure placement is ${JSON.stringify(placement)} instead of above_first_cta.`,
      required_fix: "Place visible disclosure before or near the first affiliate CTA on mobile and desktop.",
      evidence: { value: placement },
    }));
  }

  const hasMaterialConnection = DISCLOSURE_TERMS.test(shortDisclosure);
  const weakAffiliateOnly = /\baffiliate links?\b/i.test(shortDisclosure) && !hasMaterialConnection;
  const conditional = CONDITIONAL_DISCLOSURE.test(shortDisclosure);
  const weakPattern = WEAK_DISCLOSURE_PATTERNS.find((pattern) => pattern.test(shortDisclosure));
  if (shortDisclosure && (!hasMaterialConnection || weakAffiliateOnly || conditional)) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "affiliate_disclosure.short_disclosure",
      category: "disclosure_issues",
      reason_code: "weak_affiliate_disclosure",
      message: "Visible short disclosure is weak or conditional for an affiliate CTA.",
      required_fix: "Use plain language such as: Disclosure: We may earn a commission if you buy through links on this page, at no extra cost to you.",
      evidence: { value: shortDisclosure, matched_pattern: weakPattern?.source ?? null },
    }));
  }
}

function scanCta(row, arrays) {
  const page = row.data;
  const heroId = page.hero?.primary_cta_link_id;
  const ctaIds = (page.cta_blocks ?? []).map((cta) => cta?.affiliate_link_id).filter(Boolean);

  if (hasAffiliateCta(page) && !heroId) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "hero.primary_cta_link_id",
      category: "partnerstack_issues",
      reason_code: "unresolved_affiliate_link",
      message: "Affiliate CTA exists but hero primary CTA link id is missing.",
      required_fix: "Use a reviewed affiliate link id or remove the affiliate CTA.",
    }));
  }

  const mismatches = ctaIds.filter((id) => id !== heroId);
  if (mismatches.length > 0) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "cta_blocks[].affiliate_link_id",
      category: "partnerstack_issues",
      reason_code: "cta_id_mismatch",
      message: "Hero CTA id differs from CTA block affiliate id.",
      required_fix: "Use the reviewed affiliate link id consistently or provide an audited mapping.",
      evidence: { hero_primary_cta_link_id: heroId, cta_block_affiliate_link_ids: ctaIds },
    }));
  }
}

function scanIds(row, arrays) {
  for (const [inputPath, value] of collectIds(row.data)) {
    if (!isLikelyPlaceholderUuid(value)) continue;
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: inputPath,
      category: "artifact_qa_issues",
      reason_code: "placeholder_or_self_attested_record",
      message: `${inputPath} looks like a placeholder/test UUID.`,
      required_fix: "Replace placeholder IDs with audited source-of-truth records before publication readiness.",
      evidence: { value },
    }));
  }
}

function walk(value, visitor, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, path ? `${path}.${index}` : String(index)));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      visitor(key, child, childPath);
      walk(child, visitor, childPath);
    }
  }
}

function isSelfAttestedState(key, value) {
  if (!SELF_ATTESTED_KEY_PATTERNS.some((pattern) => pattern.test(key))) return false;
  if (value === true) return true;
  if (typeof value === "string" && SELF_ATTESTED_STATUS_VALUES.has(value.toLowerCase())) return true;
  return false;
}

function scanSelfAttestation(row, arrays) {
  walk(row.data, (key, value, inputPath) => {
    if (!isSelfAttestedState(key, value)) return;
    const reasonCode = /visual_asset|approval_status|approved_by_owner/i.test(inputPath)
      ? "visual_asset_unapproved"
      : "self_attested_approval";
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: inputPath,
      category: "artifact_qa_issues",
      reason_code: reasonCode,
      message: `${inputPath} self-attests approval or source-of-truth state inside generated JSON.`,
      required_fix: "Remove generated self-attestation and resolve the state from independent audited gate records.",
      evidence: { value },
    }));
  });
}

function scanIndexManifest(manifest, knownFiles, arrays) {
  const pages = Array.isArray(manifest?.pages) ? manifest.pages : [];
  for (const [index, entry] of pages.entries()) {
    const artifact = typeof entry?.artifact === "string" ? basename(entry.artifact) : null;
    if (!artifact || !knownFiles.has(artifact)) continue;
    const hasAuditedProvenance = entry.published_at
      && entry.current_version_id
      && ((entry.publication_source === "oracle_dynamic_pages" && entry.owner_publish_audit_id)
        || (entry.publication_source === "agent_verified_release" && entry.release_receipt));
    if (!hasAuditedProvenance && typeof entry.status === "string" && SELF_ATTESTED_STATUS_VALUES.has(entry.status.toLowerCase())) {
      addIssue(arrays, createIssue({
        file: artifact,
        input_path: `index.json.pages.${index}.status`,
        category: "artifact_qa_issues",
        reason_code: "self_attested_approval",
        message: `index.json self-attests ${entry.status} state for generated artifact ${artifact}.`,
        required_fix: "Resolve publication state from an independent audited release receipt, not the generated page.",
        evidence: { value: entry.status },
      }));
    }
  }
}

function proofBlockHasResolvedIds(proof) {
  return Boolean(
    proof?.source_reference_id &&
      !isLikelyPlaceholderUuid(proof.source_reference_id) &&
      proof?.evidence_claim_id &&
      !isLikelyPlaceholderUuid(proof.evidence_claim_id),
  );
}

function scanScoresAndProof(row, arrays) {
  const page = row.data;
  const scores = page.quality_scores ?? {};
  const proofBlocks = Array.isArray(page.proof_blocks) ? page.proof_blocks : [];
  const evidenceScore = Number(scores.evidence_score ?? 0);
  const complianceScore = Number(scores.compliance_score ?? 0);

  if (evidenceScore < 70) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "quality_scores.evidence_score",
      category: "evidence_issues",
      reason_code: "claim_evidence_unresolved",
      message: `Evidence score ${evidenceScore} is below the publication threshold.`,
      required_fix: "Improve evidence or keep the page blocked.",
      evidence: { value: evidenceScore },
    }));
  }

  if (evidenceScore >= 70 && proofBlocks.length === 0) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "proof_blocks",
      category: "evidence_issues",
      reason_code: "evidence_score_without_proof",
      message: `Evidence score is ${evidenceScore} but proof_blocks is empty.`,
      required_fix: "Add claim-level proof blocks backed by audited evidence records or lower the score.",
      evidence: { evidence_score: evidenceScore },
    }));
  }

  if (evidenceScore >= 70 && proofBlocks.length > 0) {
    for (const [index, proof] of proofBlocks.entries()) {
      if (proofBlockHasResolvedIds(proof)) continue;
      addIssue(arrays, createIssue({
        file: row.file,
        input_path: `proof_blocks.${index}`,
        category: "evidence_issues",
        reason_code: "claim_evidence_unresolved",
        message: "Proof block lacks resolved source/evidence claim IDs.",
        required_fix: "Resolve proof block to current usage-allowed source and approved evidence claim records.",
        evidence: {
          source_reference_id: proof?.source_reference_id ?? null,
          evidence_claim_id: proof?.evidence_claim_id ?? null,
        },
      }));
    }
  }

  if (complianceScore < 80) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "quality_scores.compliance_score",
      category: "evidence_issues",
      reason_code: "inflated_or_copied_scores",
      message: `Compliance score ${complianceScore} is below the publication threshold.`,
      required_fix: "Resolve compliance blockers before publication readiness.",
      evidence: { value: complianceScore },
    }));
  }

  if (complianceScore >= 80 && hasAffiliateCta(page)) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "quality_scores.compliance_score",
      category: "evidence_issues",
      reason_code: "inflated_or_copied_scores",
      message: "High compliance score cannot prove program rules, link state, destination review, or release authorization.",
      required_fix: "Resolve external compliance/profile/program/link/destination records; do not rely on generated scores.",
      severity: "warning",
      evidence: { value: complianceScore },
    }));
  }

  for (const [inputPath, value] of proofTextEntries(page)) {
    const internal = INTERNAL_PROCESS_PATTERNS.find((pattern) => pattern.test(value));
    if (!internal) continue;
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: inputPath,
      category: "evidence_issues",
      reason_code: "internal_process_as_public_proof",
      message: `${inputPath} uses internal workflow proof as product/offer proof.`,
      required_fix: "Replace internal process proof with external product/source evidence or keep it out of public proof.",
      evidence: { value, matched_pattern: internal.source },
    }));
  }
}

function scanClaims(row, arrays) {
  for (const [inputPath, value] of renderedTextEntries(row.data)) {
    const internal = INTERNAL_PROCESS_PATTERNS.find((pattern) => pattern.test(value));
    if (internal) {
      addIssue(arrays, createIssue({
        file: row.file,
        input_path: inputPath,
        category: "claim_issues",
        reason_code: "internal_process_as_public_proof",
        message: `${inputPath} uses internal workflow proof in public copy.`,
        required_fix: "Rewrite public copy around visitor-relevant product facts, limitations, or destination checks.",
        evidence: { value, matched_pattern: internal.source },
      }));
    }

    for (const risk of RISK_PATTERNS) {
      if (!risk.pattern.test(value)) continue;
      if (risk.risk_type === "pricing_offer" && isNeutralPricingCaveat(value)) continue;
      if (risk.risk_type === "social_proof" && isNegatedSocialProofSafetyStatement(value)) continue;
      addIssue(arrays, createIssue({
        file: row.file,
        input_path: inputPath,
        category: "claim_issues",
        reason_code: risk.reason_code,
        message: `${inputPath} contains ${risk.risk_type} claim language requiring claim-level evidence.`,
        required_fix: risk.required_fix,
        evidence: { value, matched_pattern: risk.pattern.source },
      }));
      break;
    }
  }
}

function isApprovedAffiliateUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "partnerstack.com" ||
      host.endsWith(".partnerstack.com") ||
      host === "psref.com" ||
      host.endsWith(".psref.com") ||
      ALLOWED_AFFILIATE_HOSTS.has(host)
    );
  } catch {
    return false;
  }
}

function scanEmbeddedLinkState(row, arrays, draftInput = false) {
  const links = [];
  walk(row.data, (key, value, inputPath) => {
    if (typeof value !== "string") return;
    if (!/(partnerstack_url|affiliate_url|referral_url)$/i.test(key)) return;
    links.push({ inputPath, value });
  });

  for (const link of links) {
    if (!isApprovedAffiliateUrl(link.value)) {
      addIssue(arrays, createIssue({
        file: row.file,
        input_path: link.inputPath,
        category: "partnerstack_issues",
        reason_code: "partnerstack_url_not_preserved",
        message: `${link.inputPath} is not an approved HTTPS PartnerStack/referral URL.`,
        required_fix: "Preserve the original approved referral URL and tracking parameters.",
        evidence: { value: link.value },
      }));
    }
  }

  if (hasAffiliateCta(row.data) && !draftInput) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "cta_blocks",
      category: "partnerstack_issues",
      reason_code: "partnerstack_url_integrity_unknown",
      message: "Generated artifact cannot prove active affiliate link state or original referral URL preservation.",
      required_fix: "Resolve affiliate link state from audited records before publication readiness.",
    }));
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "cta_blocks",
      category: "partnerstack_issues",
      reason_code: "program_rules_unknown",
      message: "Generated artifact cannot prove PartnerStack program rules or offer restrictions.",
      required_fix: "Review program rules, coupon/discount restrictions, deep-link permission, and disclosure requirements.",
    }));
  }
}

function scanDestinationAndRenderer(row, arrays, draftInput = false) {
  if (!hasAffiliateCta(row.data)) return;
  if (!draftInput) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "destination_review",
      category: "destination_issues",
      reason_code: "destination_review_missing",
      message: "Generated artifact cannot prove current destination review or audited owner override.",
      required_fix: "Attach a current destination review or audited owner override before publication readiness.",
    }));
  }
  if (!rendererMarksAffiliateLinksSponsored()) {
    addIssue(arrays, createIssue({
      file: row.file,
      input_path: "renderer.primary_cta",
      category: "renderer_static_issues",
      reason_code: "renderer_missing_rel_sponsored",
      message: "Static renderer source does not prove affiliate CTA includes rel=\"sponsored\".",
      required_fix: "Verify rendered/static output qualifies paid affiliate links with rel=\"sponsored\" before publication.",
    }));
  }
}

function scanPage(row, draftInput = false) {
  const arrays = Object.fromEntries(ISSUE_ARRAYS.map((name) => [name, []]));
  scanDisclosure(row, arrays);
  scanCta(row, arrays);
  scanIds(row, arrays);
  scanSelfAttestation(row, arrays);
  scanScoresAndProof(row, arrays);
  scanClaims(row, arrays);
  scanEmbeddedLinkState(row, arrays, draftInput);
  scanDestinationAndRenderer(row, arrays, draftInput);
  return arrays;
}

function issueCount(issueArrays, includeWarnings = true) {
  return Object.values(issueArrays)
    .flat()
    .filter((issue) => includeWarnings || issue.severity !== "warning")
    .length;
}

function reasonCodes(issueArrays) {
  return [...new Set(Object.values(issueArrays).flat().map((issue) => issue.reason_code))].sort();
}

function mergeIssueArrays(target, source) {
  for (const name of ISSUE_ARRAYS) target[name].push(...source[name]);
}

function issueArraysForFile(issueArrays, file) {
  return Object.fromEntries(ISSUE_ARRAYS.map((name) => [name, issueArrays[name].filter((issue) => issue.file === file)]));
}

function scoreSignature(page) {
  const scores = page.quality_scores ?? {};
  return SCORE_KEYS.map((key) => `${key}:${scores[key] ?? ""}`).join("|");
}

function findScoreSignatureGroups(rows) {
  const groups = new Map();
  for (const row of rows) {
    const signature = scoreSignature(row.data);
    if (!signature.replace(/[^0-9]/g, "")) continue;
    const group = groups.get(signature) ?? { type: "score_signature", reason_code: "inflated_or_copied_scores", value: signature, files: [] };
    group.files.push(row.file);
    groups.set(signature, group);
  }
  return [...groups.values()].filter((group) => group.files.length > 1);
}

function filterForTarget(report, target) {
  if (!target) return report;
  const issueArrays = {};
  for (const name of ISSUE_ARRAYS) {
    issueArrays[name] = report.issue_arrays[name].filter((issue) => issue.file === target);
  }
  return {
    ...report,
    status: "pass",
    publish_readiness: "eligible_for_conversion_review",
    reason_codes: reasonCodes(issueArrays),
    issue_arrays: issueArrays,
    duplicate_like_risk_groups: report.duplicate_like_risk_groups.filter((group) => group.files.includes(target)),
    files: report.files.filter((file) => file.file === target),
    summary: {},
  };
}

function summarize(report) {
  const summary = {
    disclosure_issue_count: report.issue_arrays.disclosure_issues.length,
    claim_issue_count: report.issue_arrays.claim_issues.length,
    evidence_issue_count: report.issue_arrays.evidence_issues.length,
    partnerstack_issue_count: report.issue_arrays.partnerstack_issues.length,
    destination_issue_count: report.issue_arrays.destination_issues.length,
    artifact_qa_issue_count: report.issue_arrays.artifact_qa_issues.length,
    renderer_static_issue_count: report.issue_arrays.renderer_static_issues.length,
    duplicate_like_group_count: report.duplicate_like_risk_groups.length,
    blocker_count: issueCount(report.issue_arrays, false),
    finding_count: issueCount(report.issue_arrays, true) + report.duplicate_like_risk_groups.length,
  };
  return summary;
}

function buildReport(options) {
  const rows = readJsonFiles(options.targetDir, options.draftInput);
  const manifest = options.draftInput ? null : readIndexManifest(options.targetDir);
  if (options.target && !rows.some((row) => row.file === options.target)) {
    throw new Error(`Target file not found: ${options.target}`);
  }

  const allIssueArrays = Object.fromEntries(ISSUE_ARRAYS.map((name) => [name, []]));
  for (const row of rows) {
    const pageIssues = scanPage(row, options.draftInput);
    mergeIssueArrays(allIssueArrays, pageIssues);
  }
  scanIndexManifest(manifest, new Set(rows.map((row) => row.file)), allIssueArrays);
  const fileSummaries = rows.map((row) => {
    const pageIssues = issueArraysForFile(allIssueArrays, row.file);
    return {
      file: row.file,
      status: issueCount(pageIssues, false) === 0 ? "pass" : "fail",
      reason_codes: reasonCodes(pageIssues),
      blocker_count: issueCount(pageIssues, false),
      finding_count: issueCount(pageIssues, true),
    };
  });

  const report = filterForTarget({
    schema_version: 1,
    tool: "summarize-compliance-risks",
    input_mode: options.draftInput ? "draft" : "production",
    status: "pass",
    publish_readiness: "eligible_for_conversion_review",
    target_dir: options.targetDir,
    target: options.target,
    report_only: options.reportOnly,
    scanned_count: rows.length,
    reason_codes: reasonCodes(allIssueArrays),
    issue_arrays: allIssueArrays,
    duplicate_like_risk_groups: findScoreSignatureGroups(rows),
    files: fileSummaries,
    summary: {},
  }, options.target);

  report.summary = summarize(report);
  report.status = report.summary.blocker_count === 0 && report.duplicate_like_risk_groups.length === 0 ? "pass" : "fail";
  report.publish_readiness = report.status === "pass"
    ? "eligible_for_conversion_review"
    : "blocked";
  report.reason_codes = [...new Set([
    ...reasonCodes(report.issue_arrays),
    ...report.duplicate_like_risk_groups.map((group) => group.reason_code),
  ])].sort();
  return report;
}

function printHumanReport(report) {
  const scope = report.target ? `${report.target_dir} for target ${report.target}` : report.target_dir;
  console.log(`Scanned ${report.scanned_count} landing page artifact(s) in ${scope}.`);
  console.log(`Status: ${report.status}; publish readiness: ${report.publish_readiness}.`);

  if (report.status === "pass") {
    console.log("No deterministic compliance blockers found. Independent release gates must still verify external source-of-truth records.");
    return;
  }

  for (const name of ISSUE_ARRAYS) {
    const issues = report.issue_arrays[name];
    if (issues.length === 0) continue;
    console.log(`\n${name}: ${issues.length}`);
    for (const issue of issues) {
      console.log(`- [${issue.reason_code}] ${issue.file} ${issue.input_path}: ${issue.message}`);
    }
  }

  if (report.duplicate_like_risk_groups.length > 0) {
    console.log(`\nduplicate_like_risk_groups: ${report.duplicate_like_risk_groups.length}`);
    for (const group of report.duplicate_like_risk_groups) {
      console.log(`- [${group.reason_code}] ${group.files.join(", ")}`);
    }
  }
}

function emitError(error, options) {
  if (options?.json) {
    console.log(JSON.stringify({
      schema_version: 1,
      tool: "summarize-compliance-risks",
      status: "error",
      publish_readiness: "blocked",
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
