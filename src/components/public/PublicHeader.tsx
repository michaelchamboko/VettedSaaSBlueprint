import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="public-header" data-home-motion="header">
      <Link className="public-wordmark" href="/" aria-label="VettedSaaSBlueprint home">
        <span aria-hidden="true">VSB</span>
        <strong>VettedSaaSBlueprint</strong>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/decision-hub">Decision guides</Link>
        <Link href="/#reviews">Reviews</Link>
        <Link href="/#how-we-vet">How we vet</Link>
        <Link href="/editorial-policy">Editorial policy</Link>
        <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
        <Link href="/blog">Blog</Link>
      </nav>
    </header>
  );
}
