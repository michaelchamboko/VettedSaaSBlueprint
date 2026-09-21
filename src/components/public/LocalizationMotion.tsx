"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// DESIGN_STANDARDS: trend-reading-progress, trend-block-reveal,
// trend-evidence-reveal. Reused for the owner-requested decision journey.
export function LocalizationMotion() {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = document.querySelector<HTMLElement>("[data-localization-root]");
    if (!root) return;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-localization-progress]", {
          scaleX: 1, ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.4 },
        });
        gsap.from("[data-localization-hero]", { y: 22, opacity: 0.65, duration: 0.8, stagger: 0.1, ease: "power3.out" });
        gsap.utils.toArray<HTMLElement>("[data-localization-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 28, opacity: 0.65, duration: 0.7, ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 92%", once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-localization-step]").forEach((element) => {
          gsap.from(element, {
            x: -18, opacity: 0.6, duration: 0.65, ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, []);
  return null;
}
