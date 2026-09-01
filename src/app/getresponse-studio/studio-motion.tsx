"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

export function StudioMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches || !root.current) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from("[data-studio-nav]", { y: -18, autoAlpha: 0, duration: 0.55 })
        .from("[data-studio-kicker]", { x: -28, autoAlpha: 0, duration: 0.45 }, "-=0.15")
        .from("[data-studio-title]", { y: 46, autoAlpha: 0, duration: 0.78 }, "-=0.2")
        .from("[data-studio-copy]", { y: 24, autoAlpha: 0, duration: 0.55 }, "-=0.42")
        .from("[data-studio-cta]", { y: 16, autoAlpha: 0, duration: 0.4 }, "-=0.28")
        .from("[data-studio-art]", { clipPath: "inset(100% 0 0 0)", duration: 1.05 }, "-=0.95")
        .from("[data-studio-check]", { y: 22, autoAlpha: 0, stagger: 0.13, duration: 0.48 }, "-=0.4");

      gsap.to("[data-studio-art] img", {
        yPercent: -3,
        scale: 1.04,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, root);

    return () => context.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
