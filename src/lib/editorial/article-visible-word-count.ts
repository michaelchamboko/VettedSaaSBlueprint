import {
  getDirectReviewRendererKind,
  getRenderableSectionOrder,
  shouldRenderReferenceSubheadline,
} from "../landing/reference-composed";
import { pageBlueprintSchema, type PageBlueprint } from "../schemas/contracts";

export const LONG_FORM_AFFILIATE_MIN_WORDS = 1_800;
export const LONG_FORM_AFFILIATE_MAX_WORDS = 2_300;

export type VisibleArticleWordCount = {
  wordCount: number;
  visibleText: string;
  visibleProsePaths: string[];
};

type LongFormAffiliateArticleSignals = {
  format: string;
  approvedAffiliateUrl?: string | null;
};

class VisibleTextCollector {
  readonly #blocks: string[] = [];
  readonly #seen = new Set<string>();
  readonly #paths: string[] = [];
  readonly #seenPaths = new Set<string>();

  add(path: string, value: string | null | undefined): void {
    if (!value) return;
    const normalized = value
      .replace(/\[([^\]]+)\]\(\s*https?:\/\/[^)\s]+(?:\s+["'][^"']*["'])?\s*\)/giu, "$1")
      .replace(/<https?:\/\/[^>]+>/giu, " ")
      .replace(/\bhttps?:\/\/[^\s<>()\[\]{}]+/giu, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (!normalized) return;
    if (!this.#seenPaths.has(path)) {
      this.#seenPaths.add(path);
      this.#paths.push(path);
    }
    if (this.#seen.has(normalized)) return;
    this.#seen.add(normalized);
    this.#blocks.push(normalized);
  }

  result(): VisibleArticleWordCount {
    const visibleText = this.#blocks.join("\n\n");
    return {
      wordCount: visibleText.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)?.length ?? 0,
      visibleText,
      visibleProsePaths: this.#paths,
    };
  }
}

function hasApprovedHeroVisual(blueprint: PageBlueprint): boolean {
  return blueprint.hero.visual_asset?.approval_status === "approved" &&
    blueprint.hero.visual_asset.approved_by_owner;
}

function addBenefits(collector: VisibleTextCollector, blueprint: PageBlueprint, includeFeature: boolean): void {
  for (const [index, benefit] of blueprint.benefits.entries()) {
    collector.add(`benefits.${index}.benefit_title`, benefit.benefit_title);
    collector.add(`benefits.${index}.benefit_description`, benefit.benefit_description);
    if (includeFeature) collector.add(`benefits.${index}.feature_supporting_it`, benefit.feature_supporting_it);
  }
}

function addWorkflow(collector: VisibleTextCollector, blueprint: PageBlueprint): void {
  for (const [index, step] of blueprint.how_it_works.entries()) {
    collector.add(`how_it_works.${index}.title`, step.title);
    collector.add(`how_it_works.${index}.description`, step.description);
  }
}

function addLimitations(
  collector: VisibleTextCollector,
  blueprint: PageBlueprint,
  includeAudience: boolean,
): void {
  for (const [index, limitation] of blueprint.limitations.entries()) {
    collector.add(`limitations.${index}.limitation`, limitation.limitation);
    if (includeAudience) collector.add(`limitations.${index}.who_it_affects`, limitation.who_it_affects);
    collector.add(`limitations.${index}.mitigation`, limitation.mitigation);
  }
}

function addFaq(collector: VisibleTextCollector, blueprint: PageBlueprint): void {
  for (const [index, item] of blueprint.faq.entries()) {
    collector.add(`faq.${index}.question`, item.question);
    collector.add(`faq.${index}.answer`, item.answer);
  }
}

function countDirectReview(artifact: unknown): VisibleArticleWordCount {
  const blueprint = pageBlueprintSchema.parse(artifact);
  const collector = new VisibleTextCollector();
  const renderer = getDirectReviewRendererKind(blueprint.metadata.design_profile);

  collector.add("hero.headline", blueprint.hero.headline);

  if (renderer === "reference_composed_v1") {
    const answerSnippet = blueprint.hero.answer_snippet?.trim();
    if (!answerSnippet) {
      throw new Error("reference_composed_v1 pages require a hero answer snippet.");
    }
    collector.add("hero.answer_snippet", answerSnippet);
    if (shouldRenderReferenceSubheadline(answerSnippet, blueprint.hero.subheadline)) {
      collector.add("hero.subheadline", blueprint.hero.subheadline);
    }
  } else if (renderer === "editorial_v2") {
    collector.add(blueprint.hero.answer_snippet ? "hero.answer_snippet" : "hero.subheadline", blueprint.hero.answer_snippet ?? blueprint.hero.subheadline);
    collector.add("hero.subheadline", blueprint.hero.subheadline);
  } else {
    collector.add("hero.subheadline", blueprint.hero.subheadline);
  }

  collector.add("hero.risk_reversal", blueprint.hero.risk_reversal);
  const approvedHeroVisual = hasApprovedHeroVisual(blueprint);
  if (renderer === "editorial_v2" && approvedHeroVisual) {
    collector.add("hero.visual_asset.prompt_summary", blueprint.hero.visual_asset?.prompt_summary);
  }
  if (!approvedHeroVisual) {
    collector.add("problem_solution.problem", blueprint.problem_solution.problem);
    collector.add("problem_solution.solution", blueprint.problem_solution.solution);
  }

  if (renderer !== "reference_composed_v1") {
    addBenefits(collector, blueprint, false);
    addWorkflow(collector, blueprint);
    addLimitations(collector, blueprint, false);
    addFaq(collector, blueprint);
    return collector.result();
  }

  for (const section of getRenderableSectionOrder(blueprint)) {
    switch (section) {
      case "problem_solution":
        collector.add("problem_solution.problem", blueprint.problem_solution.problem);
        collector.add("problem_solution.agitation", blueprint.problem_solution.agitation);
        collector.add("problem_solution.solution", blueprint.problem_solution.solution);
        break;
      case "benefits":
        addBenefits(collector, blueprint, true);
        break;
      case "proof_blocks":
        for (const [index, proof] of blueprint.proof_blocks.entries()) {
          collector.add(`proof_blocks.${index}.proof_type`, proof.proof_type);
          collector.add(`proof_blocks.${index}.summary`, proof.summary);
        }
        break;
      case "how_it_works":
        addWorkflow(collector, blueprint);
        break;
      case "limitations":
        addLimitations(collector, blueprint, true);
        break;
      case "objection_handling":
        for (const [index, item] of blueprint.objection_handling.entries()) {
          collector.add(`objection_handling.${index}.objection`, item.objection);
          collector.add(`objection_handling.${index}.response`, item.response);
        }
        break;
      case "faq":
        addFaq(collector, blueprint);
        break;
      case "closing_cta":
        collector.add("cta_blocks.0.supporting_text", blueprint.cta_blocks[0].supporting_text);
        break;
    }
  }

  return collector.result();
}

export function countVisibleArticleWords(
  format: "direct-review",
  artifact: unknown,
): VisibleArticleWordCount {
  if (format !== "direct-review") throw new Error(`Unsupported article format: ${format}`);
  return countDirectReview(artifact);
}

export function isLongFormAffiliateArticle(signals: LongFormAffiliateArticleSignals): boolean {
  return signals.format === "direct-review" && Boolean(signals.approvedAffiliateUrl?.trim());
}

export function isLongFormAffiliateWordCount(wordCount: number): boolean {
  return Number.isInteger(wordCount) &&
    wordCount >= LONG_FORM_AFFILIATE_MIN_WORDS &&
    wordCount <= LONG_FORM_AFFILIATE_MAX_WORDS;
}

