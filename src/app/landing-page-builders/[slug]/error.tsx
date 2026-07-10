"use client";

export default function LandingPageError() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm uppercase tracking-[.2em] text-[var(--accent)]">Temporarily unavailable</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">This review is not available right now.</h1>
      <p className="mt-4 text-slate-300">Please try again shortly.</p>
    </main>
  );
}
