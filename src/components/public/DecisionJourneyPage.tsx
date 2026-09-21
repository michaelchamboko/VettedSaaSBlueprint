import Link from "next/link";
import type { ReactNode } from "react";

import { DecisionJourneyMotion } from "./DecisionJourneyMotion";
import { PublicPageShell } from "./PublicPageShell";
import type { DecisionJourneyRecordV1 } from "@/lib/decision-journey/catalogue";
import type { DecisionJourneyRecordV2 } from "@/lib/decision-journey/sets";
import { getJourneyPresentation } from "@/lib/decision-journey/presentation";

const routeLabels: Record<string, string> = {
  "/decision-hub": "Decision guide",
  "/solution-hub": "Solution guide",
  "/scenarios": "Worked scenario",
};

function routeLabel(route: string) {
  if (route.startsWith("/decision-hub")) return "Decision guide";
  if (route.startsWith("/solution-hub")) return "Solution guide";
  return "Worked scenario";
}

export function DecisionJourneyPage({ record, afterContent }: { record: DecisionJourneyRecordV1 | DecisionJourneyRecordV2; afterContent?: ReactNode }) {
  const presentation = getJourneyPresentation(record);

  return (
    <PublicPageShell>
      <article
        className={`decision-journey decision-journey--${record.pageType}`}
        data-journey-motion-root
        data-journey-kind={record.pageType}
        data-catalogue-reference={presentation.catalogueReferences.join(" | ")}
        data-composition-family={presentation.compositionFamily}
      >
        <header className="decision-journey__hero" data-journey-motion="hero">
          <div className="decision-journey__hero-copy">
            <p className="public-eyebrow">{presentation.label} · evidence {record.evidenceState}</p>
            <h1>{record.headline}</h1>
            <p>{record.decisionContext}</p>
          </div>
          <aside className="decision-journey__hero-card" aria-label="Guide orientation" data-journey-motion="hero-card">
            <span>01 / {String(record.blocks.length).padStart(2, "0")}</span>
            <strong>{presentation.premise}</strong>
            <dl aria-label="Evidence status">
              <div><dt>Evidence state</dt><dd>{record.evidenceState}</dd></div>
              <div><dt>Reviewed</dt><dd>{record.reviewDate}</dd></div>
            </dl>
          </aside>
        </header>

        <section className="decision-journey__blocks" aria-label="Decision guide content">
          <div className="decision-journey__progress" aria-hidden="true" data-journey-motion="progress" />
          {record.blocks.map((block, index) => (
            <section className="decision-journey__block" id={block.id} key={block.id} data-journey-motion="block">
              <p className="decision-journey__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
              <div>
                <h2>{block.title}</h2>
                <p>{block.summary}</p>
                <ul className="decision-journey__claims">
                  {block.claims.map((claim) => (
                    <li key={claim.statement}>
                      <span data-evidence-state={claim.evidenceState}>{claim.evidenceState}</span>
                      <p>{claim.statement}</p>
                      <small>{claim.sources.map((source) => `${source.documentId} · ${source.heading} · ${source.sectionUid}`).join("; ")}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </section>

        <aside className="decision-journey__disclosure">
          <strong>How to use this guide</strong>
          <p>This is a source-bound decision frame. It does not rank vendors, publish pricing, or claim product testing. A change in evidence reopens the affected record.</p>
        </aside>

        <nav className="decision-journey__next" aria-label="Continue the decision journey" data-journey-motion="next">
          {record.connectedRoutes.map((route) => <Link key={route} href={route}>{routeLabels[route] ?? routeLabel(route)} <span aria-hidden="true">→</span></Link>)}
        </nav>
        {afterContent}
      </article>
      <DecisionJourneyMotion />
    </PublicPageShell>
  );
}
