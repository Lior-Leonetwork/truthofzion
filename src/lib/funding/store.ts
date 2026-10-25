import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { FundingState, Ngo } from "./schema";

// data/funding/ holds the Registrar of Associations' foreign state donation
// filings, grouped by NGO. Written only by scripts/funding-ingest.ts.
export function fundingRoot() {
  return path.join(process.cwd(), process.env.DEMO_CONTENT === "1" ? "data-demo" : "data", "funding");
}

export const fundingPaths = (root = fundingRoot()) => ({
  ngos: path.join(root, "ngos.json"),
  state: path.join(root, "state.json"),
});

// One NGO per line: a daily refresh shows up in git as the NGOs that changed.
export function writeNgos(file: string, ngos: Ngo[]) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `[\n${ngos.map((n) => JSON.stringify(n)).join(",\n")}\n]\n`);
}

export function readNgos(root?: string): Ngo[] {
  const file = fundingPaths(root).ngos;
  return fs.existsSync(file) ? z.array(Ngo).parse(JSON.parse(fs.readFileSync(file, "utf8"))) : [];
}

export function readFundingState(root?: string) {
  const file = fundingPaths(root).state;
  return fs.existsSync(file) ? FundingState.parse(JSON.parse(fs.readFileSync(file, "utf8"))) : null;
}

let cached: Ngo[] | null = null;
export function getNgos() {
  return (cached ??= readNgos());
}
