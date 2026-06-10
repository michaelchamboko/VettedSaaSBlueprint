import type { PageBlueprint } from "@/lib/schemas/contracts";
import { AffiliateDisclosure } from "./AffiliateDisclosure";

export function DirectReviewPage({ blueprint }: { blueprint: PageBlueprint }) {
  return (
    <main className="min-h-screen bg-[#08111f] text-white">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 md:px-8 md:py-14">
        <nav className="flex items-center justify-between text-sm text-slate-300">
          <span className="font-semibold text-white">GlobalSetup</span>
          <a className="rounded-full border border-white/15 px-4 py-2" href="/affiliate-disclosure">Disclosure</a>
        </nav>
        <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr] md:items-center">
          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">{blueprint.hero.headline}</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{blueprint.hero.subheadline}</p>
            <AffiliateDisclosure blueprint={blueprint} />
            <a data-track="primary-cta" className="inline-flex min-h-12 items-center rounded-full bg-[var(--accent)] px-6 font-bold text-slate-950" href={`/api/events/affiliate-click?linkId=${blueprint.hero.primary_cta_link_id}`}>{blueprint.hero.primary_cta_label}</a>
            {blueprint.hero.risk_reversal ? <p className="text-sm text-slate-400">{blueprint.hero.risk_reversal}</p> : null}
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/8 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[.2em] text-[var(--accent)]">Research-backed fit</p>
            <h2 className="mt-4 text-2xl font-semibold">{blueprint.problem_solution.problem}</h2>
            <p className="mt-4 text-slate-300">{blueprint.problem_solution.solution}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-3 md:px-8">
        {blueprint.benefits.map((benefit) => <article key={benefit.benefit_title} className="rounded-3xl border border-white/12 bg-white/6 p-5"><h3 className="font-semibold">{benefit.benefit_title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{benefit.benefit_description}</p></article>)}
      </section>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h2 className="text-3xl font-bold">Limitations to know</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">{blueprint.limitations.map((item) => <article key={item.limitation} className="rounded-3xl border border-white/12 bg-white/6 p-5"><h3 className="font-semibold">{item.limitation}</h3><p className="mt-2 text-sm text-slate-300">{item.mitigation}</p></article>)}</div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <h2 className="text-3xl font-bold">Questions before you click</h2>
        <div className="mt-5 space-y-3">{blueprint.faq.map((item) => <details key={item.question} className="rounded-2xl border border-white/12 bg-white/6 p-5"><summary className="cursor-pointer font-semibold">{item.question}</summary><p className="mt-3 text-slate-300">{item.answer}</p></details>)}</div>
      </section>
    </main>
  );
}
