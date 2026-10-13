import blueprint from "./landing-pages/elevenlabs-ai-voice-generator.json";
import getResponseBlueprint from "./landing-pages/getresponse-marketing-automation.json";
import webCatalogBlueprint from "./landing-pages/how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces.json";
import campaignMonitorBlueprint from "./landing-pages/how-can-growing-brands-automate-on-brand-email-marketing-journeys.json";

import type { PageBlueprint } from "@/lib/schemas/contracts";

export const landingReleasePreviews = [
  {
    kind: "release_candidate" as const,
    batch_id: "13e50499-96c6-43bb-a8e4-cc3f29537bbd",
    page_blueprint_id: "197e3a28-1a91-480a-8d9f-c6d131d9e7a1",
    slug: webCatalogBlueprint.metadata.url_slug,
    affiliate_url: "https://try.webcatalog.io/vettedsaasblueprint",
    blueprint: webCatalogBlueprint as PageBlueprint,
  },
  {
    kind: "release_candidate" as const,
    batch_id: "13e50499-96c6-43bb-a8e4-cc3f29537bbd",
    page_blueprint_id: "3d324254-a146-4d92-8e94-510949fecc18",
    slug: campaignMonitorBlueprint.metadata.url_slug,
    affiliate_url: "https://partners.campaignmonitor.com/vettedsaasblueprint",
    blueprint: campaignMonitorBlueprint as PageBlueprint,
  },
  {
    kind: "release_candidate" as const,
    batch_id: "336e5157-fd7f-46fe-ba8b-e8e3a4b3a705",
    page_blueprint_id: "f5f995b5-a52e-4bff-94a2-2cf02bf4a218",
    slug: "elevenlabs-ai-voice-generator",
    affiliate_url: "https://try.elevenlabs.io/izj2b165mcsj",
    blueprint: blueprint as PageBlueprint,
  },
  {
    kind: "release_candidate" as const,
    batch_id: "8f956c6e-8d0e-44d4-bcb2-d0dcd2eb6d04",
    page_blueprint_id: "0f4f0fb0-a04e-4373-a836-7b0256b75dc4",
    slug: "getresponse-marketing-automation",
    affiliate_url: "https://try.getresponsetoday.com/smypvzu98eko-kfze15",
    blueprint: getResponseBlueprint as PageBlueprint,
  },
];
