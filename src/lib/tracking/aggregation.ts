import type { TrackingSnapshot } from "@/lib/optimization/recommendations";

export function buildDailyMetrics(snapshot: TrackingSnapshot) {
  return {
    page_views: snapshot.page_views,
    cta_clicks: snapshot.cta_clicks,
    affiliate_clicks: snapshot.affiliate_clicks,
    link_errors: snapshot.link_errors,
    faq_expands: snapshot.faq_expands,
  };
}

export function countEventType(eventType: string, rows: Array<{ event_type: string }>) {
  return rows.filter((row) => row.event_type === eventType).length;
}
