import { executeQuery } from "../db";
import {
  reviewEvidenceRegistrationSchema,
  type ArticleReviewEvidenceRegistry,
  type ReviewEvidenceClass,
  type ReviewEvidenceRegistration,
} from "./review-evidence-registry";

type Query = typeof executeQuery;

function registration(value: unknown): ReviewEvidenceRegistration {
  return reviewEvidenceRegistrationSchema.parse(typeof value === "string" ? JSON.parse(value) : value);
}

export class NeonArticleReviewEvidenceRegistry implements ArticleReviewEvidenceRegistry {
  constructor(private readonly query: Query = executeQuery) {}

  async list(input: { importId: string; evidenceClass: ReviewEvidenceClass }): Promise<ReviewEvidenceRegistration[]> {
    try {
      const result = await this.query(`
        select registration
        from article_research.review_evidence_registrations
        where import_id = $1 and evidence_class = $2
        order by created_at desc`, [input.importId, input.evidenceClass]);
      return result.rows.map((row) => registration(row.registration));
    } catch (error) {
      throw new Error(`CAPABILITY_UNAVAILABLE: article review evidence registry read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listAll(input: { evidenceClass: ReviewEvidenceClass }): Promise<ReviewEvidenceRegistration[]> {
    try {
      const result = await this.query(`
        select registration
        from article_research.review_evidence_registrations
        where evidence_class = $1
        order by created_at desc`, [input.evidenceClass]);
      return result.rows.map((row) => registration(row.registration));
    } catch (error) {
      throw new Error(`CAPABILITY_UNAVAILABLE: article review evidence registry retention scan failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async commit(input: ReviewEvidenceRegistration): Promise<{ registrationId: string; replayed: boolean }> {
    const value = reviewEvidenceRegistrationSchema.parse(input);
    try {
      const inserted = await this.query(`
        insert into article_research.review_evidence_registrations
          (registration_id, import_id, evidence_class, source_fingerprint, examined_revision, evidence_sha256, registration)
        values ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)
        on conflict (import_id, evidence_class, examined_revision, evidence_sha256) do nothing
        returning registration_id`, [value.registrationId, value.importId, value.evidenceClass, value.sourceFingerprint, value.examinedRevision, value.evidenceRef.sha256, JSON.stringify(value)]);
      if (inserted.rows[0]?.registration_id) return { registrationId: String(inserted.rows[0].registration_id), replayed: false };
      const replay = await this.query(`
        select registration_id, registration
        from article_research.review_evidence_registrations
        where import_id = $1 and evidence_class = $2 and examined_revision = $3 and evidence_sha256 = $4`, [value.importId, value.evidenceClass, value.examinedRevision, value.evidenceRef.sha256]);
      const existing = replay.rows[0];
      if (!existing) throw new Error("REVIEW_EVIDENCE_REGISTRY_REPLAY_MISSING");
      const prior = registration(existing.registration);
      const comparable = (input: ReviewEvidenceRegistration) => {
        const record: Partial<ReviewEvidenceRegistration> = { ...input };
        delete record.registrationId;
        delete record.registeredAt;
        return record;
      };
      if (JSON.stringify(comparable(prior)) !== JSON.stringify(comparable(value))) throw new Error("REVIEW_EVIDENCE_REGISTRY_REPLAY_MISMATCH");
      return { registrationId: String(existing.registration_id), replayed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("CAPABILITY_UNAVAILABLE:")) throw error;
      throw new Error(`CAPABILITY_UNAVAILABLE: article review evidence registry write failed: ${message}`);
    }
  }
}
