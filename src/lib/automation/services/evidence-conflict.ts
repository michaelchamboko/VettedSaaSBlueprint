import { EvidenceConflictService, ConflictResult } from "../module-contract";

export function createEvidenceConflictService(): EvidenceConflictService {
  return {
    detect(evidence: Array<{ statement: string; source: string; confidence: number }>): ConflictResult[] {
      const byStatement = new Map<string, Array<{ source: string; confidence: number }>>();

      for (const e of evidence) {
        const existing = byStatement.get(e.statement) ?? [];
        existing.push({ source: e.source, confidence: e.confidence });
        byStatement.set(e.statement, existing);
      }

      const results: ConflictResult[] = [];

      for (const [statement, sources] of byStatement) {
        if (sources.length <= 1) {
          results.push({
            statement,
            sources: sources.map(s => ({ source: s.source, position: "supports", confidence: s.confidence })),
            resolution: "corroborated",
            confidence: sources[0]?.confidence ?? 0,
          });
          continue;
        }

        const confidences = sources.map(s => s.confidence);
        const maxConfidence = Math.max(...confidences);
        const minConfidence = Math.min(...confidences);
        const spread = maxConfidence - minConfidence;

        let resolution: ConflictResult["resolution"];
        if (spread <= 0.2) {
          resolution = "corroborated";
        } else if (spread <= 0.5) {
          resolution = "conflicting";
        } else {
          resolution = "insufficient";
        }

        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

        results.push({
          statement,
          sources: sources.map(s => ({
            source: s.source,
            position: s.confidence >= avgConfidence ? "supports" : "contradicts",
            confidence: s.confidence,
          })),
          resolution,
          confidence: avgConfidence,
        });
      }

      return results;
    },
  };
}

export function resolveConflict(
  conflicts: ConflictResult[],
  preferredSources: string[] = [],
): ConflictResult[] {
  return conflicts.map(conflict => {
    if (conflict.resolution !== "conflicting") return conflict;

    const preferredSource = conflict.sources.find(s =>
      preferredSources.some(p => s.source.toLowerCase().includes(p.toLowerCase())),
    );

    if (preferredSource) {
      return {
        ...conflict,
        resolution: "corroborated",
        confidence: preferredSource.confidence,
        sources: conflict.sources.map(s =>
          s.source === preferredSource.source
            ? { ...s, position: "supports" }
            : { ...s, position: "contradicts" },
        ),
      };
    }

    return conflict;
  });
}