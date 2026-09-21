"use client";

import { useEffect } from "react";

import { buildPublicEventIngestUrl } from "@/lib/tracking/public-tracking-endpoints";
import { analyticsAllowedByPrivacySignals } from "@/lib/tracking/privacy";

type PublicEventType = "page_view" | "cta_click" | "faq_expand" | "link_error";

const acceptedEvents = new Set<PublicEventType>(["page_view", "cta_click", "faq_expand", "link_error"]);

function safeEventPayload(eventType: PublicEventType, pageSlug: string, extra: Record<string, unknown> = {}) {
  return {
    event_type: eventType,
    page_type: "direct_review",
    page_slug: pageSlug,
    referrer: document.referrer || null,
    page_url: location.href,
    user_agent: navigator.userAgent || null,
    ...extra,
  };
}

function sendPublicEvent(url: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }
  fetch(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}

function postEvent(eventType: PublicEventType, pageSlug: string, extras: Record<string, unknown> = {}) {
  const base = process.env.NEXT_PUBLIC_TRACKING_BASE_URL?.trim();
  let url = "/ingest/events";
  try {
    url = buildPublicEventIngestUrl(base);
  } catch {
    // Keep tracking resilient if a malformed public base is ever configured.
    url = "/ingest/events";
  }
  if (!acceptedEvents.has(eventType)) return;
  sendPublicEvent(url, safeEventPayload(eventType, pageSlug, extras));
}

export function PublicTracking({ enabled, pageSlug, ctaLinkId }: { enabled: boolean; pageSlug: string; ctaLinkId: string }) {
  useEffect(() => {
    const privacyNavigator = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (!enabled || !analyticsAllowedByPrivacySignals({
      globalPrivacyControl: privacyNavigator.globalPrivacyControl,
      doNotTrack: navigator.doNotTrack,
    })) return;

    postEvent("page_view", pageSlug);

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.('[data-track="primary-cta"]');
      if (!anchor) return;
      postEvent("cta_click", pageSlug, { link_id: ctaLinkId });
    };

    const onFaqToggle = (event: Event) => {
      const target = event.target as Element | null;
      const faq = target instanceof HTMLDetailsElement ? target : target?.closest?.("[data-track='faq-expand']");
      if (!(faq instanceof HTMLDetailsElement) || !faq.open) return;
      const faqIndexRaw = faq.getAttribute("data-faq-index") ?? "unknown";
      const faqIndex = faqIndexRaw === "unknown" ? null : Number(faqIndexRaw);
      postEvent("faq_expand", pageSlug, { faq_index: faqIndex });
    };

    const errorHandler = () => {
      postEvent("link_error", pageSlug, { error_code: "resource_error" });
    };

    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onFaqToggle, true);
    window.addEventListener("error", errorHandler);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onFaqToggle, true);
      window.removeEventListener("error", errorHandler);
    };
  }, [enabled, pageSlug, ctaLinkId]);

  return null;
}
