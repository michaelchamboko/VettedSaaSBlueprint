import { createHash } from "node:crypto";

export type ApprovedUrlEntry = {
  exactUrl: string;
  line: number;
  sha256: string;
};

export type ApprovedUrlsManifest = {
  digest: string;
  entries: ApprovedUrlEntry[];
};

export type ApprovedUrlsDelta = {
  additions: ApprovedUrlEntry[];
  bulkRevocationBlocked: boolean;
  removals: ApprovedUrlEntry[];
  retained: ApprovedUrlEntry[];
};

export type ApprovedUrlsDiffOptions = {
  allowBulkRevocation?: boolean;
};

export class ApprovedUrlsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovedUrlsParseError";
  }
}

const BULLET_URL = /^\s*-\s+(https:\/\/\S+)\s*$/;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateExactUrl(exactUrl: string, line: number): void {
  let parsed: URL;

  try {
    parsed = new URL(exactUrl);
  } catch {
    throw new ApprovedUrlsParseError(`Line ${line}: URL is invalid.`);
  }

  if (parsed.protocol !== "https:") {
    throw new ApprovedUrlsParseError(`Line ${line}: only HTTPS URLs are allowed.`);
  }

  if (parsed.username || parsed.password) {
    throw new ApprovedUrlsParseError(`Line ${line}: embedded credentials are not allowed.`);
  }

  if (parsed.hash) {
    throw new ApprovedUrlsParseError(`Line ${line}: URL fragments are not allowed.`);
  }
}

/**
 * Parses the operator-owned allowlist. The original URL string is retained so
 * tracking parameters are neither normalized nor reconstructed by automation.
 */
export function parseApprovedUrls(markdown: string): ApprovedUrlsManifest {
  const entries: ApprovedUrlEntry[] = [];
  const seen = new Set<string>();
  let inHtmlComment = false;

  for (const [index, rawLine] of markdown.split(/\r?\n/).entries()) {
    const line = index + 1;
    const trimmed = rawLine.trim();

    if (inHtmlComment) {
      if (trimmed.includes("-->")) inHtmlComment = false;
      continue;
    }

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("<!--")) {
      if (!trimmed.includes("-->")) inHtmlComment = true;
      continue;
    }

    const match = rawLine.match(BULLET_URL);
    if (!match) {
      throw new ApprovedUrlsParseError(
        `Line ${line}: entries must be a markdown bullet containing one exact HTTPS URL.`,
      );
    }

    const exactUrl = match[1];
    validateExactUrl(exactUrl, line);

    if (seen.has(exactUrl)) {
      throw new ApprovedUrlsParseError(`Line ${line}: duplicate exact URL.`);
    }

    seen.add(exactUrl);
    entries.push({ exactUrl, line, sha256: sha256(exactUrl) });
  }

  if (inHtmlComment) {
    throw new ApprovedUrlsParseError("Allowlist contains an unclosed HTML comment.");
  }

  return {
    entries,
    digest: sha256(entries.map((entry) => entry.exactUrl).join("\n")),
  };
}

/**
 * A deletion is immediate, but a broad manifest edit needs an explicit CI
 * override before it can drive noindex/archive actions.
 */
export function diffApprovedUrls(
  previous: ApprovedUrlsManifest,
  next: ApprovedUrlsManifest,
  options: ApprovedUrlsDiffOptions = {},
): ApprovedUrlsDelta {
  const nextByUrl = new Map(next.entries.map((entry) => [entry.exactUrl, entry]));
  const previousByUrl = new Map(previous.entries.map((entry) => [entry.exactUrl, entry]));
  const removals = previous.entries.filter((entry) => !nextByUrl.has(entry.exactUrl));
  const additions = next.entries.filter((entry) => !previousByUrl.has(entry.exactUrl));
  const retained = next.entries.filter((entry) => previousByUrl.has(entry.exactUrl));
  const removalRatio = previous.entries.length === 0 ? 0 : removals.length / previous.entries.length;

  return {
    additions,
    removals,
    retained,
    bulkRevocationBlocked:
      !options.allowBulkRevocation && removals.length >= 2 && removalRatio > 0.25,
  };
}
