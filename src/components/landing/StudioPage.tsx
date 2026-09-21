"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

interface StudioPageConfig {
  affiliateUrl: string;
  productName: string;
  category: string;
  hero: {
    kicker: string;
    title: string;
    lede: string;
    ctaLabel: string;
  };
  artwork: {
    src: string;
    alt: string;
  };
  pillars: Array<{
    number: string;
    title: string;
    description: string;
  }>;
  limitations: Array<{
    title: string;
    description: string;
    mitigation: string;
  }>;
  disclosureText: string;
}

interface StudioPageProps {
  config: StudioPageConfig;
}

export function StudioPage({ config }: StudioPageProps) {
  const reduceMotion = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  const pillarRefs = useRef<(HTMLElement | null)[]>([]);
  const limitationRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      // Hero entrance animation
      gsap.fromTo(
        ".studio-kicker",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: 0.1 }
      );

      gsap.fromTo(
        ".studio-title",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "expo.out", delay: 0.2 }
      );

      gsap.fromTo(
        ".studio-lede",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "expo.out", delay: 0.4 }
      );

      gsap.fromTo(
        ".studio-cta-group",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "expo.out", delay: 0.6 }
      );

      gsap.fromTo(
        ".studio-artwork img",
        { scale: 1.05, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: "expo.out", delay: 0.3 }
      );

      // Parallax on artwork
      gsap.to(".studio-artwork img", {
        yPercent: 20,
        ease: "none",
        scrollTrigger: {
          trigger: ".studio-hero",
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      // Pillar cards scroll reveal
      pillarRefs.current.forEach((pillar, i) => {
        if (!pillar) return;
        gsap.fromTo(
          pillar,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "expo.out",
            delay: i * 0.1,
            scrollTrigger: {
              trigger: pillar,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Limitation cards scroll reveal
      limitationRefs.current.forEach((limitation, i) => {
        if (!limitation) return;
        gsap.fromTo(
          limitation,
          { y: 60, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "expo.out",
            delay: i * 0.1,
            scrollTrigger: {
              trigger: limitation,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });
    }, pageRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <main className="studio-page" ref={pageRef}>
      <header className="studio-nav" data-studio-nav>
        <Link href={"/" as never} className="studio-brand">VettedSaaSBlueprint</Link>
        <span>{config.productName} / studio brief</span>
      </header>

      <section className="studio-hero">
        <div className="studio-copy">
          <p className="studio-kicker" data-studio-kicker>{config.hero.kicker}</p>
          <h1 className="studio-title" data-studio-title>{config.hero.title}</h1>
          <p className="studio-lede" data-studio-copy>{config.hero.lede}</p>
          <div className="studio-cta-group">
            <a
              className="studio-cta"
              data-studio-cta
              href={config.affiliateUrl}
              rel="nofollow sponsored"
            >
              {config.hero.ctaLabel} <span aria-hidden="true">↗</span>
            </a>
            <p className="studio-disclosure">{config.disclosureText}</p>
          </div>
        </div>
        <figure className="studio-artwork" data-studio-art>
          <img src={config.artwork.src} alt={config.artwork.alt} />
        </figure>
      </section>

      <section className="studio-pillars" aria-label="Fit check">
        {config.pillars.map((pillar, index) => (
          <article
            key={pillar.number}
            className="studio-pillar"
            data-studio-pillar
            ref={(el) => { pillarRefs.current[index] = el; }}
          >
            <span className="studio-pillar-number">{pillar.number}</span>
            <h2 className="studio-pillar-title">{pillar.title}</h2>
            <p className="studio-pillar-description">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="studio-limitations" aria-label="Limitations">
        {config.limitations.map((limitation, index) => (
          <article
            key={limitation.title}
            className="studio-limitation"
            data-studio-limitation
            ref={(el) => { limitationRefs.current[index] = el; }}
          >
            <h3 className="studio-limitation-title">{limitation.title}</h3>
            <p className="studio-limitation-description">{limitation.description}</p>
            <p className="studio-limitation-mitigation">
              <strong>Mitigation:</strong> {limitation.mitigation}
            </p>
          </article>
        ))}
      </section>

      <footer className="studio-footer">
        <p>Check current product options and terms on the official {config.productName} destination.</p>
        <nav aria-label="Trust links">
          <Link href="/affiliate-disclosure">Disclosure</Link>
          <Link href="/editorial-policy">Editorial policy</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </main>
  );
}
