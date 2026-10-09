export type StudioCategory = {
  slug: string;
  label: string;
  description: string;
  accent: string;
};

type ProductDefinition = {
  slug: string;
  name: string;
  category: StudioCategory;
  affiliateUrl: string;
  positioning: string;
  visualPosition: string;
  alt: string;
};

const categories = {
  care: {
    slug: "care-operations",
    label: "Care operations",
    description: "Practice systems for clinicians who want administration to make room for care.",
    accent: "#176b61",
  },
  commerce: {
    slug: "commerce-intelligence",
    label: "Commerce intelligence",
    description: "Signals and decision tools for teams operating the digital shelf.",
    accent: "#a84c14",
  },
  audio: {
    slug: "voice-and-audio",
    label: "Voice and audio",
    description: "Creative infrastructure for expressive, scalable audio work.",
    accent: "#b62c56",
  },
  creative: {
    slug: "creative-performance",
    label: "Creative performance",
    description: "Campaign production systems built for faster learning loops.",
    accent: "#6a3cb8",
  },
  executive: {
    slug: "decision-intelligence",
    label: "Decision intelligence",
    description: "Enterprise context for leaders making high-consequence calls.",
    accent: "#375fc9",
  },
} satisfies Record<string, StudioCategory>;

const variants = [
  { suffix: "signal", label: "The signal" },
  { suffix: "flow", label: "The flow" },
  { suffix: "proof", label: "The proof" },
  { suffix: "tempo", label: "The tempo" },
  { suffix: "edge", label: "The edge" },
] as const;

const products: ProductDefinition[] = [
  {
    slug: "carepatron",
    name: "Carepatron",
    category: categories.care,
    affiliateUrl: "https://get.carepatron.com/michaelmedium",
    positioning: "Carepatron brings scheduling, client records, documentation, billing, and practice communication into one workspace for healthcare and wellness teams.",
    visualPosition: "0% 50%",
    alt: "Layered clinical workspace art with paper forms and calm teal panels",
  },
  {
    slug: "datahawk",
    name: "DataHawk",
    category: categories.commerce,
    affiliateUrl: "https://get.datahawk.co/mau0otko9lz4-o5aq3q",
    positioning: "DataHawk connects marketplace data with analytics, alerts, and AI-guided actions for ecommerce teams.",
    visualPosition: "25% 50%",
    alt: "Layered commerce intelligence art with amber data structures",
  },
  {
    slug: "elevenlabs-studio",
    name: "ElevenLabs",
    category: categories.audio,
    affiliateUrl: "https://try.elevenlabs.io/izj2b165mcsj",
    positioning: "ElevenLabs offers AI voice tools for speech, voice creation, dubbing, and audio production.",
    visualPosition: "50% 50%",
    alt: "Layered sound and voice art with coral waveform-like forms",
  },
  {
    slug: "adcreative",
    name: "AdCreative.ai",
    category: categories.creative,
    affiliateUrl: "https://free-trial.adcreative.ai/8phdnllve4xi",
    positioning: "AdCreative.ai creates campaign assets, product visuals, and creative variations for paid advertising workflows.",
    visualPosition: "75% 50%",
    alt: "Layered creative studio art with magenta paper-cut forms",
  },
  {
    slug: "snowfire",
    name: "Snowfire AI",
    category: categories.executive,
    affiliateUrl: "https://partners.snowfire.ai/j1a8kovs1uez",
    positioning: "Snowfire AI connects business data and market signals to help enterprise leaders make governed, contextual decisions.",
    visualPosition: "100% 50%",
    alt: "Layered executive intelligence art with cool architectural light",
  },
];

type EvaluationProfile = {
  problem: string;
  task: string;
  handoff: string;
  evidence: string;
  exception: string;
  overhead: string;
  success: string;
  alternative: string;
  boundary: string;
};

const evaluationProfiles: Record<string, EvaluationProfile> = {
  carepatron: {
    problem: "Staff re-enter appointment, client-record, and billing information across separate systems.",
    task: "Use a fictional client to follow an appointment from booking through documentation and billing.",
    handoff: "Record what reception, the practitioner, and the billing owner each need to see and update.",
    evidence: "Compare the appointment, note, and invoice with your original test record. Check who can access each item and whether an export retains the information you need.",
    exception: "Reschedule the appointment and correct an invoice. Check whether staff can find the current version without creating a second client record.",
    overhead: "Count setup, staff training, template maintenance, record corrections, and any remaining double entry.",
    success: "The team can complete the client journey with fewer repeated entries and no missing information at handover.",
    alternative: "your current practice system with clearer templates and handover rules",
    boundary: "Use fictional data for the first test. Confirm privacy, access, retention, and contractual requirements for your practice before introducing client information.",
  },
  datahawk: {
    problem: "Marketplace reports take time to assemble, but the team still cannot explain which listing needs action.",
    task: "Choose one marketplace, one product listing, and one decision, such as whether a visibility change warrants investigation.",
    handoff: "Follow the source account data into a report, then ask the marketplace owner to explain the action they would take.",
    evidence: "Compare a sample of dates and metrics with the source seller account. Identify the refresh time, calculation, and whether each figure is observed or estimated.",
    exception: "Test a missing date or conflicting metric. Ask the analyst to explain the gap before anyone changes a listing or campaign.",
    overhead: "Include connector setup, metric reconciliation, report maintenance, and time spent investigating alerts.",
    success: "The marketplace owner can trace a finding to its source and use it to make a specific listing or campaign decision.",
    alternative: "seller-console reports and your existing spreadsheet or analytics workflow",
    boundary: "Confirm access to the required marketplace and metrics. Treat estimates and correlations as inputs to investigation, not proof that a change will increase sales.",
  },
  "elevenlabs-studio": {
    problem: "Recording or revising spoken content delays publication, especially when scripts change frequently.",
    task: "Use a short script from the kind of audio you publish, including a name, a number, and a difficult pronunciation.",
    handoff: "Follow the script through voice selection, generation, editorial review, correction, and export to the publishing tool.",
    evidence: "Have a reviewer compare the audio with the script. Mark mispronunciations, changed meaning, unnatural pauses, and inconsistent delivery; then test how precisely each can be corrected.",
    exception: "Change one sentence after approval. Check whether you can repair it while keeping the voice and pacing consistent with the surrounding audio.",
    overhead: "Include script preparation, regenerated passages, pronunciation edits, listening time, export, and usage charges.",
    success: "A reviewer can approve accurate, usable audio and repeat the correction process within your production budget.",
    alternative: "your current recording, voiceover, or audio-editing process",
    boundary: "Use only voices and material you have permission to use. Confirm the current commercial-use terms for the exact plan, model, and voice before publishing.",
  },
  adcreative: {
    problem: "The team needs campaign variations, but production and approval take longer than the testing cycle.",
    task: "Use one real campaign brief with a defined audience, offer, approved product facts, and required ad sizes.",
    handoff: "Follow the brief through asset generation, brand and claims review, export, and setup in the advertising platform.",
    evidence: "Check generated text and visuals against the brief, product facts, and brand rules. Verify legibility at the actual ad size and confirm rights before publishing.",
    exception: "Ask for one specific brand correction and one revised offer. Check whether the resulting variants preserve the approved product details.",
    overhead: "Count briefing, rejected variants, manual editing, compliance review, resizing, and campaign setup as production time.",
    success: "The team produces approved variations that test a clear campaign hypothesis, with manageable review and correction work.",
    alternative: "your current designer or template-based creative workflow",
    boundary: "A creative score or polished image does not establish campaign performance. Compare approved variants with a control under a defined campaign test before claiming a lift.",
  },
  snowfire: {
    problem: "Leaders receive reports from several teams but struggle to trace a recommendation to current business data.",
    task: "Choose one business question with a named decision owner, known source data, and a decision deadline.",
    handoff: "Trace the question from connected data through the recommendation to the person responsible for acting on it.",
    evidence: "Ask for the source, date, assumptions, and access permissions behind an answer. Reconcile a sample with the original business system and flag missing context.",
    exception: "Introduce a stale input or conflicting source. Check whether the answer reveals the uncertainty and gives the owner a way to investigate.",
    overhead: "Include integration work, data cleanup, permission reviews, source maintenance, and human validation of recommendations.",
    success: "The decision owner can explain the recommendation using traceable data and assign an accountable next action.",
    alternative: "your existing dashboards and analyst-led decision process",
    boundary: "Confirm the required connectors, permissions, and data-governance arrangements before a pilot. A generated recommendation still requires an accountable human decision.",
  },
};

type GuidanceStep = { number: string; title: string; body: string };

function buildGuidance(product: ProductDefinition, intent: (typeof variants)[number]["suffix"]) {
  const p = evaluationProfiles[product.slug];
  const guidance = {
    signal: {
      headline: `What should ${product.name} help you solve?`,
      lede: `${p.problem} Start here if that is a recurring problem for your team. Define the cost of leaving it unresolved before considering a new tool.`,
      guideTitle: "Define a problem worth testing",
      checks: [
        { title: "Find a recent example", body: `${p.task} Write down where the current process stalls, who is affected, and what happens when the work is late or wrong.` },
        { title: "Check the simpler option", body: `Compare the problem with ${p.alternative}. Identify whether unclear ownership, missing instructions, or a genuine capability gap causes the difficulty.` },
        { title: "Set the pass condition", body: `${p.success} Turn that outcome into a test your team can observe, and agree what result would make you stop.` },
      ],
      nextStep: `If the problem recurs and the simpler option does not resolve it, prepare one bounded ${product.name} trial. If you cannot name the problem or its owner, clarify those first.`,
    },
    flow: {
      headline: `Can ${product.name} fit your workflow?`,
      lede: `A useful trial must reach the point where someone can use the result. ${p.handoff}`,
      guideTitle: "Walk one job from start to finish",
      checks: [
        { title: "Map the handovers", body: `${p.task} List the inputs, people, and systems involved, including what starts the job and what counts as finished.` },
        { title: "Complete the normal path", body: `${p.handoff} Record every manual transfer, duplicate entry, and review step needed to finish the job.` },
        { title: "Try a correction", body: `${p.exception} Assign an owner to the recovery step and record whether the corrected result reaches the next person.` },
      ],
      nextStep: `Continue only if the team can complete and correct the whole job. Compare any extra handovers with ${p.alternative} before replacing the current process.`,
    },
    proof: {
      headline: `How can you test ${product.name} in practice?`,
      lede: `Use a representative task and an independent check before relying on the output. ${p.task}`,
      guideTitle: "Collect evidence you can inspect",
      checks: [
        { title: "Check against the source", body: p.evidence },
        { title: "Test a difficult case", body: `${p.exception} Keep both the first result and the corrected version so the reviewer can see what changed.` },
        { title: "Record a defensible result", body: `${p.success} Save the test inputs, reviewer findings, and unresolved failures. A successful example supports only the use case you actually tested.` },
      ],
      nextStep: `Proceed to a limited ${product.name} pilot only when the important failures are understood and the reviewer accepts the result. If a critical check fails, correct it and retest before expanding use.`,
    },
    tempo: {
      headline: `Will ${product.name} save work each week?`,
      lede: `Measure the full recurring job, including review and corrections. Compare it with ${p.alternative} so a faster first draft does not hide extra work elsewhere.`,
      guideTitle: "Measure the cost of a finished job",
      checks: [
        { title: "Time the current process", body: `${p.task} Record the time each person spends, the waiting time, and the number of corrections in your existing process.` },
        { title: "Count the whole trial", body: `${p.overhead} Separate one-time setup from work that will recur, and compare jobs of similar difficulty.` },
        { title: "Repeat before committing", body: `${p.exception} Run another representative job after setup. Check whether time savings persist while the quality and review standard remain the same.` },
      ],
      nextStep: `Use ${product.name} more broadly only if repeated jobs justify the ongoing cost and effort. If review or maintenance absorbs the savings, keep the current process or narrow the use case.`,
    },
    edge: {
      headline: `When is ${product.name} worth switching to?`,
      lede: `A new tool should improve a constraint that matters to your team. Compare it directly with ${p.alternative} using the same task and acceptance criteria.`,
      guideTitle: "Test the reason to change",
      checks: [
        { title: "Choose the deciding constraint", body: `${p.problem} Identify the one limitation that matters most, such as completion time, correction effort, or access to reliable information.` },
        { title: "Run a fair comparison", body: `${p.task} Use the same input and reviewer for the current approach and the trial. Include setup and manual work when recording the difference.` },
        { title: "Include the switching cost", body: `${p.overhead} Check how you would retrieve your work and return to the current process if the trial falls short.` },
      ],
      nextStep: `Choose ${product.name} only if the observed improvement resolves your deciding constraint and justifies the switching cost. An adequate current process remains a valid outcome.`,
    },
  }[intent];

  const { checks, ...copy } = guidance;
  return { ...copy, limitation: p.boundary, steps: checks.map((step, index) => ({ ...step, number: String(index + 1).padStart(2, "0") })) };
}

export type StudioLandingPage = ProductDefinition & {
  slug: string;
  path: `/studio/${string}`;
  variant: (typeof variants)[number];
  title: string;
  lede: string;
  headline: string;
  guideTitle: string;
  limitation: string;
  nextStep: string;
  steps: GuidanceStep[];
};

export const studioLandingPages: StudioLandingPage[] = products.flatMap((product) =>
  variants.map((variant) => ({
    ...product,
    slug: `${product.slug}-${variant.suffix}`,
    path: `/studio/${product.slug}-${variant.suffix}`,
    variant,
    title: `${product.name}: ${variant.label}`,
    ...buildGuidance(product, variant.suffix),
  })),
);

export function getStudioLandingPage(slug: string) {
  return studioLandingPages.find((page) => page.slug === slug) ?? null;
}

export function getStudioCategories() {
  return products.map((product) => ({
    ...product.category,
    productName: product.name,
    visualPosition: product.visualPosition,
    alt: product.alt,
    pages: studioLandingPages
      .filter((page) => page.category.slug === product.category.slug)
      .map(({ slug, path, variant }) => ({ slug, path, variant: { label: variant.label } })),
  }));
}
