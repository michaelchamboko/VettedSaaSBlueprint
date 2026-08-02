"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

export function CatalogueMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from("[data-catalogue-nav]", { y: -14, autoAlpha: 0, duration: 0.45 })
        .from("[data-catalogue-kicker]", { x: -22, autoAlpha: 0, duration: 0.35 }, "-=0.15")
        .from("[data-catalogue-title]", { y: 46, autoAlpha: 0, duration: 0.72 }, "-=0.16")
        .from("[data-catalogue-copy]", { y: 22, autoAlpha: 0, duration: 0.45 }, "-=0.42")
        .from("[data-catalogue-cta]", { y: 14, autoAlpha: 0, duration: 0.4 }, "-=0.24")
        .from("[data-catalogue-art]", { clipPath: "inset(100% 0 0 0)", duration: 0.9 }, "-=0.7")
        .from("[data-catalogue-step]", { y: 20, autoAlpha: 0, stagger: 0.1, duration: 0.4 }, "-=0.25");
      gsap.to("[data-catalogue-art] img", { yPercent: -2.5, scale: 1.05, duration: 8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }, root);
    return () => context.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
