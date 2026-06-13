export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-bold">Owner Login</h1>
      <form className="mt-6 space-y-4" method="post" action="/api/auth/login">
        <input name="username" placeholder="Username" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
        <input name="password" type="password" placeholder="Password" className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
        <button className="rounded bg-white px-4 py-2 font-medium text-slate-950" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
