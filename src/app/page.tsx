import Link from "next/link";

const cards = [
  ["Product Vault", "/admin/products", "Manage SaaS products, research priority, and status."],
  ["Affiliate Link Vault", "/admin/affiliate-links", "Store original PartnerStack links and health state."],
  ["Offer Folders", "/admin/offer-folders", "Link products, affiliate URLs, resources, and review state."],
  ["Approval Queue", "/admin/approvals", "Review high-risk claims and first publications."],
  ["Hermes Jobs", "/admin/jobs", "Inspect research, scoring, and optimization jobs."],
] as const;

export default function Home() {
  return <main className="mx-auto min-h-screen max-w-6xl px-6 py-10"><h1 className="text-5xl font-bold tracking-tight">Controlled Affiliate Intelligence Loop</h1><p className="mt-4 max-w-2xl text-slate-300">A compliance-first operating system for affiliate research, evidence, approval, publishing, tracking, and optimization.</p><div className="mt-10 grid gap-4 md:grid-cols-2">{cards.map(([title, href, body]) => <Link key={href} href={href} className="rounded-3xl border border-white/15 bg-white/8 p-6 transition hover:bg-white/12"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-300">{body}</p></Link>)}</div></main>;
}
