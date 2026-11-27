import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const assessment = ["wayfinder", "research", "prototype", "grilling", "domain-modeling", "handoff"];
const resolution = ["retro", "writing-for-agents", "diagnosing-bugs", "triage", "grilling", "domain-modeling",
  "research", "improve-codebase-architecture", "codebase-design", "code-review", "handoff"];
const productivity = new Set(["grilling", "handoff", "writing-for-agents"]);

/** Supply installed instructions to the restricted worker without granting access to the operator's home directory. */
export async function loadImproveSkills(phase: "assessment" | "resolution", root = process.cwd()) {
  const collection = process.env.MATTPOCOCK_SKILLS_ROOT ??
    path.join(homedir(), "dev-work", ".agent", "tools", "mattpocock_skills", "skills");
  const lock = JSON.parse(await readFile(path.join(root, "skills-lock.json"), "utf8")) as {
    skills: Record<string, { source: string }>;
  };
  const documents: Record<string, string> = {};
  for (const name of phase === "assessment" ? assessment : resolution) {
    let dir = path.join(collection, productivity.has(name) ? "productivity" : "engineering", name);
    try {
      documents[name] = await readFile(path.join(dir, "SKILL.md"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (lock.skills[name]?.source !== "mattpocock/skills") throw new Error(`IMPROVE_SKILL_MISSING:${name}`);
      dir = path.join(root, ".agents", "skills", name);
      documents[name] = await readFile(path.join(dir, "SKILL.md"), "utf8");
    }
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name !== "SKILL.md" && entry.name.endsWith(".md")) {
        documents[`${name}/${entry.name}`] = await readFile(path.join(dir, entry.name), "utf8");
      }
    }
  }
  return documents;
}
