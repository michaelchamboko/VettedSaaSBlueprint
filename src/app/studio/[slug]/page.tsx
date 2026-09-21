import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { getStudioLandingPage, studioLandingPages } from "@/lib/studio-catalogue";
import { CatalogueMotion } from "./studio-motion";
import styles from "./page.module.css";

export function generateStaticParams() {
  return studioLandingPages.map(({ slug }) => ({ slug }));
}

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const page = getStudioLandingPage(slug);
    if (!page) return {};
    return { title: `${page.title} | VettedSaaSBlueprint`, description: page.lede, robots: { index: false, follow: false } };
  });
}

export default async function StudioLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getStudioLandingPage((await params).slug);
  if (!page) notFound();

  return (
    <CatalogueMotion>
      <main className={styles.page} style={{ "--accent": page.category.accent } as CSSProperties}>
        <header className={styles.nav} data-catalogue-nav>
          <Link href="/" className={styles.brand}>VettedSaaSBlueprint</Link>
          <span>{page.category.label} / {page.variant.label}</span>
        </header>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <p className={styles.kicker} data-catalogue-kicker>{page.name} / {page.variant.label}</p>
            <h1 data-catalogue-title>{page.variant.framing}</h1>
            <p className={styles.lede} data-catalogue-copy>{page.lede}</p>
            <a className={styles.cta} data-catalogue-cta href={page.affiliateUrl} rel="nofollow sponsored">Explore {page.name} <span aria-hidden="true">↗</span></a>
            <p className={styles.disclosure}>We may earn a commission if you use this link, at no extra cost to you.</p>
          </div>
          <figure className={styles.artwork} data-catalogue-art>
            <img src="/generated/affiliate-catalogue-hero.png" alt={page.alt} style={{ objectPosition: page.visualPosition }} />
          </figure>
        </section>
        <section className={styles.steps} aria-label={`${page.name} fit check`}>
          {page.steps.map((step) => <article key={step} data-catalogue-step><span>{step.slice(0, 2)}</span><h2>{step.slice(5)}</h2><p>{page.variant.framing}</p></article>)}
        </section>
        <footer className={styles.footer}><p>Check current product options and terms on the official {page.name} destination.</p><nav aria-label="Trust links"><Link href="/affiliate-disclosure">Disclosure</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/privacy">Privacy</Link></nav></footer>
      </main>
    </CatalogueMotion>
  );
}
