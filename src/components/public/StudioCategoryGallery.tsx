"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import type { getStudioCategories } from "@/lib/studio-catalogue";

export function StudioCategoryGallery({ categories }: { categories: ReturnType<typeof getStudioCategories> }) {
  const [activeIndex, setActiveIndex] = useState(2);

  return (
    <div className="studio-category-gallery" aria-labelledby="studio-title">
      {categories.map((category, index) => (
        <details
          className="studio-category-card"
          key={category.slug}
          name="homepage-studio-categories"
          open={activeIndex === index}
          style={{ "--studio-accent": category.accent } as CSSProperties}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              setActiveIndex(index);
            }
          }}
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
        </details>
      ))}
    </div>
  );
}
