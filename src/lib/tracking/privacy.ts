import type { PublicSiteConfig } from "@/lib/site/public-site";

export function analyticsAllowedByPrivacySignals(input: {
  globalPrivacyControl?: boolean;
  doNotTrack?: string | null;
}): boolean {
  return input.globalPrivacyControl !== true && input.doNotTrack !== "1";
}

export function publicTrackingAllowed(request: Request, config: PublicSiteConfig): boolean {
  if (!config.analytics.enabled) return false;
  return analyticsAllowedByPrivacySignals({
    globalPrivacyControl: request.headers.get("sec-gpc") === "1",
    doNotTrack: request.headers.get("dnt"),
  });
}
