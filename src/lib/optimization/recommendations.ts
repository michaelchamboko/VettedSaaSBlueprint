export type TrackingSnapshot = {
  page_views: number;
  cta_clicks: number;
  affiliate_clicks: number;
  link_errors: number;
  faq_expands: number;
};

export type OptimizationRecommendation = {
  recommendation_type: string;
  risk_level: "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
  summary: string;
  proposed_change: Record<string, unknown>;
};

export function generateDailyRecommendations(snapshot: TrackingSnapshot): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];
  const ctaRate = snapshot.page_views > 0 ? snapshot.cta_clicks / snapshot.page_views : 0;
  const affiliateRate = snapshot.page_views > 0 ? snapshot.affiliate_clicks / snapshot.page_views : 0;

  if (snapshot.page_views > 0 && ctaRate < 0.03) {
    recommendations.push({
      recommendation_type: "cta_copy_review",
      risk_level: "LOW_RISK",
      summary: "CTA clicks are low relative to page views; consider testing a clearer CTA label or placement.",
      proposed_change: { focus: "cta_label", target_rate: 0.03 },
    });
  }

  if (snapshot.page_views > 0 && affiliateRate < 0.02) {
    recommendations.push({
      recommendation_type: "affiliate_path_review",
      risk_level: "LOW_RISK",
      summary: "Affiliate clicks are low; review message match and destination continuity.",
      proposed_change: { focus: "conversion_continuity", target_rate: 0.02 },
    });
  }

  if (snapshot.link_errors > 0) {
    recommendations.push({
      recommendation_type: "link_error_investigation",
      risk_level: "MEDIUM_RISK",
      summary: "Link errors were observed; inspect redirects and CTA destinations before making changes.",
      proposed_change: { focus: "redirect_health", link_errors: snapshot.link_errors },
    });
  }

  if (snapshot.faq_expands > snapshot.page_views * 0.2) {
    recommendations.push({
      recommendation_type: "faq_expansion",
      risk_level: "LOW_RISK",
      summary: "FAQ interest is high; add more pre-CTA clarity or surface common objections sooner.",
      proposed_change: { focus: "faq_visibility", faq_expands: snapshot.faq_expands },
    });
  }

  return recommendations;
}

export function defaultLowRiskUpdateEnabled(enabled: boolean) {
  return enabled === true;
}
