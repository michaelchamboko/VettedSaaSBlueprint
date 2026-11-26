import Image from "next/image";

import type { ArticleHeroPublication } from "@/lib/article-heroes";

export type ReviewedArticleHeroAsset = ArticleHeroPublication["asset"];

export function ReviewedArticleHero({
  asset,
  priority = true,
  sizes = "(max-width: 800px) 100vw, 42vw",
}: {
  asset: ReviewedArticleHeroAsset;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span className="reviewed-article-hero-frame" data-reviewed-article-hero>
      <Image
        alt={asset.alt}
        height={asset.height}
        priority={priority}
        sizes={sizes}
        src={asset.publicPath}
        unoptimized
        width={asset.width}
      />
    </span>
  );
}
