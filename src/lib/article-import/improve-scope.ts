export const repairEditPatterns = [
  "src/lib/article-import/*.ts", "scripts/import-article*.ts", "tests/article-*.test.ts",
  ".agents/skills/external-article-import/SKILL.md",
];

export function isRepairFile(file: string) {
  return /^(src\/lib\/article-import\/[a-z0-9-]+\.ts|scripts\/import-article[a-z0-9-]*\.ts|tests\/article-[a-z0-9-]+\.test\.ts)$/.test(file) ||
    file === ".agents/skills/external-article-import/SKILL.md";
}
