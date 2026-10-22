"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState, type CSSProperties } from "react";

import type { getStudioCategories } from "@/lib/studio-catalogue";

export function StudioCategoryGallery({ categories }: { categories: ReturnType<typeof getStudioCategories> }) {
  const [activeIndex, setActiveIndex] = useState(2);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="studio-category-gallery"
      aria-labelledby="studio-title"
      data-home-motion="review-card"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        // Moving card boundaries must not select a new card beneath a stationary pointer.
        const card = (event.target as HTMLElement).closest<HTMLElement>(".studio-category-card");
        if (card && event.currentTarget.contains(card)) setActiveIndex(Number(card.dataset.categoryIndex));
      }}
    >
      {categories.map((category, index) => (
        <motion.details
          className="studio-category-card"
          key={category.slug}
          name="homepage-studio-categories"
          open={index === activeIndex}
          suppressHydrationWarning
          data-category-index={index}
          layout={!reduceMotion}
          transition={{ layout: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } }}
          style={{ "--studio-accent": category.accent } as CSSProperties}
          onFocus={() => setActiveIndex(index)}
        >
          <summary onClick={(event) => { event.preventDefault(); setActiveIndex(index); }}>
            <div className="studio-category-card__heading">
              <p className="studio-category-card__label">{category.label}</p>
              <h3>{category.productName}</h3>
              <p className="studio-category-card__description">{category.description}</p>
            </div>
            <div
              className="studio-category-card__image"
              role="img"
              aria-label={category.alt}
              style={{ backgroundPosition: category.visualPosition }}
            />
            <span className="studio-category-card__cue">Explore 5 briefs</span>
          </summary>
          <div className="studio-category-card__panel">
            <nav aria-label={`${category.productName} briefs`}>
              {category.pages.map((page) => <Link key={page.slug} href={page.path}>{page.variant.label}</Link>)}
            </nav>
          </div>
        </motion.details>
      ))}
    </div>
  );
}
