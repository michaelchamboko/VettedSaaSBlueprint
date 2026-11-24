import type { ReactNode } from "react";

type AdminFormPageProps = {
  title: string;
  description: string;
  asideTitle: string;
  asideItems: readonly string[];
  children: ReactNode;
};

export function AdminFormPage({ title, description, asideTitle, asideItems, children }: AdminFormPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {children}
        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
          <h2 className="text-lg font-medium text-white">{asideTitle}</h2>
          {asideItems.map((item) => <p key={item}>{item}</p>)}
        </aside>
      </section>
    </main>
  );
}
