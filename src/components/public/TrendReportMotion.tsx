"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function TrendReportMotion() {
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    gsap.registerPlugin(ScrollTrigger);

    const root = document.querySelector<HTMLElement>("[data-trend-motion-root]");
    if (!root) return;
    const scope = root.closest<HTMLElement>(".public-site") ?? root;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
        },
        ({ conditions }) => {
          if (!conditions?.motion) {
            gsap.set("[data-trend-motion]", { clearProps: "all" });
            return;
          }

          gsap.to("[data-trend-motion='progress']", {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.4,
            },
          });

          ScrollTrigger.batch("[data-trend-motion='block']", {
            start: "top 88%",
            once: true,
            onEnter: (elements) => gsap.from(elements, {
              y: 40,
              opacity: 0,
              stagger: 0.1,
              duration: 0.75,
              ease: "power3.out",
            }),
          });

          ScrollTrigger.batch("[data-trend-motion='finding']", {
            start: "top 90%",
            once: true,
            onEnter: (elements) => gsap.from(elements, {
              y: 26,
              opacity: 0,
              stagger: 0.08,
              duration: 0.6,
              ease: "power3.out",
            }),
          });

          gsap.utils.toArray<HTMLElement>("[data-trend-motion='close']").forEach((element) => {
            gsap.from(element, {
              y: 30,
              opacity: 0,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 90%", once: true },
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

  return <div aria-hidden="true" data-trend-motion="progress" className="trend-reading-progress" />;
}
