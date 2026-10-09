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
            <h1 data-catalogue-title>{page.headline}</h1>
            <p className={styles.lede} data-catalogue-copy>{page.lede}</p>
          </div>
          <figure className={styles.artwork} data-catalogue-art>
            <img src="/generated/affiliate-catalogue-hero.png" alt={page.alt} style={{ objectPosition: page.visualPosition }} />
          </figure>
        </section>
        <section className={styles.steps} aria-labelledby="guide-title">
          <header className={styles.guideIntro}>
            <h2 id="guide-title">{page.guideTitle}</h2>
            <p>Work through these checks in order. Keep a short record of what you tried, what happened, and what remains unresolved.</p>
          </header>
          <ol className={styles.checks}>
            {page.steps.map((step) => (
              <li key={step.number} data-catalogue-step>
                <span aria-hidden="true">{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.body}</p></div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.decision} aria-labelledby="next-step-title">
          <div>
            <h2 id="next-step-title">Decide what to do next</h2>
            <p>{page.nextStep}</p>
            <p className={styles.limitation}>{page.limitation}</p>
          </div>
          <div className={styles.action}>
            <p className={styles.disclosure}>We may earn a commission if you use this link, at no extra cost to you.</p>
            <a className={styles.cta} data-catalogue-cta href={page.affiliateUrl} rel="nofollow sponsored">Check {page.name} options</a>
          </div>
        </section>
        <footer className={styles.footer}><p>Check current product options and terms on the official {page.name} destination.</p><nav aria-label="Trust links"><Link href="/affiliate-disclosure">Disclosure</Link><Link href="/editorial-policy">Editorial policy</Link><Link href="/privacy">Privacy</Link></nav></footer>
      </main>
    </CatalogueMotion>
  );
}
