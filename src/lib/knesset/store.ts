import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Analysis, Faction, IngestState, Member, Vote, WatchTopic } from "./schema";
import { StatementSource } from "./statements";

// data/knesset/ holds official vote records (written by the ingester) and the
// model's drafts (written by the analyst, published only by an editor).
// DEMO_CONTENT=1 reads the fictional set in data-demo/ instead.
export function knessetRoot() {
  return path.join(process.cwd(), process.env.DEMO_CONTENT === "1" ? "data-demo" : "data", "knesset");
}

const readJson = <T>(file: string, schema: z.ZodType<T>, fallback: T): T =>
  fs.existsSync(file) ? schema.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : fallback;

export function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readAll<T>(dir: string, schema: z.ZodType<T>): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return schema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
      } catch (e) {
        throw new Error(`${path.join(dir, f)}: ${e instanceof Error ? e.message : e}`);
      }
    });
}

export const paths = (root = knessetRoot()) => ({
  state: path.join(root, "state.json"),
  members: path.join(root, "members.json"),
  watch: path.join(root, "watch.json"),
  statementSources: path.join(root, "statement-sources.json"),
  factions: path.join(root, "factions.json"),
  statementsChecked: path.join(root, "statements-checked.json"),
  votes: path.join(root, "votes"),
  vote: (id: number) => path.join(root, "votes", `${id}.json`),
  analyses: path.join(root, "analysis"),
  analysis: (id: number) => path.join(root, "analysis", `${id}.json`),
});

export const readState = (root?: string) => readJson(paths(root).state, IngestState.nullable(), null);
export const readMembers = (root?: string) => readJson(paths(root).members, z.record(z.string(), Member), {});
export const readWatch = (root?: string) => readJson(paths(root).watch, z.array(WatchTopic), []);
export const readFactions = (root?: string) => readJson(paths(root).factions, z.array(Faction), []);
export const readStatementSources = (root?: string) => readJson(paths(root).statementSources, z.array(StatementSource), []);
export const readVotes = (root?: string) => readAll(paths(root).votes, Vote).sort((a, b) => b.id - a.id);
export const readAnalyses = (root?: string) => readAll(paths(root).analyses, Analysis);

export type KnessetData = {
  votes: Vote[];
  members: Record<string, z.infer<typeof Member>>;
  analyses: Map<number, z.infer<typeof Analysis>>;
  watch: z.infer<typeof WatchTopic>[];
  factions: Map<string, z.infer<typeof Faction>>;
};

let cached: KnessetData | null = null;

// What the site renders: every vote, and only the analyses an editor published.
export function getKnesset(): KnessetData {
  if (cached) return cached;
  const published = readAnalyses().filter((a) => a.editorial.state === "published");
  cached = {
    votes: readVotes(),
    members: readMembers(),
    analyses: new Map(published.map((a) => [a.voteId, a])),
    watch: readWatch(),
    factions: new Map(readFactions().map((f) => [f.name, f])),
  };
  return cached;
}
