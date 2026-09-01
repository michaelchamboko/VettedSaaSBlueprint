export default function DailyMetricsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Daily Metrics</h1>
        <p className="mt-3 text-sm text-slate-300">
          View the page-view, CTA, affiliate, error, and FAQ metrics that feed the optimization queue.
        </p>
      </header>
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
        Daily metrics roll up from first-party tracking events.
      </section>
    </main>
  );
}
