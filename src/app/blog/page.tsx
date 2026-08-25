import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicPageShell } from "@/components/public/PublicPageShell";
import { listPublishedBlogPosts } from "@/lib/blog/catalogue";

export const metadata: Metadata = {
  title: "Evidence-led SaaS buying guides | VettedSaaSBlueprint",
  description: "Practical, source-led guides for testing software, data, controls, and buying claims before a team commits.",
  alternates: { canonical: "/blog" },
};

export const dynamic = "force-static";

const topicLabels = {
  "ai-audio": "AI audio",
  "email-automation": "Email automation",
  "ecommerce-analytics": "Ecommerce analytics",
  "healthcare-operations": "Healthcare operations",
  "creative-operations": "Creative operations",
  "ai-governance": "AI governance",
} as const;

export default function BlogIndexPage() {
  const [lead, ...posts] = listPublishedBlogPosts();

  return (
    <PublicPageShell>
      <header className="blog-index-hero">
        <p className="eyebrow">The field notes / Issue 01</p>
        <div>
          <h1>Buy software with <em>better questions.</em></h1>
          <p>Decision guides for teams that want the evidence, tests, and operating controls behind a confident software choice.</p>
        </div>
      </header>

      {lead ? (
        <section className="blog-lead" aria-labelledby="blog-lead-title">
          <Link className="blog-lead__image" href={lead.canonicalPath as Route} tabIndex={-1} aria-hidden="true">
            <Image src={lead.media.hero.path} alt="" width={lead.media.hero.width} height={lead.media.hero.height} priority sizes="(max-width: 800px) 100vw, 58vw" />
          </Link>
          <div className="blog-lead__copy">
            <p className="eyebrow">Lead guide / {topicLabels[lead.topicCluster]}</p>
            <h2 id="blog-lead-title"><Link href={lead.canonicalPath as Route}>{lead.title}</Link></h2>
            <p>{lead.answerSummary}</p>
            <div className="blog-meta"><span>{lead.readingMinutes} min read</span><span>{lead.sources.length} named sources</span></div>
            <Link className="primary-link" href={lead.canonicalPath as Route}>Read the field guide <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      ) : null}

      <section className="blog-catalogue" aria-labelledby="blog-catalogue-title">
        <header>
          <p className="eyebrow">The first ten</p>
          <h2 id="blog-catalogue-title">Practical tests, not trend summaries.</h2>
        </header>
        <div className="blog-catalogue__list">
          {posts.map((post, index) => (
            <article className="blog-index-card" key={post.slug}>
              <span className="blog-index-card__number">{String(index + 2).padStart(2, "0")}</span>
              <div>
                <p className="eyebrow">{topicLabels[post.topicCluster]} / {post.publicationType}</p>
                <h3><Link href={post.canonicalPath as Route}>{post.title}</Link></h3>
                <p>{post.description}</p>
              </div>
              <Image src={post.media.hero.path} alt={post.media.hero.alt} width={post.media.hero.width} height={post.media.hero.height} sizes="(max-width: 800px) 100vw, 24vw" />
              <Link className="text-link" href={post.canonicalPath as Route}>Read guide</Link>
            </article>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
