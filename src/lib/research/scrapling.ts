export type ScraplingCrawlPolicy = {
  robots: boolean;
  rate_limit_per_minute: number;
  depth: number;
  mode: "static" | "browser";
};

export type ScraplingRunPlan = {
  target_url: string;
  source_type: string;
  policy: ScraplingCrawlPolicy;
  status: "queued" | "running" | "failed" | "completed";
};

export function createScraplingRunPlan(target_url: string, source_type: string, policy: ScraplingCrawlPolicy): ScraplingRunPlan {
  return { target_url, source_type, policy, status: "queued" };
}

export function validateScraplingPolicy(policy: ScraplingCrawlPolicy) {
  const failures: string[] = [];
  if (!policy.robots) failures.push("robots must be obeyed");
  if (policy.rate_limit_per_minute <= 0) failures.push("rate limit must be positive");
  if (policy.depth < 1) failures.push("crawl depth must be at least 1");
  return { valid: failures.length === 0, failures };
}

export function completeScraplingRun(plan: ScraplingRunPlan) {
  return { ...plan, status: "completed" as const };
}
