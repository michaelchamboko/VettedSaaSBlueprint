"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function LandingPageMotion({ pageSlug }: { pageSlug: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-motion-root="${pageSlug}"]`);
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanupCta: (() => void) | undefined;

    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { duration: 0.78, ease: "power3.out" } });
      heroTimeline
        .from("[data-motion='nav']", { y: -18, opacity: 0 }, 0.12)
        .from("[data-motion='hero-copy'] > *", { y: 30, opacity: 0, stagger: 0.09 }, 0.22)
        .from("[data-motion='hero-media']", { y: 34, scale: 0.96, opacity: 0, ease: "expo.out" }, 0.38);

      gsap.to("[data-motion='hero-media']", {
        y: -10,
        rotation: 0.35,
        duration: 4.8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray<HTMLElement>("[data-motion='reveal']").forEach((element, index) => {
        gsap.from(element, {
          y: 46,
          opacity: 0,
          duration: 0.72,
          delay: Math.min(index * 0.06, 0.18),
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-motion='benefit-card']").forEach((card, index) => {
        gsap.from(card, {
          y: 42,
          opacity: 0,
          duration: 0.74,
          delay: index * 0.08,
          ease: "back.out(1.15)",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        });

        const media = card.querySelector("[data-motion='benefit-media']");
        if (media) {
          gsap.to(media, {
            y: -7,
            duration: 3.8 + index * 0.3,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          });
        }
      });

      const cta = root.querySelector<HTMLElement>("[data-motion='primary-cta']");
      if (cta) {
        const xTo = gsap.quickTo(cta, "x", { duration: 0.32, ease: "power3.out" });
        const yTo = gsap.quickTo(cta, "y", { duration: 0.32, ease: "power3.out" });

        const onPointerMove = (event: PointerEvent) => {
          const rect = cta.getBoundingClientRect();
          xTo((event.clientX - rect.left - rect.width / 2) * 0.12);
          yTo((event.clientY - rect.top - rect.height / 2) * 0.16);
        };
        const onPointerLeave = () => {
          xTo(0);
          yTo(0);
        };

        cta.addEventListener("pointermove", onPointerMove);
        cta.addEventListener("pointerleave", onPointerLeave);
        cta.addEventListener("blur", onPointerLeave);

        cleanupCta = () => {
          cta.removeEventListener("pointermove", onPointerMove);
          cta.removeEventListener("pointerleave", onPointerLeave);
          cta.removeEventListener("blur", onPointerLeave);
        };
      }
    }, root);

    return () => {
      cleanupCta?.();
      context.revert();
    };
  }, [pageSlug]);

  return null;
}
