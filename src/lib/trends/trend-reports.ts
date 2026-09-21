export type TrendSourceKind =
  | "primary-document"
  | "vendor-announcement"
  | "news-report"
  | "industry-analysis"
  | "vendor-blog"
  | "consultancy-report";

export type TrendSource = {
  id: string;
  title: string;
  publisher: string;
  url: `https://${string}`;
  publishedAt: string;
  accessedAt: string;
  kind: TrendSourceKind;
  note?: string;
};

export type EvidenceTier = "primary-source" | "third-party-reported" | "vendor-claim" | "forecast";

export type TrendFinding = {
  claim: string;
  tier: EvidenceTier;
  sourceIds: string[];
};

export type RelatedReview = {
  program: string;
  reviewPath: `/landing-page-builders/${string}` | "/getresponse-studio";
  stage: string;
  fitLine: string;
};

export type TrendSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type TrendReportPath =
  | "/trends/ai-agents"
  | "/trends/saas-pricing"
  | "/trends/ai-native-vs-bolt-on";

export type TrendReport = {
  slug: string;
  canonicalPath: TrendReportPath;
  title: string;
  navLabel: string;
  cardTitle: string;
  cardSummary: string;
  description: string;
  summary: string;
  observedOn: string;
  sections: TrendSection[];
  relatedReviews: RelatedReview[];
  findings: TrendFinding[];
  boundaries: string[];
  sources: TrendSource[];
  nextPath?: TrendReportPath;
};

const ACCESSED = "2026-09-10";

const sharedSources = {
  bettercloud: {
    id: "bettercloud-2026",
    title: "AI and the SaaS industry in 2026",
    publisher: "BetterCloud (The Monitor)",
    url: "https://www.bettercloud.com/monitor/saas-industry/",
    publishedAt: "2026-06-23",
    accessedAt: ACCESSED,
    kind: "industry-analysis",
  },
  aviy: {
    id: "aviy-trends-2026",
    title: "SaaS Trends in 2026: What's Actually Changing in Business Software",
    publisher: "Aviy (vendor blog)",
    url: "https://aviy.ai/blog/saas-trends-2026",
    publishedAt: "2026-04-13",
    accessedAt: ACCESSED,
    kind: "vendor-blog",
  },
} satisfies Record<string, TrendSource>;

export const trendReports: TrendReport[] = [
  {
    slug: "ai-agents",
    canonicalPath: "/trends/ai-agents",
    title: "AI agents crossed from demo to deployment",
    navLabel: "AI agents",
    cardTitle: "AI agents reach production",
    cardSummary:
      "Meta's Muse, OpenAI's GPT-6 Astra, and Databricks' Agent Bricks all landed within days. A buyer-side read of the evidence, including the trust gap.",
    description:
      "September 2026 trend report: Meta Muse, GPT-6 Astra computer use, and Databricks Agent Bricks push agentic AI into mainstream buying decisions. Named sources, evidence tiers, and what to verify before delegating work to an agent.",
    summary:
      "Within one week of early September 2026, three major vendors shipped or expanded autonomous AI agents aimed at everyday business work. The capability news is real; the governance questions are the part buyers should not skip.",
    observedOn: "2026-09-10",
    sections: [
      {
        heading: "What happened",
        paragraphs: [
          "Tom's Guide reported on 9 September 2026 that Meta launched Muse, a personal AI agent that can open websites, fill forms, send emails, book travel, and make purchases through Stripe's Link payment system using one-time-use card numbers. Muse runs inside an isolated cloud VM, a separate agent called Sentinel reviews actions before they reach the internet, sensitive actions ask for permission, and Meta publishes an audit trail of what the agent did and plans to do.",
          "OpenAI introduced GPT-6 Astra in early September 2026, describing it as its strongest model for computer use and professional work. Two details matter to buyers more than benchmark tables: new enterprise admin controls (restricting approved sites and applications, controlling uploads and downloads), and confirmation policies that can require human approval before consequential actions. Enterprise access ships off by default.",
          "A secondary report from 9 September 2026 says Databricks launched Agent Bricks, a platform for building domain-specific agents, and that more than 100,000 agents have been built on it since launch. Its KARL retrieval agent is claimed to match a frontier model's accuracy at lower cost and latency. These are vendor-supplied figures reported through a third-party article; treat them as unaudited until Databricks' own materials are checked.",
        ],
      },
      {
        heading: "The adoption numbers behind the moment",
        paragraphs: [
          "BetterCloud's June 2026 industry analysis aggregates the shift: Gartner expects 80% of enterprises to have deployed GenAI-enabled applications in 2026, Deloitte projects the agentic AI market growing around 53% annually from $8.5 billion in 2026 to $45 billion by 2030, and IDC forecasts more than 1 billion actively deployed AI agents by 2029.",
        ],
        bullets: [
          "Trust asymmetry (per BetterCloud, citing its own sources): 84% of IT leaders say they trust AI agents as much as or more than humans for effective performance, while only 31% of employees are enthusiastic about them.",
          "The harder number: only 6% of companies fully trust agents to autonomously execute core business processes (reported by BetterCloud).",
          "Governance, data exposure, and shadow AI are named as the biggest barriers as agent adoption accelerates (BetterCloud).",
        ],
      },
      {
        heading: "What this means for a buying decision",
        paragraphs: [
          "The agent conversation has moved from \"does it answer well?\" to \"what is it allowed to do?\". That is a different checklist, and the vendors above have started writing it themselves: permission gates for sensitive actions, isolated execution environments, admin scoping controls, and visible audit trails.",
          "Aviy's April 2026 trend guide (a vendor blog, so use it for framing rather than fact) captures the same caution we hold: fully autonomous business software is not here, and skepticism toward anyone promising it this year is warranted. Rule-based, repetitive work — reminders, follow-ups, recurring documents — is the credible first wave.",
        ],
        bullets: [
          "Before evaluating an agent feature, list the actions it must never take unsupervised: payments, deletions, credential use, outbound communication.",
          "Ask for the audit trail before the demo. If a vendor cannot show what the agent did and why, the autonomy is not production-ready.",
          "Check the identity model: how does the agent hold credentials, and can it see them? Meta states Muse never sees underlying passwords or card numbers; ask every vendor the same question.",
          "Pilot on reversible tasks. The 6% full-trust figure is a reasonable mirror of your own risk posture.",
        ],
      },
    ],
    relatedReviews: [
      {
        program: "ElevenLabs",
        reviewPath: "/landing-page-builders/elevenlabs-conversational-ai-v4",
        stage: "Voice agents for customer calls",
        fitLine:
          "If the first agent worth evaluating answers, qualifies, and escalates live calls, the vetted review documents that workflow, its limits, and the authorized trial destination.",
      },
      {
        program: "AdCreative.ai",
        reviewPath: "/landing-page-builders/adcreative-ai-generation-v1",
        stage: "Generation work, not chat",
        fitLine:
          "A near fit for the rule-based first wave the evidence points to: creative production where the output is the work and brand rules bound it.",
      },
    ],
    findings: [
      {
        claim:
          "Meta launched Muse, a consumer-facing personal agent with purchases, approval gates, a sandboxed VM, and a separate action-review agent.",
        tier: "third-party-reported",
        sourceIds: ["tomsguide-muse"],
      },
      {
        claim:
          "OpenAI ships enterprise admin controls, confirmation policies for consequential actions, and off-by-default enterprise access with GPT-6 Astra.",
        tier: "vendor-claim",
        sourceIds: ["openai-astra", "openai-astra-work"],
      },
      {
        claim:
          "Databricks reports 100,000+ agents built on Agent Bricks since its September 2026 launch, with KARL accuracy claims matching a frontier model at lower cost.",
        tier: "vendor-claim",
        sourceIds: ["cryptonomist-karl"],
      },
      {
        claim:
          "Analyst forecasts project sustained high-growth agent adoption (Deloitte ~53% CAGR to $45B by 2030; IDC 1B+ deployed agents by 2029), while only 6% of companies fully trust autonomous execution today.",
        tier: "forecast",
        sourceIds: ["bettercloud-2026"],
      },
    ],
    boundaries: [
      "We have not independently tested Muse, Astra, Agent Bricks, or KARL. Capability descriptions come from vendor announcements and press reporting, and vendor benchmark numbers are self-reported.",
      "The Databricks figures come through a secondary news article; confirm against Databricks' own documentation before relying on them.",
      "Rollouts are partial and fast-moving — access, pricing, and safety controls described here were accurate as of 10 September 2026 and may already have changed.",
      "This report ranks no product and carries no direct affiliate link. The related-review links route to VettedSaaSBlueprint pages that hold the journal's authorized affiliate destinations; commissions fund the journal and gate nothing, per the disclosure.",
    ],
    sources: [
      {
        id: "tomsguide-muse",
        title: "Meta just launched an AI that can actually run your life online — here's what Muse can do",
        publisher: "Tom's Guide",
        url: "https://www.tomsguide.com/ai/meta-just-launched-an-ai-that-can-actually-run-your-life-online-heres-what-muse-can-do",
        publishedAt: "2026-09-09",
        accessedAt: ACCESSED,
        kind: "news-report",
      },
      {
        id: "openai-astra",
        title: "GPT-6 Astra: A new generation of intelligence",
        publisher: "OpenAI",
        url: "https://openai.com/index/gpt-6-astra/",
        publishedAt: "2026-09-10",
        accessedAt: ACCESSED,
        kind: "vendor-announcement",
      },
      {
        id: "openai-astra-work",
        title: "GPT-6 Astra: The next generation in intelligence for work",
        publisher: "OpenAI",
        url: "https://openai.com/index/gpt-6-astra-next-generation-work/",
        publishedAt: "2026-09-09",
        accessedAt: ACCESSED,
        kind: "vendor-announcement",
      },
      {
        id: "cryptonomist-karl",
        title: "Databricks AI agent KARL matches Claude Opus 4.6 while cutting costs 33%",
        publisher: "Cryptonomist",
        url: "https://en.cryptonomist.ch/2026-09-09/databricks-ai-agent-karl/",
        publishedAt: "2026-09-09",
        accessedAt: ACCESSED,
        kind: "news-report",
      },
      sharedSources.bettercloud,
      sharedSources.aviy,
    ],
    nextPath: "/trends/saas-pricing",
  },
  {
    slug: "saas-pricing",
    canonicalPath: "/trends/saas-pricing",
    title: "Per-seat budgets, per-token bills",
    navLabel: "Pricing shift",
    cardTitle: "Pricing shifts from seats to usage",
    cardSummary:
      "GitHub, Microsoft, and Anthropic all repriced AI products this year. What usage-based billing does to your forecast, and the contract clauses that protect you.",
    description:
      "September 2026 trend report: the move from per-seat SaaS pricing to usage- and outcome-based models, with the Copilot AI-credits transition, Uber's budget cap, analyst forecasts, and a buyer checklist for consumption pricing.",
    summary:
      "The predictable per-seat line in your software budget is being rewired. Three platform vendors changed billing mechanics within months, and the reporting on budget overruns shows why finance teams should treat the change as a renewal-critical issue, not a pricing-page footnote.",
    observedOn: "2026-09-10",
    sections: [
      {
        heading: "What changed, with receipts",
        paragraphs: [
          "GitHub announced on 27 April 2026 that all Copilot plans move to usage-based billing on 1 June 2026: premium request units were replaced by GitHub AI Credits consumed against token usage at published API rates. Base plan prices did not move — Copilot Business stays $19/user/month — but each seat now carries a credit allowance ($19 for Business, $39 for Enterprise), credits pool across the organization, unused credits expire monthly, and there is no automatic fallback to a cheaper model when credits run out.",
          "MarketScale reported on 9 July 2026 that Microsoft made Copilot Cowork generally available at $0.01 per credit and that Anthropic moved Claude Fable 5 to usage-based billing after 7 July 2026 while adding enterprise spend alerts — two large AI platforms switching from predictable per-seat costs to variable charges within days of each other. The same article relays Gartner's projection that AI agents will pull $234 billion away from traditional SaaS vendors by 2030.",
          "The practical failure case is well documented in reporting compiled by VarOps on 31 August 2026: Uber capped employee spending on agentic coding tools at $1,500 per person per month, per tool, after its 2026 AI budget was consumed in roughly four months (originally reported by Bloomberg and The Information). VarOps' core observation is the one to keep: vendors re-metered consumption in tokens while buyers kept budgeting in seats.",
        ],
      },
      {
        heading: "How big the gap can get",
        paragraphs: [
          "BetterCloud's June 2026 analysis, citing Gartner, forecasts AI-powered application spending near $2.52 trillion in 2026 and warns that scaling pilots to production has produced 500–1,000% cost underestimation in some cases. It also reports that AI add-ons can add 30–110% to base costs and that 68% of vendors kept AI features in premium tiers in 2025.",
          "A Redress Compliance pricing report (a consultancy with an undisclosed methodology — read it as field observation, not measurement) describes an \"attach trap\": initial AI add-on plans covering 40–70% of seats while measured weekly active use lands at 10–25% of those seats, and consumption lines exceeding budget by 20–60% in year one without caps or alerts.",
          "Bain & Company research, summarized in the VarOps piece, found that across 30+ SaaS vendors adding generative AI, roughly 35% raised per-seat pricing and bundled AI into tiers while about 65% went hybrid (seats plus an AI meter) — and none had fully shifted to usage- or outcome-based pricing at the time of that analysis.",
        ],
      },
      {
        heading: "A buyer's checklist for the new meter",
        bullets: [
          "Audit each AI-capable contract before renewal: which are already consumption-based, which are transitioning, and which have protection against mid-term repricing (per MarketScale's guidance).",
          "Demand usage telemetry by team and workflow before you accept a pool. Pooled credits can hide concentration.",
          "Set hard caps and spend alerts. GitHub's admin budget controls and Anthropic's spend alerts show the features exist; open-ended usage is a configuration choice, not a requirement.",
          "Negotiate a usage true-down right on per-seat AI add-ons so attached seats can shrink to measured use (Redress Compliance's central clause recommendation).",
          "Re-denominate the forecast itself: estimate spend in the unit the vendor meters (tokens, credits, outcomes), then validate against one month of real consumption.",
        ],
        paragraphs: [
          "None of this argues against AI spend. It argues for the same discipline cloud adoption eventually forced: measure what the meter measures, cap what can run away, and read the invoice as the instrument it is.",
        ],
      },
    ],
    relatedReviews: [
      {
        program: "Moosend",
        reviewPath: "/landing-page-builders/moosend-email-marketing-automation",
        stage: "Subscriber-based billing",
        fitLine:
          "Email platforms are where contact and usage meters bite first; the vetted fit check covers the campaign workflow, its limits, and the authorized destination.",
      },
      {
        program: "GetResponse",
        reviewPath: "/getresponse-studio",
        stage: "Lifecycle automation",
        fitLine:
          "The studio brief scopes lifecycle automation before the invoice question, with the same authorized-destination discipline as every review page.",
      },
    ],
    findings: [
      {
        claim:
          "GitHub Copilot moved all plans to usage-based billing on 1 June 2026, metering token consumption in AI credits while keeping base plan prices unchanged, with pooled credits, expiring monthly allowances, and admin budget controls.",
        tier: "primary-source",
        sourceIds: ["github-blog-billing", "github-docs-billing"],
      },
      {
        claim:
          "Microsoft priced Copilot Cowork at $0.01 per credit and Anthropic shifted Claude Fable 5 to usage-based billing after 7 July 2026.",
        tier: "third-party-reported",
        sourceIds: ["marketscale-billing"],
      },
      {
        claim:
          "Uber capped agentic coding tool spend at $1,500 per employee per month per tool after consuming its 2026 AI budget in about four months.",
        tier: "third-party-reported",
        sourceIds: ["varops-seat-token"],
      },
      {
        claim:
          "Analyst projections: AI application spending near $2.52T in 2026 (Gartner via BetterCloud); $234B of SaaS spend displaced by AI agents by 2030 (Gartner via MarketScale); consumption overruns of 20–60% in year one without caps (Redress field observation).",
        tier: "forecast",
        sourceIds: ["bettercloud-2026", "marketscale-billing", "redress-pricing"],
      },
    ],
    boundaries: [
      "Pricing mechanics quoted here are accurate as of 10 September 2026 and this category is volatile — the vendor's current pricing page and your signed contract are the only authorities.",
      "Gartner and Deloitte figures are relayed through secondary articles; we did not consult the underlying analyst reports.",
      "Redress Compliance and Aviy are commercially interested publishers (consulting and a SaaS vendor respectively); their percentages are observational, not audited research.",
      "It recommends no product and carries no direct affiliate link. It exists to sharpen the pricing questions you bring to a vendor; the related-review pages hold the authorized affiliate destinations, and commissions fund the journal without gating publication.",
    ],
    sources: [
      {
        id: "github-blog-billing",
        title: "GitHub Copilot is moving to usage-based billing",
        publisher: "GitHub Blog",
        url: "https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/",
        publishedAt: "2026-04-27",
        accessedAt: ACCESSED,
        kind: "primary-document",
      },
      {
        id: "github-docs-billing",
        title: "Usage-based billing for organizations and enterprises",
        publisher: "GitHub Docs",
        url: "https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises",
        publishedAt: "",
        accessedAt: ACCESSED,
        kind: "primary-document",
        note: "Undated live documentation; content reflects the June 2026 transition.",
      },
      {
        id: "marketscale-billing",
        title: "Anthropic, Microsoft, and Gartner signal a billing model reckoning for enterprise SaaS buyers",
        publisher: "MarketScale",
        url: "https://www.marketscale.com/industries/software-and-technology/anthropic-microsoft-and-gartner-signal-a-billing-model-reckoning-for-enterprise-saas-buyers",
        publishedAt: "2026-07-09",
        accessedAt: ACCESSED,
        kind: "news-report",
      },
      {
        id: "varops-seat-token",
        title: "We budget AI tools per seat while the vendors meter them per token",
        publisher: "VarOps",
        url: "https://varops.com/we-budget-ai-tools-per-seat-while-the-vendors-meter-them-per-token/",
        publishedAt: "2026-08-31",
        accessedAt: ACCESSED,
        kind: "industry-analysis",
      },
      {
        id: "redress-pricing",
        title: "The Smart Guide to Enterprise Generative AI Pricing in 2026",
        publisher: "Redress Compliance",
        url: "https://redresscompliance.com/enterprise-genai-pricing-report-2026",
        publishedAt: "",
        accessedAt: ACCESSED,
        kind: "consultancy-report",
        note: "Undated report page; figures described as the firm's field observations.",
      },
      sharedSources.bettercloud,
    ],
    nextPath: "/trends/ai-native-vs-bolt-on",
  },
  {
    slug: "ai-native-vs-bolt-on",
    canonicalPath: "/trends/ai-native-vs-bolt-on",
    title: "AI-native or AI bolt-on?",
    navLabel: "AI-native vs bolt-on",
    cardTitle: "AI-native beats AI bolt-on",
    cardSummary:
      "\"AI-powered\" is no longer a differentiator. The buyer-side test: does the software perform the work, or does it add a chat box to the old workflow?",
    description:
      "September 2026 trend report: the split between AI-native software and AI bolt-ons, why vertical tools and consolidation are winning, and the demo questions that expose the difference.",
    summary:
      "Buyers are increasingly sorting tools by a single question — how much of the job does the software actually finish? — and that question is quietly reshaping which categories win: AI-native over bolt-on, vertical over generic, fewer deep tools over many shallow ones.",
    observedOn: "2026-09-10",
    sections: [
      {
        heading: "The distinction buyers keep landing on",
        paragraphs: [
          "Aviy's April 2026 trend guide (a vendor blog, so weigh the framing accordingly) draws the line most cleanly: a bolt-on staples a chat box to an old product — summarize this page, rewrite that sentence — while the underlying workflow is unchanged. An AI-native product starts from the outcome: you describe the finished artifact and the software produces it.",
          "BetterCloud's June 2026 analysis reframes the same split as a market condition: AI-enabled apps are now table stakes, not a differentiator, because most SaaS vendors offer AI capabilities. The evaluation question becomes depth of integration and real business impact. Its vocabulary for the shift: systems of record becoming systems of execution.",
          "The practical consequence for a buyer is that \"has AI\" carries almost no information. Two products with identical feature bullets can differ completely in where the human still has to click.",
        ],
      },
      {
        heading: "Why vertical and consolidated stacks are pulling ahead",
        paragraphs: [
          "Both sources converge on adjacent moves. Vertical SaaS — built for one trade, shipping its terminology, compliance, and defaults — beats generic configurability because \"ready for me on day one\" beats \"configurable for anyone\" (Aviy). And consolidation: replace five shallow tools with two deep ones that talk to each other, because every extra tool is another login, another data silo, another vendor with access to your data (Aviy).",
          "BetterCloud adds the governance angle: as AI adoption outpaces oversight infrastructure, interoperability and clean APIs are becoming survival criteria. A brilliant tool that cannot talk to your payment processor recreates exactly the manual copying consolidation was meant to kill (the point Aviy makes about integration becoming non-negotiable).",
          "Security and data residency keep rising as buying criteria in this frame too — AI features raise the stakes of every data handoff between tools (Aviy; BetterCloud on shadow AI and governance as the industry's bottleneck).",
        ],
      },
      {
        heading: "Questions that expose a bolt-on in a demo",
        bullets: [
          "\"Complete this real task end to end, from my words to a finished result — without me touching a form.\" Where does the human still operate the software? That seam is the bolt-on.",
          "\"What does the AI touch?\" Native systems restructure the workflow around the model; bolt-ons append an assistant beside it. Ask how outputs flow into records, documents, and other tools.",
          "\"Which of my existing tools does it replace, and which does it need?\" Consolidation claims should shrink your stack, not extend it.",
          "\"Show me the AI's cost line.\" AI features carry variable inference costs; pricing opacity usually means the vendor has not decided who pays for them.",
          "\"What does it know about my industry out of the box?\" Vertical depth should show as defaults and compliance posture, not as a configuration tutorial.",
        ],
        paragraphs: [
          "One caution from our own reporting across the other two trend reports: the vendors best at messaging AI-nativeness are often selling you the pricing volatility of the agentic era at the same time. \"Native\" describes architecture depth, not outcome guarantees — and this is exactly the category where skepticism of marketing language should be highest.",
        ],
      },
    ],
    relatedReviews: [
      {
        program: "Carepatron",
        reviewPath: "/landing-page-builders/carepatron-practice-management-v1",
        stage: "Vertical, day-one ready",
        fitLine:
          "The clearest native-over-generic test in the catalogue: practice-specific scheduling, notes, and billing defaults, with honest limits such as mobile feature parity written on the page.",
      },
      {
        program: "Snowfire",
        reviewPath: "/landing-page-builders/snowfire-developer-sync-v3",
        stage: "AI-native workflow, owned output",
        fitLine:
          "For the workflow-itself-is-the-product case: design-system output as code your repository owns, checked against the review's documented limits.",
      },
    ],
    findings: [
      {
        claim:
          "Buyer evaluation is shifting from AI presence to AI depth: AI-enabled features are now table stakes across SaaS vendors, with governance, integration, and cost depth as the differentiators.",
        tier: "third-party-reported",
        sourceIds: ["bettercloud-2026"],
      },
      {
        claim:
          "Vertical SaaS, stack consolidation, and interoperability are trending as complementary responses to cost, security surface, and manual handoff.",
        tier: "vendor-claim",
        sourceIds: ["aviy-trends-2026"],
      },
      {
        claim:
          "The AI-native / bolt-on split is a useful demo-time test because the two architectures place the human differently inside the workflow.",
        tier: "forecast",
        sourceIds: ["aviy-trends-2026", "bettercloud-2026"],
      },
    ],
    boundaries: [
      "The trend framing leans heavily on Aviy (a SaaS vendor with a commercial stake in the narrative) and BetterCloud (an industry analysis blog); we labeled this openly rather than dressing it as neutral research.",
      "No product named or implied in this report was tested by us.",
      "Trend language compresses quickly — by the next buying cycle, today's \"AI-native\" claim may already be a checkbox, which is precisely why the demo questions above matter more than the labels.",
      "This report carries no direct affiliate link. The related-review pages it links to hold the journal's authorized affiliate destinations; commissions fund the journal without gating evidence, ranking, or publication.",
    ],
    sources: [
      sharedSources.aviy,
      sharedSources.bettercloud,
    ],
  },
];

export function getTrendReport(slug: string): TrendReport | undefined {
  return trendReports.find((report) => report.slug === slug);
}

export function listTrendReportParams(): { slug: string }[] {
  return trendReports.map((report) => ({ slug: report.slug }));
}
