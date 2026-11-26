import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPublishedBlogPost, listPublishedBlogPostParams } from "@/lib/blog/catalogue";
import { buildBlogStructuredData } from "@/lib/blog/structured-data";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { loadArticleHeroForArtifact } from "@/lib/article-heroes";
import { ReviewedArticleHero } from "@/components/public/ReviewedArticleHero";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listPublishedBlogPostParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPublishedBlogPost((await params).slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: post.canonicalPath },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: post.canonicalPath,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      images: [{ url: post.media.hero.path, width: post.media.hero.width, height: post.media.hero.height, alt: post.media.hero.alt }],
    },
  };
}

const reviewPaths: Record<string, string> = {
  "elevenlabs-ai-voice-generator": "/landing-page-builders/elevenlabs-ai-voice-generator",
  "moosend-email-marketing-automation": "/landing-page-builders/moosend-email-marketing-automation",
};

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPublishedBlogPost((await params).slug);
  if (!post) notFound();
  const config = loadPublicSiteConfig();
  const structuredData = buildBlogStructuredData(post, config.canonicalOrigin);
  const reviewedHero = loadArticleHeroForArtifact("blog", post.slug, post)?.asset;

  return (
    <PublicPageShell>
      <div className="blog-progress" aria-hidden="true"><span /></div>
      <article className="blog-article">
        <header className="blog-article__hero">
          <div className="blog-article__intro">
            <Link className="blog-back-link" href="/blog">← All field notes</Link>
            <p className="eyebrow">Field guide {String(post.cyclePosition).padStart(2, "0")} / {post.publicationType}</p>
            <h1>{post.title}</h1>
            <p className="blog-article__question">{post.buyerQuestion}</p>
            <dl className="blog-article__meta">
              <div><dt>Reading time</dt><dd>{post.readingMinutes} minutes</dd></div>
              <div><dt>Evidence</dt><dd>{post.sources.length} named sources</dd></div>
              <div><dt>Updated</dt><dd>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(post.modifiedAt))}</dd></div>
            </dl>
          </div>
          <figure className="blog-article__hero-media">
            {reviewedHero ? <ReviewedArticleHero asset={reviewedHero} /> : <Image src={post.media.hero.path} alt={post.media.hero.alt} width={post.media.hero.width} height={post.media.hero.height} priority sizes="(max-width: 800px) 100vw, 42vw" />}
            <figcaption>Evidence before enthusiasm. Test the workflow you will actually operate.</figcaption>
          </figure>
        </header>

        <section className="blog-answer" aria-labelledby="direct-answer">
          <p className="eyebrow">Direct answer</p>
          <h2 id="direct-answer">The decision in one minute</h2>
          <p>{post.answerSummary}</p>
        </section>

        <div className="blog-article__body">
          <aside className="blog-toc" aria-label="On this page">
            <p>On this page</p>
            <ol>{post.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}</ol>
          </aside>
          <div className="blog-prose">
            {post.sections.map((section, index) => (
              <section id={section.id} key={section.id}>
                <span className="blog-section-number">{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.checklist ? (
                  <div className="blog-checklist"><h3>Working checklist</h3><ul>{section.checklist.map((item) => <li key={item}>{item}</li>)}</ul></div>
                ) : null}
                {section.caution ? <aside className="blog-caution"><strong>Decision boundary</strong><p>{section.caution}</p></aside> : null}
                {index === 2 ? (
                  <figure className="blog-article__figure">
                    <Image src={post.media.figure.path} alt={post.media.figure.alt} width={post.media.figure.width} height={post.media.figure.height} sizes="(max-width: 800px) 100vw, 48rem" />
                    <figcaption>A practical evidence workspace: inputs, decisions, owners, and exceptions stay visible.</figcaption>
                  </figure>
                ) : null}
              </section>
            ))}

            {post.relatedReviewSlugs.length ? (
              <aside className="blog-related">
                <p className="eyebrow">Continue the evaluation</p>
                <h2>Read the related product evidence.</h2>
                <p>The guide above is product-neutral. These published reviews apply the same evidence-led approach to a specific tool.</p>
                {post.relatedReviewSlugs.map((slug) => <Link className="primary-link" key={slug} href={reviewPaths[slug] as Route}>Open the published review <span aria-hidden="true">↗</span></Link>)}
              </aside>
            ) : null}

            <section className="blog-faq" aria-labelledby="frequent-questions">
              <p className="eyebrow">Questions buyers ask</p>
              <h2 id="frequent-questions">Frequently asked questions</h2>
              {post.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
            </section>

            <section className="blog-sources" aria-labelledby="article-sources">
              <p className="eyebrow">Evidence register</p>
              <h2 id="article-sources">Sources used</h2>
              <ol>{post.sources.map((source) => <li key={source.id}><a href={source.url} rel="noreferrer">{source.title}</a><span>{source.publisher} / {source.kind}</span></li>)}</ol>
              <p>Vendor sources describe documented product capabilities. Standards, regulator guidance, platform documentation, and local validation should shape the final decision.</p>
            </section>
          </div>
        </div>
      </article>
      {Object.values(structuredData).map((data) => <script key={data["@type"] as string} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />)}
    </PublicPageShell>
  );
}
