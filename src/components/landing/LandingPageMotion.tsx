"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { boundedSplitRevealOffset } from "./split-reveal-offset";

gsap.registerPlugin(ScrollTrigger);

export type LandingPageMotionVariant = "quiet_stagger" | "split_reveal" | "media_parallax" | "line_wipe" | "anchored_progress";

function applyReferenceComposedMotion(root: HTMLElement, variant: LandingPageMotionVariant) {
  const heroCopy = root.querySelector<HTMLElement>("[data-motion='hero-copy']");
  const heroMedia = root.querySelector<HTMLElement>("[data-motion='hero-media']");
  const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-motion='reveal']"));

  if (variant === "quiet_stagger") {
    if (heroCopy) gsap.from(heroCopy.children, { y: 20, opacity: 0, stagger: 0.08, duration: 0.62, ease: "power2.out" });
    if (heroMedia) gsap.from(heroMedia, { y: 20, opacity: 0, duration: 0.68, ease: "power2.out" });
    sections.forEach((section) => gsap.from(section, { y: 24, opacity: 0, duration: 0.58, ease: "power2.out", scrollTrigger: { trigger: section, start: "top 86%", once: true } }));
    return;
  }

  if (variant === "split_reveal") {
    const copyGutter = heroCopy ? heroCopy.getBoundingClientRect().left : 36;
    const mediaGutter = heroMedia ? document.documentElement.clientWidth - heroMedia.getBoundingClientRect().right : 36;
    const copyOffset = boundedSplitRevealOffset(copyGutter);
    const mediaOffset = boundedSplitRevealOffset(mediaGutter);
    if (heroCopy) gsap.from(heroCopy, { x: -copyOffset, opacity: 0, duration: 0.72, ease: "power3.out" });
    if (heroMedia) gsap.from(heroMedia, { x: mediaOffset, opacity: 0, duration: 0.72, ease: "power3.out" });
    sections.forEach((section) => gsap.from(section, { y: 28, opacity: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 84%", once: true } }));
    return;
  }

  if (variant === "media_parallax") {
    if (heroCopy) gsap.from(heroCopy.children, { y: 18, opacity: 0, stagger: 0.07, duration: 0.58, ease: "power2.out" });
    if (heroMedia) gsap.fromTo(heroMedia, { yPercent: -4, opacity: 0 }, { yPercent: 7, opacity: 1, ease: "none", scrollTrigger: { trigger: heroMedia, start: "top bottom", end: "bottom top", scrub: true } });
    return;
  }

  if (variant === "line_wipe") {
    if (heroCopy) gsap.from(heroCopy.children, { y: 16, opacity: 0, stagger: 0.06, duration: 0.54, ease: "power2.out" });
    Array.from(root.querySelectorAll<HTMLElement>("[data-motion='divider']")).forEach((divider) => gsap.from(divider, { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: divider, start: "top 86%", once: true } }));
    return;
  }

  sections.forEach((section) => gsap.fromTo(section, { y: 18, scale: 0.985, opacity: 0.42 }, { y: 0, scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 82%", end: "top 42%", scrub: true } }));
}

export function LandingPageMotion({ pageSlug, variant }: { pageSlug: string; variant?: LandingPageMotionVariant }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-motion-root="${pageSlug}"]`);
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanupCta: (() => void) | undefined;

    const context = gsap.context(() => {
      if (variant) {
        applyReferenceComposedMotion(root, variant);
        return;
      }

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
  }, [pageSlug, variant]);

  return null;
}
