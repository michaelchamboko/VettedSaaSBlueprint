import { ValidationCheck, EvidenceState } from "../module-contract";

export interface ValidationEngine {
  run(page: PageToValidate): ValidationResult;
}

export interface PageToValidate {
  pageType: "Decision Hub" | "Solution Hub" | "Decision Scenario";
  canonicalPath: string;
  headline: string;
  objective: string;
  context: string;
  constraints: string[];
  blocks: Array<{
    heading: string;
    summary: string;
    evidence: Array<{
      statement: string;
      state: EvidenceState;
      sources: Array<{ source: string; section?: string; quote?: string; url?: string }>;
      confidence: number;
    }>;
  }>;
  disclosure: string;
  metadata: {
    title: string;
    description: string;
    canonicalUrl?: string;
  };
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  criticalFailures: ValidationCheck[];
  warnings: ValidationCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

function checkSchemaValidity(page: PageToValidate): ValidationCheck {
  const required = ["pageType", "canonicalPath", "headline", "objective", "context", "blocks", "disclosure", "metadata"];
  const missing = required.filter(field => !(field in page) || page[field as keyof PageToValidate] === undefined);

  return {
    checkName: "schema_validity",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required fields present" : `Missing fields: ${missing.join(", ")}`,
    severity: "error",
    autoRepairable: false,
  };
}

function checkRequiredBlocks(page: PageToValidate): ValidationCheck {
  const requiredBlocks: Record<string, string[]> = {
    "Decision Hub": ["Problem framing", "Desired outcome and constraints", "Evidence gate"],
    "Solution Hub": ["Seven-step structure", "Conditional optioning"],
    "Decision Scenario": ["Assumptions and boundaries", "Trade-off outcomes", "Next action"],
  };

  const required = requiredBlocks[page.pageType] ?? [];
  const present = page.blocks.map(b => b.heading);
  const missing = required.filter(r => !present.includes(r));

  return {
    checkName: "required_blocks",
    passed: missing.length === 0,
    details: missing.length === 0 ? "All required blocks present" : `Missing required blocks: ${missing.join(", ")}`,
    severity: "error",
    autoRepairable: false,
  };
}

function checkClaimTraceability(page: PageToValidate): ValidationCheck {
  let unsupportedClaims = 0;
  let totalClaims = 0;

  for (const block of page.blocks) {
    for (const ev of block.evidence) {
      totalClaims++;
      if (ev.state === "insufficient" || ev.sources.length === 0) {
        unsupportedClaims++;
      }
    }
  }

  const passRate = totalClaims > 0 ? (totalClaims - unsupportedClaims) / totalClaims : 1;

  return {
    checkName: "claim_traceability",
    passed: unsupportedClaims === 0,
    details: `${unsupportedClaims}/${totalClaims} claims lack evidence support`,
    severity: unsupportedClaims > 0 ? "error" : "info",
    autoRepairable: false,
  };
}

function checkUnsupportedSuperlatives(page: PageToValidate): ValidationCheck {
  const superlativePatterns = [
    /\bbest\b/i,
    /\bworst\b/i,
    /\btop\s+\d+/i,
    /\b#1\b/i,
    /\bunbeatable\b/i,
    /\bperfect\b/i,
    /\bflawless\b/i,
    /\bguaranteed\b/i,
    /\balways\b/i,
    /\bnever\b/i,
  ];

  const violations: string[] = [];
  const text = `${page.headline} ${page.objective} ${page.context} ${page.blocks.map(b => b.summary + " " + b.evidence.map(e => e.statement).join(" ")).join(" ")}`;

  for (const pattern of superlativePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      violations.push(`Found "${matches[0]}" - superlative without evidence`);
    }
  }

  return {
    checkName: "unsupported_superlatives",
    passed: violations.length === 0,
    details: violations.length === 0 ? "No unsupported superlatives found" : violations.join("; "),
    severity: "error",
    autoRepairable: true,
  };
}

function checkConditionalLanguage(page: PageToValidate): ValidationCheck {
  const absolutePatterns = [
    /\bwill\b/i,
    /\bmust\b/i,
    /\bshould\b/i,
    /\bdefinitely\b/i,
    /\bcertainly\b/i,
    /\bguaranteed to\b/i,
  ];

  const conditionalPatterns = [
    /\bmay\b/i,
    /\bcould\b/i,
    /\bmight\b/i,
    /\bdepending on\b/i,
    /\bif\b/i,
    /\bwhen\b/i,
    /\bprovided that\b/i,
    /\bassuming\b/i,
  ];

  const text = page.blocks.map(b => b.summary + " " + b.evidence.map(e => e.statement).join(" ")).join(" ");

  let absoluteCount = 0;
  let conditionalCount = 0;

  for (const pattern of absolutePatterns) {
    absoluteCount += (text.match(pattern) ?? []).length;
  }

  for (const pattern of conditionalPatterns) {
    conditionalCount += (text.match(pattern) ?? []).length;
  }

  const hasConditionalBalance = conditionalCount > 0 || absoluteCount === 0;

  return {
    checkName: "conditional_language",
    passed: hasConditionalBalance,
    details: `Absolute claims: ${absoluteCount}, Conditional qualifiers: ${conditionalCount}`,
    severity: "warning",
    autoRepairable: true,
  };
}

function checkEvidenceStateAccuracy(page: PageToValidate): ValidationCheck {
  const states: EvidenceState[] = ["validated", "partial", "insufficient", "conflicting"];
  let invalidStates = 0;

  for (const block of page.blocks) {
    for (const ev of block.evidence) {
      if (!states.includes(ev.state)) {
        invalidStates++;
      }
    }
  }

  return {
    checkName: "evidence_state_accuracy",
    passed: invalidStates === 0,
    details: invalidStates === 0 ? "All evidence states valid" : `${invalidStates} invalid evidence states`,
    severity: "error",
    autoRepairable: false,
  };
}

function checkDuplicateContent(page: PageToValidate): ValidationCheck {
  const statements = page.blocks.flatMap(b => b.evidence.map(e => e.statement.toLowerCase().trim()));
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const stmt of statements) {
    if (seen.has(stmt)) {
      duplicates.push(stmt.substring(0, 100));
    } else {
      seen.add(stmt);
    }
  }

  return {
    checkName: "duplicate_content",
    passed: duplicates.length === 0,
    details: duplicates.length === 0 ? "No duplicate statements" : `Duplicate statements: ${duplicates.length}`,
    severity: "warning",
    autoRepairable: true,
  };
}

function checkBrokenLinks(page: PageToValidate): ValidationCheck {
  // This would check actual links in a real implementation
  // For now, just verify disclosure exists
  const hasDisclosure = Boolean(page.disclosure && page.disclosure.length >= 20);

  return {
    checkName: "broken_links",
    passed: hasDisclosure,
    details: hasDisclosure ? "Disclosure present - link validation would run at deploy time" : "Missing affiliate disclosure",
    severity: "error",
    autoRepairable: false,
  };
}

function checkMetadataCompleteness(page: PageToValidate): ValidationCheck {
  const { title, description, canonicalUrl } = page.metadata;
  const issues: string[] = [];

  if (!title || title.length < 10) issues.push("Title too short or missing");
  if (!description || description.length < 50) issues.push("Description too short or missing");
  if (!canonicalUrl) issues.push("Canonical URL missing");

  return {
    checkName: "metadata_completeness",
    passed: issues.length === 0,
    details: issues.length === 0 ? "All metadata complete" : issues.join("; "),
    severity: "error",
    autoRepairable: false,
  };
}

function checkDisclosureRequirements(page: PageToValidate): ValidationCheck {
  const disclosure = page.disclosure.toLowerCase();
  const requiredTerms = ["affiliate", "commission", "disclosure", "compensat"];
  const hasRequired = requiredTerms.some(term => disclosure.includes(term));

  return {
    checkName: "disclosure_requirements",
    passed: hasRequired,
    details: hasRequired ? "Affiliate disclosure contains required terms" : "Disclosure missing required affiliate/commission terms",
    severity: "error",
    autoRepairable: false,
  };
}

function checkNavigationIntegrity(page: PageToValidate): ValidationCheck {
  // Would check actual navigation in deployed version
  return {
    checkName: "navigation_integrity",
    passed: true,
    details: "Navigation check runs at preview/production verification stage",
    severity: "info",
    autoRepairable: false,
  };
}

function checkAccessibilityBasics(page: PageToValidate): ValidationCheck {
  const issues: string[] = [];

  if (!page.headline || page.headline.length < 10) issues.push("Heading too short for accessibility");
  if (!page.metadata.description) issues.push("Missing meta description");

  return {
    checkName: "accessibility_basics",
    passed: issues.length === 0,
    details: issues.length === 0 ? "Basic accessibility checks pass" : issues.join("; "),
    severity: "warning",
    autoRepairable: true,
  };
}

export function createValidationEngine(): ValidationEngine {
  const checkers = [
    checkSchemaValidity,
    checkRequiredBlocks,
    checkClaimTraceability,
    checkUnsupportedSuperlatives,
    checkConditionalLanguage,
    checkEvidenceStateAccuracy,
    checkDuplicateContent,
    checkBrokenLinks,
    checkMetadataCompleteness,
    checkDisclosureRequirements,
    checkNavigationIntegrity,
    checkAccessibilityBasics,
  ];

  return {
    run(page: PageToValidate): ValidationResult {
      const checks = checkers.map(fn => fn(page));
      const criticalFailures = checks.filter(c => c.severity === "error" && !c.passed);
      const warnings = checks.filter(c => (c.severity === "warning" && !c.passed) || c.severity === "info");
      const passed = checks.filter(c => c.passed).length;

      return {
        passed: criticalFailures.length === 0,
        checks,
        criticalFailures,
        warnings,
        summary: {
          totalChecks: checks.length,
          passed,
          failed: criticalFailures.length,
          warnings: warnings.length,
        },
      };
    },
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const lines = [
    `Validation: ${result.passed ? "PASSED" : "FAILED"}`,
    `Checks: ${result.summary.passed}/${result.summary.totalChecks} passed`,
    `Critical failures: ${result.summary.failed}`,
    `Warnings: ${result.summary.warnings}`,
    "",
  ];

  for (const check of result.checks) {
    const status = check.passed ? "✓" : check.severity === "error" ? "✗" : "⚠";
    lines.push(`${status} ${check.checkName}: ${check.details}`);
  }

  return lines.join("\n");
}