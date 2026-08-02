import blueprint from "./landing-pages/elevenlabs-ai-voice-generator.json";
import getResponseBlueprint from "./landing-pages/getresponse-marketing-automation.json";

import type { PageBlueprint } from "@/lib/schemas/contracts";

export const landingReleasePreviews = [
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
