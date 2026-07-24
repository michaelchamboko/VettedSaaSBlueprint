export default function PagesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Page Drafting</h1>
        <p className="mt-3 text-sm text-slate-300">Draft validated page JSON, approve it, and publish only when evidence, disclosure, and destination review are all in place.</p>
      </header>
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
        Page version review and publish actions are controlled through the admin APIs.
      </section>
    </main>
  );
}
