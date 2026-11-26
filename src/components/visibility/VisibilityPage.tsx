import Link from "next/link";

import { EmailCostCalculator } from "@/components/visibility/EmailCostCalculator";
import type { VisibilityPageV1 } from "@/lib/visibility-pages/contracts";
import { ReviewedArticleHero, type ReviewedArticleHeroAsset } from "@/components/public/ReviewedArticleHero";

export function VisibilityPage({ page, reviewedHero }: { page: VisibilityPageV1; reviewedHero?: ReviewedArticleHeroAsset | null }) {
  return (
    <main>
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <span>{page.title}</span></nav>
      <header>
        <p>{page.hero.eyebrow}</p>
        <h1>{page.hero.headline}</h1>
        <p>{page.hero.summary}</p>
        <p>This editorial guide may link to reviews that contain affiliate links.</p>
        {reviewedHero ? <figure className="visibility-page__hero-media"><ReviewedArticleHero asset={reviewedHero} /></figure> : null}
      </header>
      {page.blocks.map((block, index) => {
        switch (block.type) {
          case "prose": return <section key={index}>{block.heading && <h2>{block.heading}</h2>}{block.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>;
          case "checklist": return <section key={index}><h2>{block.heading}</h2><ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
          case "steps": return <section key={index}><h2>{block.heading}</h2><ol>{block.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></section>;
          case "decision_table": return <section key={index}><h2>{block.heading}</h2><table><thead><tr>{block.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></section>;
          case "callout": return <aside key={index}><h2>{block.title}</h2><p>{block.body}</p></aside>;
          case "faq": return <section key={index}><h2>Questions</h2>{block.items.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>;
          case "internal_link_cards": return <section key={index}><h2>{block.heading}</h2>{block.links.map((link) => <article key={link.href}><h3><a href={link.href}>{link.label}</a></h3>{link.description && <p>{link.description}</p>}</article>)}</section>;
          case "calculator": return <EmailCostCalculator key={index} />;
        }
      })}
      <p><a href={page.relevant_review_path}>Read the related in-depth review</a></p>
    </main>
  );
}
