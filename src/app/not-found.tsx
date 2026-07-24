import Link from "next/link";

import { PublicPageShell } from "@/components/public/PublicPageShell";

export default function NotFound() {
  return (
    <PublicPageShell>
      <section className="public-not-found" aria-labelledby="not-found-title">
        <p className="public-eyebrow">404 · Off the map</p>
        <h1 id="not-found-title">Page not found</h1>
        <p>
          This page may have moved, or it may never have been part of the public
          review catalogue.
        </p>
        <Link className="public-button" href="/">
          Return to VettedSaaSBlueprint
        </Link>
      </section>
    </PublicPageShell>
  );
}
