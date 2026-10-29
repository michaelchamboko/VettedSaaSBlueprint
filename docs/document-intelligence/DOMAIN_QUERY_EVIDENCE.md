---
title: "Neon repository intelligence Domain Query Evidence"
tags: [repository-intelligence, document-intelligence, domain-queries, verification]
status: active
created: 2026-08-29
reviewed: 2026-08-31
---

# Neon repository intelligence Domain Query Evidence

## Purpose

These representative queries verify that the indexed workspace exposes each required strategy domain for navigation. They do not establish semantic authority. The canonical graph, exact source anchors, classifications, and resolution states remain authoritative.

## Representative queries

All queries targeted only `Vetted SaaS B - Content Strategy and Growth Strategy`, with embeddings and PDG disabled. Zero processes is expected because this is a prose corpus plus a generated structural bridge.

| Domain | Query | Leading indexed definitions |
|---|---|---|
| Daily publishing | `daily publishing one page per day` | D03 architecture; D02 roadmap; D08 research operations |
| Buyer decisions | `customer buyer decisions decision support` | D07 editorial operations; D05 Master PRD; D02 roadmap |
| Affiliate independence | `affiliate ranking independence disclosure` | D05 Master PRD; graph builder; D09 growth strategy |
| Commercial intent | `commercial intent profitable affiliate conversion` | graph builder; D09 growth strategy; D08 research operations |
| Evidence | `evidence integrity anti hallucination` | graph builder; D06 implementation standards; D04 experience standards |
| Design and UI | `design authority approved UI catalogue` | two UI bridge section symbols; `planning.md` |
| Motion | `narrative motion scroll animation` | D11 proposal; D06 implementation standards; D04 experience standards |
| Reduced motion | `reduced motion native scrolling` | D11 proposal; D06 implementation standards; graph builder |
| Editorial operations | `editorial operations content workflow` | document inventory; D07 editorial operations; D08 research operations |
| Research | `knowledge acquisition research operations` | document inventory; D08 research operations; D07 editorial operations |
| QA | `quality assurance QA testing gates` | D10 QA plan; document inventory; runtime verifier |
| Page copy and content | `copywriting page types content strategy` | D05 Master PRD; D02 roadmap; D01 market research; D09 growth strategy; D07 editorial operations |
| SEO, AEO, and schema | `SEO AEO schema page validation` | D01 market research; D05 Master PRD; D02 roadmap; D09 growth strategy; D03 architecture |
| CRO and trust | `conversion affiliate trust disclosure` | D05 Master PRD; D04 experience standards; graph builder; D09 growth strategy |
| Analytics and experiments | `analytics experiments post deployment QA` | D09 growth strategy; D10 QA plan; D02 roadmap |
| Customer and competitor evidence | `customer research competitor evidence uncertainty` | D08 research operations; D01 market research; D07 editorial operations |

## Local source key for marketing-skill decisions

The mappings below cite the exact source document, heading display ID, and stable section UID. The source documents are unchanged.

| ID | Exact source document |
|---|---|
| D01 | `docs/Vetted-SaaS-Blueprint-01-Market-Research-and-Opportunity-Plan-v1.md` — Market Research and Opportunity Plan |
| D02 | `docs/Vetted-SaaS-Blueprint-02-Product-Roadmap-v1.md` — Product Roadmap |
| D03 | `docs/Vetted-SaaS-Blueprint-03-AI-First-System-Architecture-and-Automation-Blueprint-v1.md` — AI-First Architecture and Automation Blueprint |
| D04 | `docs/Vetted-SaaS-Blueprint-04-Design-System-and-Experience-Standards-v1.md` — Design System and Experience Standards |
| D05 | `docs/Vetted-SaaS-Blueprint-05-Master-PRD-v1.md` — Master Product Requirements Document |
| D06 | `docs/Vetted-SaaS-Blueprint-06-Agent-Technology-and-Implementation-Standards.md` — Agent Technology and Implementation Standards |
| D07 | `docs/Vetted-SaaS-Blueprint-07-Content-Intelligence-and-Editorial-Operations.md` — Content Intelligence and Editorial Operations |
| D08 | `docs/Vetted-SaaS-Blueprint-08-Knowledge-Acquisition-and-Research-Operations.md` — Knowledge Acquisition and Research Operations |
| D09 | `docs/Vetted-SaaS-Blueprint-09-Growth-and-Distribution-Strategy.md` — Growth and Distribution Strategy |
| D10 | `docs/Vetted-SaaS-Blueprint-10-QA-and-Testing-Plan.md` — QA and Testing Plan |
| D11 | `docs/Vetted-SaaS-Blueprint-11-ScrollCraft-Narrative-Motion-Strategy-and-Fork-Tailoring-Plan.md` — ScrollCraft Narrative Motion Strategy and Fork Tailoring Plan |

## External marketing-skills review

Classification: **external evidence and tool observation**, not repository fact.

The requested fork was reviewed at immutable commit [`8bfcdffb655f16e713940cd04fb08891899c47db`](https://github.com/michaelchamboko/marketingskills/tree/8bfcdffb655f16e713940cd04fb08891899c47db), whose manifests identify version `2.5.1`. The snapshot contains 45 skills, 112 reference files, 43 eval files, 93 integration guides, and 64 CLI adapters. Its local validator completed with `45` passed, `0` warnings, and `0` issues.

That validation is structural, not operational: it checks frontmatter, names, descriptions, and file length. `offers` and `public-relations` have no eval file; the observed workflows validate changed `SKILL.md` files and synchronize manifests, but do not certify every eval, integration guide, or CLI adapter. The fork has no listed GitHub Actions runs, and current upstream `main` contains 127 commits after the reviewed fork commit. This record deliberately remains pinned to the user-requested fork; it does not silently substitute upstream content.

## Incorporation decision

Classification: **user directive constrained by repository facts**.

Do not install the repository wholesale, add it as a submodule, copy its 45 skills into this strategy repository, create `.agents/product-marketing.md`, or create another planning document. That would duplicate authority, import irrelevant funnels and tools, and bypass the existing evidence graph.

Use the skills as a bounded advisory library through this sequence:

1. Select only a capability relevant to the declared page type and current lifecycle stage.
2. Supply the existing research context, page intent, claim/evidence records, disclosure state, and design authority as the capability input.
3. Permit the capability to propose copy, structure, analysis, or distribution assets; never permit it to create product truth.
4. Validate the output against the local page schema, evidence trace, ethical-conversion, trust, crawler, analytics, and QA rules.
5. Record post-deployment telemetry and feed qualified findings into the existing refresh loop.

The controlling local anchors are:

- `D06-H060` / `D06-S-16d0589bdc14` — **Page-type intent mapping**.
- `D07-H004` / `D07-S-b079578cb449` — **Editorial thesis**.
- `D08-H082` / `D08-S-f3e602eb7c58` — **Research → context → page operating path**.
- `D09-H014` / `D09-S-fd1a6d4a30cf` — **The publish → deploy → asset → telemetry → refresh loop**.
- `D10-H022` / `D10-S-574481d73201` — **Content QA**.

## External Hormozi-skills review

Classification: **external evidence, tool observation, and user directive**, not repository fact.

The requested fork was reviewed at immutable commit [`25ec2b0789ae8c760b45f577024782ff399983a6`](https://github.com/michaelchamboko/hormozi-skills/tree/25ec2b0789ae8c760b45f577024782ff399983a6). Its README describes 17 skills, a full orchestrator with five subagents, and 11 standard outputs that include a pricing artifact. The reviewed repository is MIT-licensed, but no releases, GitHub Actions runs, or executable evaluation suite were observed. Its full orchestrator and subagent instructions use Claude-specific runtime assumptions and repeatedly assume control over price, guarantees, bonuses, scarcity, and checkout. Those assumptions do not fit an independent affiliate publisher.

Do not install or copy the repository wholesale, invoke its full orchestrator, or treat it as evidence. Invoke only the mapped individual skills when their lifecycle stage is active. Their output is advisory copy and must pass the local evidence, independence, disclosure, page-type, traceability, and QA gates.

## Affiliate-safe Hormozi output map

The ten requested business artifacts map to individual calls as follows. The omitted `PRICING.md` output and `pricing-strategy` skill are deliberate: Vetted SaaS B does not control affiliate-product prices. Monetary value anchoring, price construction, discounting, price reveals, guarantee construction, fake scarcity, and seller-controlled urgency are also excluded.

| Output | Individual skill call | Disposition | Affiliate-safe use | Exact local authority anchor |
|---|---|---|---|---|
| `MARKET_RESEARCH.md` | `market-research` | Use during demand and evidence | Organise source-linked pain, demand, alternatives, language, uncertainty, and stopping conditions; never simulate interviews, quotes, or demand. | D01-H042 / `D01-S-065351a4fc18` — Customer-question discovery |
| `OFFER.md` | `hormozi-offer` | Adapt as reader value proposition | Define the decision problem, audience, obstacles, evidence-backed solution path, and why the page is useful; do not construct a vendor offer, price, guarantee, or checkout. | D04-H015 / `D04-S-b993de145122` — Conversion means informed progress; D07-H100 / `D07-S-f93bda382dbf` — Editorial traceability |
| `OFFER_ANGLES.md` | `offer-angles` | Use after evidence feasibility | Generate and rank evidence-safe positioning frames. Numeric outcomes, time-to-result, speed, ease, and first-person proof require matching evidence or must be removed. | D05-H043 / `D05-S-55abba19db2e` — Claim-type verification rules; D07-H100 / `D07-S-f93bda382dbf` — Editorial traceability |
| `OFFER_AUDIT.md` | `audit-offer` | Replace commercial scoring with local audit | Score evidence integrity, reader fit, page-type fit, ranking independence, disclosure, clarity, and CTA quality. Do not score price leverage, discount depth, scarcity, or seller-controlled guarantees. | D05-H127 / `D05-S-8b31a6de2a36` — Ranking independence; D05-H128 / `D05-S-5f4ed2cdc87a` — Disclosure; D10-H022 / `D10-S-574481d73201` — Content QA |
| `VALUE_PERCEPTION.md` | `value-perception` | Adapt for clarity and framing | Improve naming, information hierarchy, specificity, packaging, and cognitive ease without assigning monetary values or inventing outcome certainty. | D04-H015 / `D04-S-b993de145122` — Conversion means informed progress; D07-H100 / `D07-S-f93bda382dbf` — Editorial traceability |
| `BONUS_STACK.md` | `bonus-stack` | Conditional; otherwise mark not applicable | Structure only Vetted-owned, optional decision aids that remove a documented reader obstacle. Never invent vendor bonuses, claim ownership of vendor assets, or attach arbitrary monetary values. | D04-H015 / `D04-S-b993de145122` — Conversion means informed progress; D10-H022 / `D10-S-574481d73201` — Content QA |
| `OBJECTIONS.md` | `objection-destroyer` | Use directly with evidence constraints | Surface valid objections and hidden beliefs, identify the evidence needed for a belief shift, and draft honest responses. Preserve objections that evidence cannot resolve; never pressure the reader. | D04-H015 / `D04-S-b993de145122` — Conversion means informed progress; D05-H128 / `D05-S-5f4ed2cdc87a` — Disclosure |
| `PITCH.md` | `hormozi-pitch` | Adapt as decision narrative | Produce short, medium, and long evidence-led explanations of who the recommendation helps, what trade-offs remain, and the next qualified action. Strip pricing strategy, guarantees, scarcity, and urgency. | D07-H100 / `D07-S-f93bda382dbf` — Editorial traceability; D05-H128 / `D05-S-5f4ed2cdc87a` — Disclosure |
| `HOOKS.md` | `hormozi-hooks` | Use after canonical evidence and page intent | Generate and rank hooks across the supported types. Numbers, timeframes, outcomes, and first-person formulations require direct proof; derivative hooks preserve provenance and disclosure. | D09-H017 / `D09-S-9d1beb7ae7bc` — Asset integrity; D07-H100 / `D07-S-f93bda382dbf` — Editorial traceability |
| `LANDING_PAGE.md` | `landing-page-copy` | Use as a copy pass inside a declared page contract | Draft section-level copy inside the approved Decision Hub, Solution Hub, or Decision Scenario structure. Do not replace the local page schema with a generic sales-page template. | D06-H060 / `D06-S-16d0589bdc14` — Page-type intent mapping; D10-H022 / `D10-S-574481d73201` — Content QA |

Decision-relevant vendor pricing is not a Hormozi-generated persuasion device. When price materially affects a comparison, Vetted may report the vendor's factual current price only under `D05-H043` / `D05-S-55abba19db2e`: official pricing page first, with current date and region. Price hypotheses, invented savings, monetary bonus values, and optimisation recommendations remain prohibited.

## Affiliate-safe Hormozi invocation chain

| Stage | Calls when applicable | Required input and output boundary |
|---|---|---|
| 1. Demand and evidence | `market-research` | Consume source records and return a sourced pain and demand map; no simulated language, product truth, or page copy. |
| 2. Positioning | `hormozi-offer`, then `offer-angles` | Consume the approved audience, problem, evidence, alternatives, and page intent; return value-proposition and angle proposals without pricing, guarantees, scarcity, or urgency. |
| 3. Review and objections | `audit-offer`, `value-perception`, conditional `bonus-stack`, then `objection-destroyer` | Audit against local evidence and independence; use `bonus-stack` only for Vetted-owned decision aids; preserve unresolved objections. |
| 4. Copy production | `hormozi-pitch`, `hormozi-hooks`, then `landing-page-copy` | Produce traceable pitch, hook, and page-copy proposals inside the declared local page contract, with disclosure and qualifiers intact. |
| 5. Local acceptance | No external skill decides acceptance | Run D10 content and evidence QA. Reject unsupported claims, vendor impersonation, fake proof, pressure tactics, missing disclosure, and page-contract drift. |

All ten files are working artifacts, not canonical business truth. A skill is called only when its stage has the required evidence inputs; `BONUS_STACK.md` may validly state that no affiliate-safe bonus is applicable.

## Complete 45-skill disposition

Every skill in the reviewed fork is accounted for. “Use now” means it can support page creation once filtered through local authority. “Post-deploy” means it is inactive until a verified page or release reaches that lifecycle stage. “Authority first” means the current corpus does not authorize it as a page-production capability.

| Skill | Disposition | Tailored use | Exact local authority anchor |
|---|---|---|---|
| `product-marketing` | Use now | Translate existing product, audience, proof, and positioning records into a page brief; do not create its proposed parallel context file. | D08-H082 / `D08-S-f3e602eb7c58` — Research → context → page operating path |
| `customer-research` | Use now | Structure question discovery, language capture, evidence quality, bias, confidence, and freshness checks. | D01-H042 / `D01-S-065351a4fc18` — Workstream B; D08-H064 / `D08-S-f7b4b4cf7fae` — Customer language |
| `competitor-profiling` | Use now | Capture source-linked competitor observations and update dates; preserve uncertainty and evidence class. | D08-H038 / `D08-S-88443b2fa488` — Evidence sources; D08-H060 / `D08-S-cbd40ce849ac` — Stopping conditions |
| `competitors` | Use now | Support evidence-backed alternatives and comparison modules inside the approved page types; never manufacture SEO comparison pages from thin data. | D07-H018 / `D07-S-64cb6b73237d` — Three page types; D02-H029 / `D02-S-f4d07d3b5b2b` — Decision Scenario |
| `content-strategy` | Use now | Cluster verified decision questions and identify format gaps; real demand and evidence feasibility outrank keyword opportunity. | D07-H004 / `D07-S-b079578cb449` — Editorial thesis; D07-H032 / `D07-S-7bf3f5c01031` — Search volume is not demand |
| `site-architecture` | Use now | Propose hierarchy, URL, navigation, and internal-link improvements within the approved page taxonomy. | D02-H027 / `D02-S-7d314a4d9107` — Decision Hub; D02-H028 / `D02-S-d6afb3c2c118` — Solution Hub; D02-H029 / `D02-S-f4d07d3b5b2b` — Decision Scenario |
| `copywriting` | Use now | Draft from declared intent, evidence, page blocks, and CTA requirements; generic landing-page formulas are not defaults. | D07-H100 / `D07-S-f93bda382dbf` — Page block → intent → claim → evidence; D04-H142 / `D04-S-1497bdd3519d` — CTA language |
| `copy-editing` | Use now | Improve clarity and specificity without changing claim meaning, certainty, evidence, disclosure, or ranking logic. | D05-H150 / `D05-S-92035809db89` — Editorial quality; D03-H126 / `D03-S-37a05890dc62` — Claim–evidence trace |
| `seo-audit` | Use now | Audit technical discoverability, on-page structure, internal links, and quality after decision intent and evidence are valid. | D05-H131 / `D05-S-12592a0a7e0f` — SEO/AEO; D01-H047 / `D01-S-dc781f27e5d1` — AI discoverability and crawl readiness |
| `ai-seo` | Use now | Improve answer extractability, entities, citations, freshness, and machine-readable structure; do not import volatile claims or override crawler policy. | D01-H052 / `D01-S-2a7ba1dff5bc` — Immediate AEO objective; D08-H065 / `D08-S-c0206b8ba027` — SEO/AEO support |
| `schema` | Use now | Propose schema matching visible page content; require architecture validation and reject misleading or unsupported markup. | D03-H026 / `D03-S-611b9faf8ff1` — Content/page schema; D03-H124 / `D03-S-4562ad91d48e` — Page schema validation |
| `cro` | Use now | Diagnose evidence, comprehension, decision, and CTA friction; optimize informed progress, not pressure or affiliate-click volume. | D04-H015 / `D04-S-b993de145122` — Conversion as informed progress; D02-H077 / `D02-S-9df7a87f1da5` — Ethical conversion |
| `analytics` | Use now | Define events, properties, validation, and privacy around evidence use, decision assistance, qualified progression, distribution, and refresh. | D09-H043 / `D09-S-8b1806b1633b` — Measurement; D01-H070 / `D01-S-6373ba5a30e5` — SEO/AEO metrics |
| `ab-testing` | Use now after deploy | Form explicit hypotheses and guardrail metrics; require QA, sufficient traffic, and no experiment that weakens evidence or trust. | D09-H052 / `D09-S-aa025c11f613` — Experiment governance; D10-H030 / `D10-S-ff63e18c03a5` — Trust QA |
| `marketing-psychology` | Use now | Explain genuine decision behaviour and reduce cognitive burden; reject scarcity, social-proof theatre, or deceptive pressure. | D04-H146 / `D04-S-bce5e361ab6f` — Approved trust signals; D04-H147 / `D04-S-ae3b28670fa2` — Prohibited trust theatre |
| `lead-magnets` | Post-deploy | Offer an optional saved or personalized decision asset only after the public page has delivered its core reasoning value. | D05-H119 / `D05-S-c480477b724b` — Email capture rules; D02-H075 / `D02-S-53867c4d20e5` — Decision assets and email capture |
| `free-tools` | Post-deploy | Consider only evidence-preserving calculators, checklists, or decision aids with a defined maintenance owner and data boundary. | D02-H021 / `D02-S-96cd09713553` — Replaceable tools; D08-H013 / `D08-S-1f7042c67a99` — Capability, not tool captivity |
| `emails` | Post-deploy | Deliver requested value, saves, updates, and transparent follow-up; no generic nurture sequence without consent and purpose. | D09-H023 / `D09-S-cdf2b5d38689` — Email tied to requested value; D05-H119 / `D05-S-c480477b724b` — Email capture rules |
| `social` | Post-deploy | Compile derivative assets from published evidence and preserve provenance, qualifiers, disclosures, and source links. | D09-H015 / `D09-S-2692ad9510c0` — Asset compiler; D09-H039 / `D09-S-7f3963ff8b23` — Trust travels with the work |
| `image` | Post-deploy | Produce or optimize evidence-faithful images from approved design tokens and accessible content; never replace required text or proof. | D04-H023 / `D04-S-c52a0e3d7a64` — Taste skill role; D09-H024 / `D09-S-6e7e74e1681e` — Visual distribution |
| `video` | Post-deploy | Convert verified page reasoning into concise video while preserving evidence, caveats, disclosure, and a non-video equivalent. | D09-H015 / `D09-S-2692ad9510c0` — Asset compiler; D11-H025 / `D11-S-383deaf5e52d` — Content/evidence before motion |
| `community-marketing` | Post-deploy | Listen for decision questions and share useful published evidence without disguised promotion or extractive participation. | D07-H006 / `D07-S-d75471cb9b96` — User intent first; D01-H042 / `D01-S-065351a4fc18` — Customer-question discovery |
| `co-marketing` | Post-deploy | Use only with explicit partner authority, disclosure, editorial independence, and source ownership. | D03-H113 / `D03-S-25e0ee293d19` — Affiliate independence; D05-H128 / `D05-S-5f4ed2cdc87a` — Disclosure |
| `launch` | Post-deploy | Coordinate release communications only after deployment and production QA evidence exist. | D09-H014 / `D09-S-fd1a6d4a30cf` — Publish → deploy → asset → telemetry → refresh; D10-H031 / `D10-S-46e96ab90898` — Distribution QA |
| `directory-submissions` | Post-deploy | Submit only accurate, maintained product facts with consistent canonical URLs and disclosures. | D09-H039 / `D09-S-7f3963ff8b23` — Trust travels with the work; D10-H031 / `D10-S-46e96ab90898` — Distribution QA |
| `public-relations` | Post-deploy | Use evidence-backed claims and named source ownership; the missing fork eval prevents treating this skill as certified. | D03-H126 / `D03-S-37a05890dc62` — Claim–evidence trace; D10-H021 / `D10-S-39a69c10e9e4` — Evidence QA |
| `ads` | Post-deploy, bounded | Run only explicit, measured tests against verified pages; commercial spend cannot alter ranking or evidence. | D09-H028 / `D09-S-864cd50359a9` — Bounded paid tests; D05-H130 / `D05-S-3f2df41fbd48` — Trust before conversion |
| `ad-creative` | Post-deploy, bounded | Derive claims and variants from verified page evidence; require landing-message match and disclosure. | D09-H028 / `D09-S-864cd50359a9` — Bounded paid tests; D10-H021 / `D10-S-39a69c10e9e4` — Evidence QA |
| `referrals` | Post-deploy, authority first | Customer referral mechanics may be evaluated later; affiliate-program advice cannot redefine editorial independence or disclosure. | D01-H078 / `D01-S-6d41c4b16061` — Affiliate trust; D05-H128 / `D05-S-5f4ed2cdc87a` — Disclosure |
| `marketing-ideas` | Post-deploy | Use as a constrained option generator after evidence and current bottleneck are known; ideas do not become requirements. | D09-H052 / `D09-S-aa025c11f613` — Experiment governance; D08-H027 / `D08-S-88dc49bcf374` — Single-agent default |
| `programmatic-seo` | Post-deploy, authority first | Consider only after the three-page operating model is proven and a high-quality evidence template can be maintained without thin pages. | D07-H018 / `D07-S-64cb6b73237d` — Three page types; D07-H118 / `D07-S-761a1d533ac1` — Quality standard |
| `pricing` | Authority first | Pricing research may inform later commercial adjudication; no current page may invent or change a pricing model. | D08-H066 / `D08-S-63d403698d77` — Commercial research subordinate to truth |
| `offers` | Authority first | No offer architecture is authorized; the fork also lacks an eval for this skill. | D02-H077 / `D02-S-9df7a87f1da5` — Ethical conversion |
| `onboarding` | Authority first | Product onboarding is outside current page-production scope. | D06-H060 / `D06-S-16d0589bdc14` — Page-type intent mapping |
| `signup` | Authority first | Signup-flow optimization is not an authorized substitute for public decision value. | D05-H119 / `D05-S-c480477b724b` — Email capture rules |
| `paywalls` | Authority first | No paywall model is established in the source corpus. | D02-H077 / `D02-S-9df7a87f1da5` — Ethical conversion |
| `popups` | Authority first | No popup pattern is approved; any future use requires design, consent, and non-deception authority. | D04-H147 / `D04-S-ae3b28670fa2` — Prohibited trust theatre |
| `churn-prevention` | Authority first | Retention and cancellation flows are outside current content-page scope. | D06-H060 / `D06-S-16d0589bdc14` — Page-type intent mapping |
| `sms` | Authority first | No SMS channel, consent model, or operating owner is established. | D09-H023 / `D09-S-cdf2b5d38689` — Requested-value communication |
| `cold-email` | Authority first | Outbound prospecting is not part of the approved page and distribution loop. | D09-H014 / `D09-S-fd1a6d4a30cf` — Publish → deploy → asset → telemetry → refresh |
| `prospecting` | Authority first | B2B account prospecting is outside current buyer-content production. | D07-H029 / `D07-S-8b61f008aae6` — Global intent |
| `revops` | Authority first | Revenue-operations systems are outside this strategy repository and require separate system authority. | D02-H021 / `D02-S-96cd09713553` — Replaceable tools |
| `sales-enablement` | Authority first | Sales collateral and sales-process design are not current page outputs. | D07-H018 / `D07-S-64cb6b73237d` — Three page types |
| `aso` | Authority first | App-store optimization is irrelevant unless an approved app-store product and channel are introduced. | D09-H014 / `D09-S-fd1a6d4a30cf` — Current distribution loop |
| `marketing-plan` | Do not use as an artifact | Its diagnostic prompts may be consulted, but creating another marketing plan would duplicate D01, D05, D07, D08, and D09 and violate UD-007. | UD-007 — Marketing-skill integration directive |

## Mandatory adaptations before page use

| Generic marketing-skills default | Local decision | Controlling exact source anchor |
|---|---|---|
| Create `.agents/product-marketing.md` as persistent context | Do not create it here. Consume the existing research context and canonical graph; the application repository may later expose a generated, non-authoritative context payload. | D08-H082 / `D08-S-f3e602eb7c58` — Research → context → page; D06-H018 / `D06-S-1c96d65d823b` — Anti-hallucination |
| Prioritize searchable topics before shareable topics | Real decision demand → evidence feasibility → page type → SEO/AEO. Search volume never defines demand. | D07-H004 / `D07-S-b079578cb449` — Editorial thesis; D07-H032 / `D07-S-7bf3f5c01031` — Search volume is not demand |
| Use a generic landing-page or comparison-page structure | Use Decision Hub, Solution Hub, or Decision Scenario contracts and their required block order. | D02-H027 / `D02-S-7d314a4d9107`; D02-H028 / `D02-S-d6afb3c2c118`; D02-H029 / `D02-S-f4d07d3b5b2b` |
| Optimize one primary conversion goal | Optimize informed progress across understanding, comparison, save/export, and only then qualified affiliate action. | D04-H015 / `D04-S-b993de145122` — Conversion as informed progress; D04-H143 / `D04-S-058f980dea13` — Affiliate action after evidence |
| Add social proof as a CRO default | Only approved, verifiable trust signals are allowed; no unsupported badges, counters, ratings, urgency, or authority theatre. | D04-H146 / `D04-S-bce5e361ab6f`; D04-H147 / `D04-S-ae3b28670fa2` |
| Gate a lead magnet or core template | Deliver the page’s core reasoning publicly. Gate only an optional save, personalization, or requested derivative with clear value and consent. | D05-H119 / `D05-S-c480477b724b`; D02-H077 / `D02-S-9df7a87f1da5` |
| Apply generic AI-crawler recommendations | Use the local allow/monitor/rate-limit/block/charge policy and validate current external claims before use. | D01-H047 / `D01-S-dc781f27e5d1` — AI discoverability and crawl readiness; D08-H067 / `D08-S-c9e114639f48` — Research controls |
| Generate schema from a marketing template | Schema must match visible content, page type, evidence, and disclosure, then pass architecture validation. | D03-H026 / `D03-S-611b9faf8ff1`; D03-H124 / `D03-S-4562ad91d48e`; D03-H129 / `D03-S-31581f618b44` |
| Scale programmatic pages when a template exists | Defer until quality, evidence, uniqueness, maintenance, and the connected three-page model are proven. | D07-H118 / `D07-S-761a1d533ac1` — Quality standard; D07-H119 / `D07-S-945e2e544de5` — Prohibited editorial behaviours |
| Install offered integrations and CLI adapters | Do not execute downloaded adapters or accept tool-specific lock-in. Select capabilities, review source, sandbox execution, and keep tools replaceable. | D02-H021 / `D02-S-96cd09713553`; D06-H088 / `D06-S-1f23b392d039`; D08-H028 / `D08-S-2985dcc26daf` |

## Page-production capability chain

| Stage | Permitted marketing capabilities | Required output boundary |
|---|---|---|
| Demand and evidence | `customer-research`, `competitor-profiling`, `competitors`, `content-strategy` | Source-linked question, evidence, uncertainty, and stop-condition records; no page draft yet. |
| Intent and structure | `product-marketing`, `site-architecture`, `seo-audit`, `ai-seo`, `schema` | Declared page type, intent, audience, evidence feasibility, URL/link proposal, and schema proposal. |
| Draft and experience | `copywriting`, `copy-editing`, `marketing-psychology`, `cro` | Copy and CTA proposals bound to page blocks, claim/evidence IDs, design authority, trust, disclosure, and accessibility. |
| Measurement and QA | `analytics`, `ab-testing`, plus the audit skills above | Validated event contract, guardrail metrics, schema/content/evidence/trust QA, and a deployable page. |
| Distribution and refresh | The 16 post-deploy skills | Derivative assets that preserve provenance and disclosure, with telemetry returned to D09’s refresh loop. |

## Acceptance boundary

A marketing-assisted page is not acceptable unless it has a declared page type, traceable claims and evidence, visible uncertainty where applicable, an approved CTA and disclosure state, valid schema, trust and content QA, analytics aligned to informed progress, and post-deployment evidence before distribution or experimentation. Marketing skill output is always a proposal until those local gates pass.

## Stable-UID impact evidence

`impact-document-change` was exercised before the marketing-skills integration against its five controlling source sections:

- `D06-S-16d0589bdc14` — page-type intent mapping: D06 review targets and its existing claim relationship were returned.
- `D07-S-b079578cb449` — editorial thesis: no pre-existing relationship or conflict was inferred from silence.
- `D08-S-f3e602eb7c58` — research → context → page operating path: D08 review targets and its existing claim relationship were returned.
- `D09-S-fd1a6d4a30cf` — publish → deploy → asset → telemetry → refresh: D09 review targets and its existing claim relationship were returned.
- `D10-S-574481d73201` — content QA: no pre-existing relationship or conflict was inferred from silence.

The new UD-007 edges make the marketing integration explicit without changing those source sections. This proves the no-commit impact mechanism can return inbound and outbound relationships, affected documents, conflicts, and required review targets without relying on `git diff` or a baseline commit.

Before the Hormozi adapter was added, `impact-document-change` was exercised against the initial nine-section proposal, which reported zero conflicts. Independent review then identified the binding ranking-independence and asset-integrity authorities, so the final requirement set is: `D01-S-065351a4fc18`, `D04-S-b993de145122`, `D05-S-55abba19db2e`, `D05-S-8b31a6de2a36`, `D05-S-5f4ed2cdc87a`, `D06-S-16d0589bdc14`, `D07-S-f93bda382dbf`, `D08-S-f3e602eb7c58`, `D09-S-9d1beb7ae7bc`, and `D10-S-574481d73201`. A pre-change impact check on asset integrity reported zero conflicts; ranking independence correctly returned the existing unresolved commercial-intent conflict with UD-003 and its D03, D05, D09, D10, and D11 review scope. UD-008 does not adjudicate that tension. Its ten confirmed `constrains` edges make the affiliate-safe copy boundary explicit without amending any source strategy document.

## Interpretation boundary

Successful retrieval proves discoverability only. A search ranking, absent process, or successful index must never be promoted to a repository fact, verified dependency, or resolved conflict without the corresponding canonical record and direct evidence anchor.
