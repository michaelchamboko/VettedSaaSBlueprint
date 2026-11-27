import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { blogPostSchema, type BlogPost } from "../src/lib/blog/contracts";

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("LOOPBACK_PORT_UNAVAILABLE"));
      server.close(() => resolve(address.port));
    });
  });
}

async function stopOwnedServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  const closed = new Promise<void>((resolve) => server.once("close", () => resolve()));
  server.kill("SIGTERM");
  await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function request(server: ChildProcess, port: number, route: string, expected: string) {
  const logs: string[] = [];
  server.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr?.on("data", (chunk) => logs.push(String(chunk)));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited ${server.exitCode}: ${logs.join("")}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      if (response.status === 200 && body.includes(expected)) return { status: response.status, body };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out requesting ${route}: ${logs.join("")}`);
}

function synthetic(source: BlogPost, slug: string, title: string, position: number): BlogPost {
  return blogPostSchema.parse({
    ...structuredClone(source),
    slug,
    canonicalPath: `/blog/${slug}`,
    title,
    buyerQuestion: `Which controlled option fits ${title}?`,
    answerSummary: `${title} is isolated test content served only by the loopback fixture. It proves that the public catalogue remains the serving authority while a separate mutable import record changes underneath it.`,
    cyclePosition: position,
  });
}

test("the public catalogue serves target and control independently of mutable import state", { timeout: 180_000 }, async () => {
  const repositoryRoot = process.cwd();
  const scratch = path.join(repositoryRoot, ".scratch");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, "publication-http-"));
  let server: ChildProcess | undefined;
  try {
    await cp(path.join(repositoryRoot, "src"), path.join(root, "src"), { recursive: true });
    await cp(path.join(repositoryRoot, "public"), path.join(root, "public"), { recursive: true });
    for (const file of ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "next.config.mjs", "postcss.config.mjs"]) {
      await cp(path.join(repositoryRoot, file), path.join(root, file)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    const modules = path.dirname(path.dirname(require.resolve("next/package.json")));
    await symlink(modules, path.join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");

    const source = blogPostSchema.array().parse(JSON.parse(await readFile(path.join(repositoryRoot, "src/generated/blog-posts/posts.json"), "utf8")));
    const target = synthetic(source[0], "synthetic-publication-target", "Synthetic publication target", 1);
    const control = synthetic(source[1], "synthetic-publication-control", "Synthetic publication control", 2);
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([target, control]));
    const mutableImport = path.join(root, ".automation/article-imports/synthetic.json");
    await mkdir(path.dirname(mutableImport), { recursive: true });
    await writeFile(mutableImport, JSON.stringify(target));

    const port = await availablePort();
    const next = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
    server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const first = await request(server, port, target.canonicalPath, target.title);
    const controlResponse = await request(server, port, control.canonicalPath, control.title);
    assert.equal(first.status, 200);
    assert.equal(controlResponse.status, 200);
    assert.ok(first.body.includes(target.answerSummary));
    assert.ok(controlResponse.body.includes(control.answerSummary));

    await writeFile(mutableImport, JSON.stringify({ ...target, title: "Mutable import must not be served" }));
    const second = await request(server, port, target.canonicalPath, target.title);
    assert.ok(second.body.includes(target.title));
    assert.ok(second.body.includes(target.answerSummary));
    assert.ok(!second.body.includes("Mutable import must not be served"));
  } finally {
    if (server) await stopOwnedServer(server);
    await rm(root, { recursive: true, force: true });
  }
});
