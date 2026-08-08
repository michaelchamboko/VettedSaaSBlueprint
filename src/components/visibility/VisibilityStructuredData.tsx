import type { VisibilityPublicationSummary } from "@/lib/visibility-pages/contracts";

type Props = { origin: string; summary: VisibilityPublicationSummary };

export function VisibilityStructuredData({ origin, summary }: Props) {
  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: origin },
      { "@type": "ListItem", position: 2, name: summary.title, item: new URL(summary.path, origin).toString() },
    ],
  }).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
