export const landingCategoryAliases: Record<string, string> = {
  "affiliate-editorial": "affiliate-editorial",
  analytics: "analytics",
  "ai-voice-generator": "video-audio",
  "business-finance": "business-finance",
  "business-intelligence": "business-intelligence",
  "business-software": "business-software",
  "advertising-creative": "marketing-tools",
  "advertising": "marketing-tools",
  "commerce-payments": "commerce-payments",
  "comparison-media": "comparison-media",
  "creator-tools": "creator-tools",
  crm: "crm-tools",
  "crm-tools": "crm-tools",
  "customer-relationship-management": "crm-tools",
  "data-tools": "data-tools",
  "design-tools": "design-tools",
  "developer-tools": "developer-tools",
  "finance-hr": "finance-hr",
  "growth-tools": "growth-tools",
  healthcare: "saas-tools",
  "healthcare-practice-management": "saas-tools",
  "practice-management": "saas-tools",
  "marketing-tools": "marketing-tools",
  "media-tools": "media-tools",
  "ecommerce-analytics": "analytics",
  "product-reviews": "product-reviews",
  productivity: "productivity",
  "saas-tools": "saas-tools",
  saas: "saas-tools",
  software: "saas-tools",
  "sales-crm": "sales-crm",
  "sales-tools": "sales-tools",
  "software-development": "software-development",
  "technical-saas": "technical-saas",
  unclassified: "unclassified",
  "video-audio": "video-audio",
  "workflow-tools": "workflow-tools",
  "workforce-operations": "workforce-operations",
};

const canonicalCategories = new Set(Object.values(landingCategoryAliases));

export type LandingCategory = keyof typeof landingCategoryAliases | string;

export function normalizeLandingCategory(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const canonical = landingCategoryAliases[normalized];
  if (!canonical && !canonicalCategories.has(normalized)) {
    throw new Error(`Unsupported landing category: ${value}`);
  }
  return canonical ?? normalized;
}

export function normalizeLandingCategories(values: string[]): string[] {
  return values.map((value) => {
    try {
      return normalizeLandingCategory(value);
    } catch {
      return value.trim().toLowerCase();
    }
  });
}
