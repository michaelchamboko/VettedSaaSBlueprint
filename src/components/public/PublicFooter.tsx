import Link from "next/link";

const legalLinks = [
  ["Blog", "/blog"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Contact", "/contact"],
  ["Affiliate disclosure", "/affiliate-disclosure"],
  ["Editorial policy", "/editorial-policy"],
  ["PAIA manual", "/paia"],
  ["Accessibility", "/accessibility"],
] as const;

export function PublicFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <footer className={`public-footer public-footer--${tone}`}>
      <div>
        <Link className="public-footer__brand" href="/">VettedSaaSBlueprint</Link>
        <p>Independent software reviews for clearer buying decisions.</p>
      </div>
      <nav aria-label="Legal and trust information">
        {legalLinks.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      </nav>
      <p className="public-footer__legal">
        VettedSaaSBlueprint is a South African sole proprietorship. We may earn a commission from qualifying affiliate referrals.
      </p>
    </footer>
  );
}
