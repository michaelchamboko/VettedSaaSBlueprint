import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_URL_LENGTH = 2048;

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const [first, second] = octets;
  return first === 0 || first === 10 || first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224;
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("ff");
}

export function isPrivateOrReservedAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? isPrivateIpv4(address) : family === 6 ? isPrivateIpv6(address) : true;
}

export type DnsResolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

export async function assertSafePublicHttpsUrl(
  value: string,
  resolveHost: DnsResolver = async (hostname) => lookup(hostname, { all: true }),
): Promise<URL> {
  if (value.length > MAX_URL_LENGTH) throw new Error("URL exceeds the maximum length.");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("Only HTTPS URLs are allowed.");
  if (parsed.username || parsed.password || parsed.hash) throw new Error("Credentials and fragments are not allowed.");
  const addresses = await resolveHost(parsed.hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedAddress(address))) {
    throw new Error("URL resolves to a private or reserved network address.");
  }
  return parsed;
}

export function assertSafeRedirectChain(urls: readonly string[]): void {
  if (urls.length > 5) throw new Error("Redirect chain exceeds the maximum depth.");
  for (const value of urls) {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
      throw new Error("Redirect chain contains an unsafe URL.");
    }
  }
}
