# Daily SaaS Buyer Blog Design

## Status

- Direction approved by the owner on 2026-08-08.
- Editorial mix: 70% evergreen buyer questions and 30% current trends.
- Scheduled publication time: 03:00 Africa/Johannesburg.
- Publication target: Vercel production immediately after repository gates pass.
- Hermes, Neon, and the landing-page orchestration path are outside this system.

## Outcome

Add a public, indexable buyer-education blog to VettedSaaSBlueprint and a standalone Codex cron automation that publishes exactly one evidence-led article per successful run. The blog must help readers make defensible SaaS decisions, build topical authority around the site's reviewed products and categories, and send qualified readers to related internal reviews.

Success means:

1. `/blog` and `/blog/[slug]` are server-rendered, responsive, accessible, and discoverable from the public navigation.
2. Every article answers one explicit buyer question, cites its sources, exposes important limitations, and links to relevant internal reviews without manufacturing product approval.
3. A successful scheduled run creates one article, passes local and GitHub gates, merges through a pull request, reaches Vercel production, and verifies the live article, sitemap, robots policy, structured data, and deployment SHA.
4. A failed evidence, content, repository, CI, or deployment gate publishes nothing and reports the exact failed stage.

## Non-goals

- No public author accounts, CMS, comments, newsletter capture, paywall, or search service.
- No Hermes research, Neon workflow state, Oracle worker, or `landing:run` invocation.
- No generated JSX, MDX, raw HTML, or arbitrary executable content.
- No direct affiliate CTA inside an article. Article CTAs point to existing internal reviews; those reviewed pages retain ownership of affiliate links and disclosures.
- No automatic changes to the blog template, design system, or renderer during a daily content run.
- No publication based only on social popularity, a single source, or an AI summary.

## Editorial System

### Ten-publication cadence

The publication registry assigns the next successful article a cycle position from 1 through 10. Positions 3, 6, and 9 are trend-led; the other seven are evergreen. Failed runs do not advance the counter. This keeps trend posts distributed rather than publishing three news posts consecutively.

### Evergreen article selection

Evergreen questions must address a durable buying decision connected to an existing product or category, such as:

- evaluation criteria and red flags;
- implementation readiness and migration cost;
- pricing-model or total-cost questions;
- security, privacy, governance, and integration requirements;
- role-specific fit, limitations, and alternatives;
- operational checklists a buyer can reuse.

### Trend article selection

Trend-led posts must connect a current change to a durable buyer decision. A product announcement alone is not sufficient. The article must explain what changed, who is affected, what evidence is available, and what a buyer should verify next.

### Research policy

The automation uses the `agent-reach` skill with this ordered discovery chain:

1. Exa semantic search for current discovery.
2. Official vendor documentation, changelogs, security pages, pricing pages, and regulatory or standards sources read through Jina Reader.
3. Relevant RSS feeds for recent changes.
4. Reddit or X only when an already-authenticated backend passes a health check. Social signals may suggest questions but may not serve as sole evidence.

Every article requires at least three useful sources, including at least two primary or authoritative sources when the topic permits. Volatile pricing, plan limits, legal requirements, security capabilities, availability, and product behavior require a current official source retrieved during the run. Unsupported or conflicting high-risk claims are omitted. Source URLs, titles, publishers, publication dates when available, retrieval timestamps, and source roles are stored with the article.

### Relevance and duplication gates

Before drafting, the automation checks the publication registry and existing article corpus for:

- duplicate normalized questions or slugs;
- overlapping search intent that would cannibalize an existing post;
- weak connection to an existing reviewed product or approved category;
- a topic whose useful answer depends on unavailable evidence;
- a trend with attention but no actionable buyer consequence.

The chosen topic records its target question, audience, search intent, topic cluster, related reviews, why-now rationale, and evidence plan before drafting begins.

## Content Contract

Daily content is stored as versioned `BlogPostV1` JSON. A Zod schema validates the artifact before the renderer can load it. The contract contains:

- identity: slug, title, explicit buyer question, description, author, and topic cluster;
- classification: `evergreen` or `trend`, cycle position, and primary search intent;
- dates: published, materially updated, and research retrieval timestamps;
- answer summary: a concise answer visible above the fold;
- exactly six ordered editorial sections;
- typed content blocks such as paragraphs, lists, checklists, comparison tables, evidence callouts, and caution notes;
- visible FAQs where the topic genuinely needs them;
- normalized citations linked from claims to the stored source registry;
- related published review slugs;
- media metadata with path, alt text, intrinsic dimensions, and purpose;
- SEO title, description, canonical path, and Open Graph image;
- publication status and provenance fields.

The renderer accepts only known block types and escapes all text. It does not evaluate generated markup.

## Information Architecture

### Blog index

`/blog` provides:

1. an answer-first editorial hero explaining the library's purpose;
2. the latest evidence-led article as the dominant feature;
3. topic-cluster navigation using crawlable links rather than client-only filtering;
4. an indexed article list with publication type, question, date, and related product category;
5. an explicit empty state for a clean repository before the exemplar article exists.

Pagination is added only when the article count makes it necessary. Infinite scroll is prohibited.

### Article route

`/blog/[slug]` has six visual sections:

1. **Answer-first hero** — question, concise answer, article type, date, reading time, and cover treatment.
2. **Why it matters** — current context and the buyer consequence.
3. **Decision framework** — the criteria that should drive the decision.
4. **Evaluation checklist** — practical questions, comparisons, or tests.
5. **Costs, risks, and implementation** — trade-offs, limits, and operational realities.
6. **Verdict and next steps** — bounded conclusion, sources, visible FAQs when applicable, and related internal reviews.

Breadcrumbs, a compact table of contents, reading progress, source links, and correction/update metadata support the six-section spine without becoming separate content sections.

### Discovery layer

- Add Blog to the public header and footer.
- Add the blog index and every published article to the generated sitemap.
- Add an RSS feed containing summaries and canonical article links.
- Keep Vercel previews blocked by the existing robots policy.
- Keep every article reachable in at most three clicks from the homepage.

## Visual Direction: Evidence Ledger

The visual thesis is: **a calm editorial dossier that turns software noise into a defensible buying decision.**

The blog extends the existing public site's paper, ink, clay, sage, serif, and restrained sans-serif language. It uses thin rules, indexed dossier numbers, source-margin notes, evidence-receipt treatments, controlled asymmetry, and generous editorial measures. Surfaces stay square or minimally rounded. Generic SaaS card grids, purple-blue gradients, glassmorphism, fake KPI strips, logo marquees, and news-ticker clutter are prohibited.

The initial design pass uses `imagegen-frontend-web` to generate six separate horizontal design references, one for each article section. Those images are references only; production recreates their structure as semantic React and CSS rather than embedding screenshots of text. All six references share one palette, typography system, spacing system, image treatment, and narrative spine.

The 21st.dev catalog is used only for named component slots. Current candidates are:

- Editorial Image Hero (`component:19077`) for the article and index hero pattern.
- Inline Citations (`component:23585`) for accessible claim-to-source links.
- Table of Content (`component:22596`) as an interaction reference only; its pointer-scrubbing and spring behavior are likely too elaborate for this site's performance and accessibility budget.

Only two component-code retrievals remain in the current free quota. Retrieve the hero and citation candidates after checking usage, inspect their dependencies and accessibility, then either adapt them to existing tokens or reject them. Do not install a candidate merely because it was found.

### Motion

- Initial hero elements reveal in a short, ordered sequence.
- Article sections use one-time transform/opacity reveals no longer than 500ms.
- Images may use a restrained mask reveal or low-distance drift.
- Reading progress and table-of-contents state provide orientation, not decoration.
- No animation manipulates layout properties, blocks reading, or hides essential content.
- `prefers-reduced-motion` removes transforms, scrubbing, and drift while preserving content and focus behavior.

### Responsive and performance budgets

- Test at 320, 390, 768, 1024, and 1440 pixels with no horizontal overflow.
- Body text is at least 16px, long-form measure is 45-75 characters, and body contrast targets 7:1.
- Tap targets are at least 44 by 44 pixels and keyboard focus is always visible.
- The article's largest media asset is at most 200KB; other images are at most 150KB each.
- Media declares intrinsic dimensions or aspect ratio, below-fold media is lazy loaded, and the hero is not lazy loaded.
- LCP target is below 2.5 seconds, INP below 200ms, and CLS below 0.1 on representative mobile conditions.

## SEO and Trust Layer

Every article ships:

- a unique title no longer than 60 characters and description no longer than 155 characters;
- a canonical URL and 1200 by 630 Open Graph image;
- `Article` and `BreadcrumbList` JSON-LD;
- `FAQPage` JSON-LD only when the same FAQ is visibly rendered;
- exactly one `h1`, sequential headings, descriptive link text, and descriptive alt text;
- visible publication and update dates;
- a numbered source list with direct links;
- internal links to relevant articles and published reviews;
- a concise affiliate relationship note when a related internal review may contain affiliate links.

The content must answer the target question early. It must not use filler introductions, keyword stuffing, invented expertise, first-person testing claims without evidence, or unsupported rankings such as "best" or "number one."

## Daily Automation

Create one active Codex cron automation attached to the local VettedSaaSBlueprint Git project. It runs daily at 03:00 Africa/Johannesburg in an isolated worktree.

Each run:

1. starts from freshly fetched remote `main` and records repository, branch, HEAD, and dirty-state evidence;
2. confirms GitHub, Vercel, `agent-reach`, `power-design-21st`, and required image-generation access without printing credentials;
3. selects the next 70/30 cycle position and researches one eligible question;
4. writes one valid `BlogPostV1` artifact and its optimized media;
5. runs schema, source, duplication, link, SEO, accessibility, responsive, focused test, typecheck, lint, and production build gates;
6. creates a focused branch and pull request, waits for required checks, and repairs only blog-scoped failures within two bounded rounds;
7. merges the pull request only after all required checks pass;
8. waits for the Git-backed Vercel production deployment;
9. verifies `/api/deployment` reports the merged SHA and confirms the live article, canonical, structured data, sitemap entry, robots policy, media, internal links, and representative responsive rendering;
10. reports the live URL and evidence, or the exact failed stage when no publication occurred.

The automation publishes at most one article per run. It never invokes Hermes, the landing-page worker, Neon workflow state, Oracle infrastructure, or `landing:run`. Repository-wide CI may continue to validate existing unrelated contracts, but the blog pipeline has no runtime or research dependency on them.

## Failure Handling

The run fails closed when:

- source quality or freshness is insufficient;
- a material claim cannot be supported or conflicting evidence cannot be resolved honestly;
- the topic duplicates or cannibalizes an existing article;
- structured content or media validation fails;
- the codebase is not based on current remote `main`;
- GitHub, required checks, merge, Vercel deployment, or live verification cannot be proven;
- generated visuals fail the accessibility, content-safety, brand, or asset-budget gates.

No local preview, generated artifact, commit, pull request, or Vercel preview is reported as a published article. A failed run does not advance the editorial cycle or create a placeholder post.

## Verification Design

### Unit and contract tests

- `BlogPostV1` accepts the complete exemplar and rejects unsafe, incomplete, duplicate, or malformed content.
- The loader includes only `published` artifacts and rejects duplicate slugs.
- Citation references resolve and every external source uses HTTPS.
- Related review links resolve only to published internal reviews.
- The ten-publication selector produces seven evergreen and three trend positions.
- Sitemap and RSS include every published article exactly once.
- Metadata and JSON-LD match the article artifact and canonical origin.

### Render and accessibility tests

- Blog index empty and populated states render.
- Article blocks render semantic headings, tables, lists, citations, and FAQs.
- Keyboard navigation, visible focus, skip link, table of contents, and reduced motion work.
- No horizontal overflow appears at the five required widths.
- Images have intrinsic sizing, useful alt text, and lazy-loading behavior appropriate to their position.

### Release verification

- Run focused blog tests, the existing full test suite, typecheck, lint, public release gate, and production build.
- Capture desktop and mobile screenshots for the index and exemplar article.
- After merge, verify the live production SHA, response status, metadata, structured data, sitemap, RSS, robots behavior, images, and internal links.

## Rollout

1. Implement the schema, registry, renderer, routes, metadata, sitemap, RSS, navigation, motion, tests, and one exemplar article on the approved feature branch.
2. Review the six generated horizontal design references and the coded desktop/mobile screenshots.
3. Deliver the implementation through a focused pull request, passing CI, merge, Vercel production deployment, and live verification.
4. Only after the production pipeline is proven, create and activate the daily 03:00 Africa/Johannesburg automation.
5. Inspect the first scheduled run as a calibration run. The automation remains active only if it publishes no more than one article and its evidence matches production.
