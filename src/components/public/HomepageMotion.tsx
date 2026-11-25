"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function HomepageMotion() {
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    gsap.registerPlugin(ScrollTrigger);

    const root = document.querySelector<HTMLElement>("[data-home-motion-root]");
    if (!root) return;
    const scope = root.closest<HTMLElement>(".public-site") ?? root;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          desktop: "(min-width: 768px)",
        },
        ({ conditions }) => {
          if (!conditions?.motion) {
            gsap.set("[data-home-motion]", { clearProps: "all" });
            return;
          }

          gsap.timeline({ defaults: { ease: "power3.out" } })
            .from("[data-home-motion='header']", { y: -20, opacity: 0, duration: 0.7 })
            .from("[data-home-motion='hero-line']", { yPercent: 105, opacity: 0, stagger: 0.08, duration: 0.95 }, "-=0.3")
            .from("[data-home-motion='hero-support']", { y: 24, opacity: 0, stagger: 0.08, duration: 0.65 }, "-=0.5");

          gsap.to("[data-home-motion='hero-mark']", {
            yPercent: conditions.desktop ? -18 : -8,
            rotation: conditions.desktop ? -4 : -2,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-home-motion='hero']",
              start: "top top",
              end: "bottom top",
              scrub: 0.8,
            },
          });

          if (conditions.desktop) {
            root.querySelectorAll(".governed-rows article").forEach((row) => {
              ScrollTrigger.create({
                trigger: row,
                start: "top center",
                end: "bottom center",
                toggleClass: "is-reading",
              });
            });
          }

          ScrollTrigger.batch("[data-home-motion='review-card']", {
            start: "top 88%",
            once: true,
            onEnter: (cards) => gsap.from(cards, {
              y: 54,
              opacity: 0,
              stagger: 0.12,
              duration: 0.8,
              ease: "power3.out",
            }),
          });

          gsap.utils.toArray<HTMLElement>("[data-home-motion='reveal']").forEach((element) => {
            gsap.from(element, {
              y: 42,
              opacity: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 86%", once: true },
            });
          });
        },
      );
    }, scope);

    return () => {
      initialized.current = false;
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
