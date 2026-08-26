import type { BlogPost } from "./contracts";

export function buildBlogStructuredData(post: BlogPost, origin: string) {
  const canonical = new URL(post.canonicalPath, origin).toString();
  const image = new URL(post.media.hero.path, origin).toString();

  return {
    article: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      dateModified: post.modifiedAt,
      mainEntityOfPage: canonical,
      image: [image],
      author: { "@type": "Organization", name: "VettedSaaSBlueprint", url: origin },
      publisher: { "@type": "Organization", name: "VettedSaaSBlueprint", url: origin },
      citation: post.sources.map((source) => source.url),
    },
    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", origin).toString() },
        { "@type": "ListItem", position: 3, name: post.title, item: canonical },
      ],
    },
  };
}
