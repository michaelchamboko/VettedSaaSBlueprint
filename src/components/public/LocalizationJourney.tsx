import Link from "next/link";
import type { Route } from "next";
import { localizationPages, localizationReviewedAt, localizationSources, type LocalizationPage } from "@/lib/decision-journey/video-localization";
import { LocalizationMotion } from "./LocalizationMotion";
import styles from "./LocalizationJourney.module.css";

export function LocalizationJourney({ page }: { page: LocalizationPage }) {
  const sources = localizationSources.filter((source) => page.sections.some((section) => section.sources?.includes(source.id)));
  const current = localizationPages.indexOf(page);
  return (
    <article className={styles.page} data-localization-root>
      <div className={styles.progress} data-localization-progress aria-hidden="true" />
      <nav className={styles.journey} aria-label="Video localization journey">
        {localizationPages.map((item) => <Link key={item.path} href={item.path as Route} aria-current={item.path === page.path ? "page" : undefined}>{item.type}</Link>)}
      </nav>
      <header className={styles.hero}>
        <div>
          <h1 data-localization-hero>{page.title}</h1>
          <p className={styles.summary} data-localization-hero>{page.summary}</p>
          <a className={styles.readLink} href={`#${page.sections[0].id}`} data-localization-hero>Read the recommendation</a>
        </div>
        <figure className={styles.map} data-localization-hero>
          <figcaption>A decision you can review</figcaption>
          <ol>{page.visual.map((step) => <li key={step}>{step}</li>)}</ol>
          <p>Audience fit comes first. A tool earns its place in the workflow.</p>
        </figure>
      </header>
      <div className={styles.meta}>
        <span>Researched <time dateTime={localizationReviewedAt}>11 September 2026</time></span>
        <span>Official sources + editorial analysis</span>
        <a href="#sources">Read the sources</a>
      </div>
      <div className={styles.body} id="answer-start">
        <aside className={styles.contents} aria-label="On this page">
          <p>On this page</p>
          <nav>{page.sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>
        </aside>
        <div className={styles.sections}>
          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className={`${styles.section} ${section.kind === "verdict" ? styles.verdict : ""}`} data-localization-section data-localization-reveal>
              <h2>{section.title}</h2>
              <p className={styles.answer}>{section.answer}</p>
              {section.kind === "comparison" ? <div className={styles.tableWrap}><table className={styles.table}>
                <caption>Compare the work you need to finish</caption>
                <thead><tr><th scope="col">Route</th><th scope="col">Destination</th><th scope="col">Correction path</th><th scope="col">Before production</th></tr></thead>
                <tbody>
                  <tr><th scope="row">YouTube native</th><td>A YouTube channel with access</td><td>Review; automatic dubs are not editable</td><td>Verify channel and language eligibility</td></tr>
                  <tr><th scope="row">ElevenLabs</th><td>A separate audio-production workflow</td><td>Model-specific; verify the intended plan</td><td>Check commercial terms and Beta exclusions</td></tr>
                  <tr><th scope="row">Human localization</th><td>Deliverables agreed in the brief</td><td>Revisions agreed with the specialist</td><td>Confirm rights, scope and acceptance</td></tr>
                </tbody>
              </table></div> : null}
              {section.points ? <ul className={section.kind === "workflow" ? styles.steps : section.kind === "comparison" ? styles.comparison : styles.checks}>{section.points.map((point) => <li key={point} data-localization-step>{point}</li>)}</ul> : null}
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.sources?.length ? <p className={styles.citations}>Source: {section.sources.map((id, index) => <span key={id}>{index > 0 ? "; " : ""}<a href={`#source-${id}`}>{localizationSources.find((source) => source.id === id)!.title}</a></span>)}</p> : <p className={styles.analysis}>Editorial guidance{page.type === "Decision Scenario" ? " for this illustrative scenario" : ""}</p>}
            </section>
          ))}
          {page.affiliate ? <aside className={styles.action} aria-labelledby="review-title" data-localization-reveal>
            <h2 id="review-title">Does ElevenLabs fit your pilot?</h2>
            <p>Check the exact dubbing model, correction workflow and commercial-use terms at ElevenLabs before paying. Confirm that your intended service is eligible for commercial use; a paid plan alone does not resolve the Beta Services exclusion.</p>
            <p className={styles.disclosure}>The following is an affiliate link. We may earn a commission if you buy through it, at no extra cost to you. That does not determine our recommendation. <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.</p>
            <a className={styles.button} href="https://try.elevenlabs.io/izj2b165mcsj" rel="sponsored nofollow">Check ElevenLabs for your pilot</a>
            <p className={styles.actionNote}>Use the existing platform if it already meets your needs.</p>
          </aside> : null}
          <section id="sources" className={styles.sources}>
            <h2>Sources and limits</h2>
            <p>Checked on 11 September 2026. Documentation establishes what vendors describe, not independently tested output quality. We did not conduct a listening test, measure buyer demand or forecast revenue.</p>
            <ol>{sources.map((source) => <li id={`source-${source.id}`} key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.publisher}. {source.published}. {source.note}</p></li>)}</ol>
            <p>This guide should be refreshed when model access, editing controls, commercial terms or platform availability changes.</p>
          </section>
          <nav className={styles.finish} aria-label="Continue the decision journey">
            {current > 0 ? <Link href={localizationPages[current - 1].path as Route}>Back to the {localizationPages[current - 1].type.toLowerCase()}</Link> : <Link href="/">Back to the review journal</Link>}
            {current < 2 ? <Link href={localizationPages[current + 1].path as Route}>Continue to the {localizationPages[current + 1].type.toLowerCase()}</Link> : <Link href={localizationPages[0].path as Route}>Revisit the decision</Link>}
          </nav>
        </div>
      </div>
      <LocalizationMotion />
    </article>
  );
}
