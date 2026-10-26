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
    accent: "#b85a1b",
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
  { suffix: "signal", label: "The signal", framing: "Start with the one moment that deserves attention.", focus: "the first decision to clarify" },
  { suffix: "flow", label: "The flow", framing: "Turn scattered work into a visible next step.", focus: "how work moves between people" },
  { suffix: "proof", label: "The proof", framing: "Inspect the operating details before expanding the bet.", focus: "the evidence behind a trial" },
  { suffix: "tempo", label: "The tempo", framing: "Create a calmer rhythm for the work that repeats every week.", focus: "the recurring workflow that creates drag" },
  { suffix: "edge", label: "The edge", framing: "Use a focused capability to make the next decision more deliberate.", focus: "the constraint that determines fit" },
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

export type StudioLandingPage = ProductDefinition & {
  slug: string;
  path: `/studio/${string}`;
  variant: (typeof variants)[number];
  title: string;
  lede: string;
  steps: readonly [string, string, string];
};

export const studioLandingPages: StudioLandingPage[] = products.flatMap((product) =>
  variants.map((variant) => ({
    ...product,
    slug: `${product.slug}-${variant.suffix}`,
    path: `/studio/${product.slug}-${variant.suffix}`,
    variant,
    title: `${product.name}: ${variant.label}`,
    lede: `${product.positioning} This brief is for teams evaluating ${variant.focus}.`,
    steps: [
      "01 / Name the moment",
      "02 / Check the working detail",
      "03 / Decide the next experiment",
    ],
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
    pages: studioLandingPages.filter((page) => page.category.slug === product.category.slug),
  }));
}
