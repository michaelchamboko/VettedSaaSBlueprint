import { readFile } from "node:fs/promises";
import sharp from "sharp";

import type { ContactSheetAdapter } from "./runner";

const TILE_WIDTH = 640;
const TILE_HEIGHT = 900;
const GAP = 24;

export function createSharpContactSheetAdapter(): ContactSheetAdapter {
  return {
    compose: async ({ output, draft, references }) => {
      if (references.length === 0) throw new Error("A contact sheet requires at least one selected reference capture.");
      const inputs = [draft, ...references];
      const tiles = await Promise.all(inputs.map(async (filePath) => {
        const source = await readFile(filePath);
        const sourceMetadata = await sharp(source).metadata();
        if ((sourceMetadata.width ?? 0) <= 1 || (sourceMetadata.height ?? 0) <= 1) {
          throw new Error(`Contact sheet source '${filePath}' is blank or 1x1.`);
        }
        const buffer = await sharp(source).resize({ width: TILE_WIDTH, height: TILE_HEIGHT, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        const metadata = await sharp(buffer).metadata();
        return { buffer, width: metadata.width ?? TILE_WIDTH, height: metadata.height ?? TILE_HEIGHT };
      }));
      const canvasWidth = tiles.length * TILE_WIDTH + (tiles.length - 1) * GAP;
      const composites = tiles.map((tile, index) => ({ input: tile.buffer, left: index * (TILE_WIDTH + GAP) + Math.floor((TILE_WIDTH - tile.width) / 2), top: Math.floor((TILE_HEIGHT - tile.height) / 2) }));
      return sharp({ create: { width: canvasWidth, height: TILE_HEIGHT, channels: 3, background: "#f4f1ea" } }).composite(composites).webp({ quality: 82 }).toFile(output).then(() => readFile(output));
    },
  };
}
