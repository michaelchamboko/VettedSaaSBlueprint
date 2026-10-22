import type { Metadata } from "next";
import { z } from "zod";

/** The single trusted production origin. Release verification must never accept any other origin. */
export const REPOSITORY_CANONICAL_ORIGIN = "https://vettedsaasblueprint.online";
const DEFAULT_ORIGIN = REPOSITORY_CANONICAL_ORIGIN;

const environmentSchema = z.object({
  PUBLIC_SITE_ORIGIN: z.string().optional(),
  PUBLIC_POLICY_EFFECTIVE_DATE: z.string().optional(),
  INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT: z.string().optional(),
});

export type PublicSiteConfig = {
  brandName: "VettedSaaSBlueprint";
  canonicalOrigin: string;
  operator: {
    structure: "sole_proprietor";
    tradingName: "VettedSaaSBlueprint";
    registrationNumber: null;
    publicEmail: "vettedsaasblueprint@proton.me";
    phone: null;
    informationOfficer: {
      displayName: "Information Officer, VettedSaaSBlueprint";
      email: "vettedsaasblueprint@proton.me";
      registrationConfirmedAt: string;
    };
    address: {
      line1: "3 Wagner Lane";
      suburb: "Sagewood";
      city: "Johannesburg";
      province: "Gauteng";
      country: "South Africa";
    };
  };
  policies: {
    effectiveDate: string;
    reviewDate: string;
  };
  analytics: {
    enabled: false;
  };
};

export const PUBLIC_OPERATOR_STATEMENT =
  "VettedSaaSBlueprint is a South African sole proprietorship operating from 3 Wagner Lane, Sagewood, Johannesburg, Gauteng, South Africa.";

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function reviewDateFor(effectiveDate: string): string {
  if (!isIsoCalendarDate(effectiveDate)) return "";
  const [year, month, day] = effectiveDate.split("-").map(Number);
  const date = new Date(Date.UTC(year + 1, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return value;
    return url.origin;
  } catch {
    return value;
  }
}

function isHttpsOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && value === url.origin;
  } catch {
    return false;
  }
}

export function loadPublicSiteConfig(
  env: Record<string, string | undefined> = process.env,
): PublicSiteConfig {
  const parsed = environmentSchema.parse(env);
  const effectiveDate = parsed.PUBLIC_POLICY_EFFECTIVE_DATE ?? "";
  const registrationConfirmedAt =
    parsed.INFORMATION_OFFICER_REGISTRATION_CONFIRMED_AT ?? "";

  return {
    brandName: "VettedSaaSBlueprint",
    canonicalOrigin: normalizeOrigin(parsed.PUBLIC_SITE_ORIGIN ?? DEFAULT_ORIGIN),
    operator: {
      structure: "sole_proprietor",
      tradingName: "VettedSaaSBlueprint",
      registrationNumber: null,
      publicEmail: "vettedsaasblueprint@proton.me",
      phone: null,
      informationOfficer: {
        displayName: "Information Officer, VettedSaaSBlueprint",
        email: "vettedsaasblueprint@proton.me",
        registrationConfirmedAt,
      },
      address: {
        line1: "3 Wagner Lane",
        suburb: "Sagewood",
        city: "Johannesburg",
        province: "Gauteng",
        country: "South Africa",
      },
    },
    policies: {
      effectiveDate,
      reviewDate: reviewDateFor(effectiveDate),
    },
    analytics: { enabled: false },
  };
}

export function getPublicLaunchBlockers(config: PublicSiteConfig): string[] {
  const blockers: string[] = [];

  if (!isHttpsOrigin(config.canonicalOrigin)) {
    blockers.push("PUBLIC_SITE_ORIGIN must be a valid HTTPS origin.");
  }

  return blockers;
}

export function assertPublicLaunchReady(config: PublicSiteConfig): void {
  const blockers = getPublicLaunchBlockers(config);
  if (blockers.length > 0) {
    throw new Error(`Public site is not ready:\n${blockers.join("\n")}`);
  }
}

export function publicSiteMetadata(config: PublicSiteConfig): Metadata {
  const title = "VettedSaaSBlueprint — Practical SaaS reviews";
  const description =
    "Independent, evidence-led SaaS reviews built to support real buying decisions.";

  return {
    metadataBase: new URL(config.canonicalOrigin),
    title: {
      default: title,
      template: `%s | ${config.brandName}`,
    },
    description,
    verification: {
      google: "yXL5P6NXRbp4b0oDBYQe1b-UWD0B6Jj9cBeFpLosONQ",
    },
    openGraph: {
      type: "website",
      siteName: config.brandName,
      title,
      description,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
