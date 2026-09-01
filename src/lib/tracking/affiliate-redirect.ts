export function resolveAffiliateRedirect(partnerstackUrl: string | null, origin: string) {
  if (!partnerstackUrl) return new URL("/affiliate-link-unavailable", origin);
  return new URL(partnerstackUrl);
}
