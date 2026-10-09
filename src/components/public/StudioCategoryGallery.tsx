"use client";

import Link from "next/link";
import { useRef, type CSSProperties } from "react";

import type { getStudioCategories } from "@/lib/studio-catalogue";

export function StudioCategoryGallery({ categories }: { categories: ReturnType<typeof getStudioCategories> }) {
  const cardRefs = useRef<Array<HTMLDetailsElement | null>>([]);

  function activate(index: number) {
    cardRefs.current.forEach((card, cardIndex) => {
      if (card) card.open = cardIndex === index;
    });
  }

  return (
    <div className="studio-category-gallery" aria-labelledby="studio-title">
      {categories.map((category, index) => (
        <details
          className="studio-category-card"
          key={category.slug}
          name="homepage-studio-categories"
          open={index === 2}
          suppressHydrationWarning
          ref={(card) => { cardRefs.current[index] = card; }}
          style={{ "--studio-accent": category.accent } as CSSProperties}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              activate(index);
            }
          }}
          onFocus={() => activate(index)}
        >
          <summary onClick={(event) => { event.preventDefault(); activate(index); }}>
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
        </details>
      ))}
    </div>
  );
}
