"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function DecisionJourneyMotion() {
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    gsap.registerPlugin(ScrollTrigger);

    const root = document.querySelector<HTMLElement>("[data-journey-motion-root]");
    if (!root) return;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 768px)" }, ({ conditions }) => {
        if (!conditions?.motion) return;

        const hero = root.querySelector<HTMLElement>("[data-journey-motion='hero']");
        const heroCard = root.querySelector<HTMLElement>("[data-journey-motion='hero-card']");
        const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-journey-motion='block']"));
        const progress = root.querySelector<HTMLElement>("[data-journey-motion='progress']");
        const next = root.querySelector<HTMLElement>("[data-journey-motion='next']");

        gsap.timeline({ defaults: { ease: "power3.out" } })
          .from(hero, { y: conditions.desktop ? 36 : 18, opacity: 0, duration: 0.72 })
          .from(heroCard, { y: 20, opacity: 0, duration: 0.55 }, "-=0.38");

        ScrollTrigger.batch(blocks, {
          start: "top 84%",
          once: true,
          onEnter: (elements) => gsap.from(elements, { y: conditions.desktop ? 32 : 16, opacity: 0, stagger: 0.08, duration: 0.58, ease: "power2.out" }),
        });

        if (conditions.desktop && progress && blocks.length) {
          gsap.fromTo(progress, { scaleY: 0, transformOrigin: "top" }, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: blocks[0], endTrigger: blocks.at(-1), start: "top 65%", end: "bottom 65%", scrub: 0.4 },
          });
        }

        if (next) {
          gsap.from(next, { y: 16, opacity: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: next, start: "top 88%", once: true } });
        }
      });
    }, root);

    return () => {
      initialized.current = false;
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
