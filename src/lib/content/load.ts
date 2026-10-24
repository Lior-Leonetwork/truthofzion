import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Editor, Entity, Entry } from "./schema";
import { checkEntry, isPublic, type Problem } from "./rules";

export type RawFile = { path: string; text: string };

export type Content = {
  editors: Map<string, Editor>;
  entities: Map<string, Entity>;
  entries: Entry[];
  problems: Problem[];
};

function parse<T>(schema: z.ZodType<T>, file: RawFile, problems: Problem[]): T | null {
  let json: unknown;
  try {
    json = JSON.parse(file.text);
  } catch (e) {
    problems.push({ entry: file.path, rule: "json", message: String(e) });
    return null;
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    for (const issue of result.error.issues) {
      problems.push({
        entry: file.path,
        rule: "schema",
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      });
    }
    return null;
  }
  return result.data;
}

export function parseContent(input: {
  editors: RawFile;
  entities: RawFile[];
  entries: RawFile[];
}): Content {
  const problems: Problem[] = [];

  const editorList = parse(z.array(Editor), input.editors, problems) ?? [];
  const editors = new Map(editorList.map((e) => [e.handle, e]));

  const entities = new Map<string, Entity>();
  for (const file of input.entities) {
    const e = parse(Entity, file, problems);
    if (!e) continue;
    if (path.basename(file.path, ".json") !== e.slug) {
      problems.push({ entry: file.path, rule: "filename", message: `file name must be ${e.slug}.json` });
    }
    if (entities.has(e.slug)) {
      problems.push({ entry: file.path, rule: "unique-slug", message: `duplicate entity "${e.slug}"` });
    }
    entities.set(e.slug, e);
  }

  const entries: Entry[] = [];
  const slugs = new Set<string>();
  for (const file of input.entries) {
    const e = parse(Entry, file, problems);
    if (!e) continue;
    if (path.basename(file.path, ".json") !== e.slug) {
      problems.push({ entry: file.path, rule: "filename", message: `file name must be ${e.slug}.json` });
    }
    if (slugs.has(e.slug)) {
      problems.push({ entry: file.path, rule: "unique-slug", message: `duplicate entry "${e.slug}"` });
    }
    slugs.add(e.slug);
    problems.push(...checkEntry(e, entities, editors));
    entries.push(e);
  }

  return { editors, entities, entries, problems };
}

function readDir(dir: string): RawFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ path: path.join(dir, f), text: fs.readFileSync(path.join(dir, f), "utf8") }));
}

// DEMO_CONTENT=1 swaps in content-demo/: fictional people and cases for
// previewing the design. Every page shows a banner saying so.
export const IS_DEMO = process.env.DEMO_CONTENT === "1";
const CONTENT_ROOT = path.join(process.cwd(), IS_DEMO ? "content-demo" : "content");

export function readContent(root = CONTENT_ROOT): Content {
  const editorsPath = path.join(root, "editors.json");
  return parseContent({
    editors: { path: editorsPath, text: fs.readFileSync(editorsPath, "utf8") },
    entities: readDir(path.join(root, "entities")),
    entries: readDir(path.join(root, "entries")),
  });
}

let cached: Content | null = null;

// What the site renders. Content that fails validation stops the build rather
// than being shown, and drafts or in-review entries are never rendered.
export function getContent() {
  if (cached) return cached;
  const content = readContent();
  if (content.problems.length > 0) {
    const lines = content.problems.map((p) => `  ${p.entry} [${p.rule}] ${p.message}`);
    throw new Error(`content/ failed editorial validation:\n${lines.join("\n")}`);
  }
  const entries = content.entries
    .filter(isPublic)
    .sort((a, b) => b.date.localeCompare(a.date));
  cached = { ...content, entries };
  return cached;
}

export function getEntry(slug: string) {
  return getContent().entries.find((e) => e.slug === slug) ?? null;
}

export function getEntity(slug: string) {
  return getContent().entities.get(slug) ?? null;
}

export function entriesFor(entitySlug: string) {
  return getContent().entries.filter((e) => e.entity === entitySlug);
}
