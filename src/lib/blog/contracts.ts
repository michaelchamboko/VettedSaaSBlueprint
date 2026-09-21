import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const absoluteUrlSchema = z.string().url().refine((value) => value.startsWith("https://"));

export const blogSourceSchema = z.object({
  id: z.string().min(2),
  title: z.string().min(8),
  publisher: z.string().min(2),
  url: absoluteUrlSchema,
  kind: z.enum(["vendor", "standard", "regulator", "platform"]),
  retrievedAt: z.string().date(),
});

export const blogSectionSchema = z.object({
  id: slugSchema,
  heading: z.string().min(8),
  paragraphs: z.array(z.string().min(80)).min(1),
  bullets: z.array(z.string().min(24)).min(2).optional(),
  checklist: z.array(z.string().min(24)).min(4).optional(),
  caution: z.string().min(40).optional(),
});

export const blogPostSchema = z.object({
  schemaVersion: z.literal("BlogPostV1"),
  slug: slugSchema,
  canonicalPath: z.string().regex(/^\/blog\/[a-z0-9-]+$/),
  title: z.string().min(20).max(68),
  description: z.string().min(90).max(170),
  buyerQuestion: z.string().min(30).max(140),
  answerSummary: z.string().min(120).max(650),
  topicCluster: z.enum([
    "ai-audio",
    "email-automation",
    "ecommerce-analytics",
    "healthcare-operations",
    "creative-operations",
    "ai-governance",
  ]),
  publicationType: z.enum(["evergreen", "trend"]),
  cyclePosition: z.number().int().min(1).max(10),
  searchIntent: z.string().min(20),
  audience: z.string().min(20),
  publishedAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  readingMinutes: z.number().int().min(4).max(20),
  sections: z.array(blogSectionSchema).min(5).max(8),
  faqs: z
    .array(
      z.object({
        question: z.string().min(20),
        answer: z.string().min(60).max(500),
      }),
    )
    .min(3)
    .max(6),
  sources: z.array(blogSourceSchema).min(3).max(10),
  relatedReviewSlugs: z.array(slugSchema).max(2),
  media: z.object({
    hero: z.object({
      path: z.string().regex(/^\/blog\/images\/[a-z0-9-]+\.(?:webp|avif)$/),
      alt: z.string().min(20).max(180),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    figure: z.object({
      path: z.string().regex(/^\/blog\/images\/[a-z0-9-]+\.(?:webp|avif)$/),
      alt: z.string().min(20).max(180),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type BlogSource = z.infer<typeof blogSourceSchema>;
