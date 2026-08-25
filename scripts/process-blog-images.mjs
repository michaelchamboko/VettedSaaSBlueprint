import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const sourceRoot = "C:/Users/micha/.codex/generated_images/01a039b6-9883-7902-baf0-0aac1afefd15";
const outputRoot = path.join(process.cwd(), "public", "blog", "images");

const images = [
  ["exec-653a66dc-6e6a-4eb6-b041-5a6a32031bd9.png", "voice-cloning-production-test-hero.webp", 1600, 1000],
  ["exec-cd2f96a8-b8d8-4042-ab89-8470b0ad3e5b.png", "voice-cloning-control-room.webp", 1200, 900],
  ["exec-a57650eb-cf76-429f-9b1b-7e73200676e0.png", "email-workflow-fit-hero.webp", 1600, 1000],
  ["exec-0061de17-6431-4c5b-89c6-5abf78b964db.png", "email-workflow-data-map.webp", 1200, 900],
  ["exec-860e6ec0-c869-4af8-b37c-1419e565a138.png", "ecommerce-segmentation-audit-hero.webp", 1600, 1000],
  ["exec-dfd5fbbb-b1ea-401c-905f-c4ba30a6b288.png", "ecommerce-field-audit.webp", 1200, 900],
  ["exec-dd7de7b1-50a7-43df-a8b9-fe84aee8ce40.png", "practice-migration-hero.webp", 1600, 1000],
  ["exec-5a505bb6-a7c3-46c0-a595-2ffcbfc49807.png", "practice-migration-reconciliation.webp", 1200, 900],
  ["exec-7b6fddeb-f4fb-4c64-89e9-cd05d4e57870.png", "marketplace-profit-audit-hero.webp", 1600, 1000],
  ["exec-ef43c8aa-e90f-4e49-8acc-5a1f1eb877fc.png", "marketplace-profit-lineage.webp", 1200, 900],
  ["exec-557a8bf5-2fe6-4954-9834-68ae3bea155a.png", "creative-score-hypothesis-hero.webp", 1600, 1000],
  ["exec-96f3cee1-bdc3-455f-baf7-a3a38acbbcd2.png", "creative-experiment-evidence.webp", 1200, 900],
  ["exec-100cd72f-632a-46b4-a439-3091ef73a958.png", "ai-dubbing-qa-hero.webp", 1600, 1000],
  ["exec-a95c4200-6639-46c2-9fe7-27eee94562bf.png", "ai-dubbing-language-package.webp", 1200, 900],
  ["exec-b7a2e537-2c26-4437-b192-48d1fa5508be.png", "patient-portal-controls-hero.webp", 1600, 1000],
  ["exec-8a4c7f56-cc5f-4b23-90ee-4212d17af890.png", "patient-portal-journey.webp", 1200, 900],
  ["exec-b5bc2534-00c3-4d0a-a576-2323a3441e22.png", "ai-evidence-chain-hero.webp", 1600, 1000],
  ["exec-a55136d0-13c0-4b68-bd7b-b7b96dba2b89.png", "ai-evidence-records.webp", 1200, 900],
  ["exec-dda3336b-2f63-460b-8726-02a853425811.png", "abandoned-cart-data-hero.webp", 1600, 1000],
  ["exec-9f901c9c-2b1f-414e-983e-9f33cc77c6b0.png", "abandoned-cart-event-chain.webp", 1200, 900],
];

await mkdir(outputRoot, { recursive: true });

for (const [source, destination, width, height] of images) {
  await sharp(path.join(sourceRoot, source))
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .webp({ quality: 82, effort: 5 })
    .toFile(path.join(outputRoot, destination));
}

console.log(`Processed ${images.length} imagegen assets into ${outputRoot}.`);
