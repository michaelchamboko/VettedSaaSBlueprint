import Link from "next/link";

export function LegalTrustLinks({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Legal and trust links">
      <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
      <Link href="/editorial-policy">Editorial policy</Link>
      <Link href="/privacy">Privacy</Link>
      <Link href="/terms">Terms</Link>
      <Link href="/contact">Contact</Link>
    </nav>
  );
}
