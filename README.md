# Truth of Zion · אמת מציון

A bilingual (Hebrew / English) investigations site on people in top roles in
Israel and around the world: corruption, foreign influence and funding, the
public record, and incitement against Israel. Every claim is sourced, every
case carries its exact legal status, and nothing goes up without a second
editor.

## Pages

- **Home**: hero with live counts, latest investigations, top roles under
  scrutiny (sorted by seniority), areas, countries, how we investigate
- **Investigations**: every case, filterable by area, legal status and country
- **People**: directory of investigated office holders and bodies
- **Countries**: per-country pages with their people and cases
- **Case file**: legal-status tracker (allegation → investigation → indictment
  → conviction), timeline with numbered citations, response, sources,
  corrections
- **Dossier**: per-person profile with every case and the most serious status
- **Methodology**, **Corrections**, **Right of reply**

## The AI system: Knesset votes

Runs every day in GitHub Actions (`.github/workflows/knesset.yml`):

| Step | Who | Published? |
|---|---|---|
| **Ingest:** pull new plenum votes from the Knesset's official OData service (`Votes.svc`) | Code only (`scripts/knesset-ingest.ts`) | **Yes, automatically.** Official records, shown as recorded |
| **Hold back** any vote whose per-member rows don't add up to the official totals | Code | No, retried each run |
| **Draft:** for each final-reading vote, fetch the bill's official explanatory notes (`KNS_Bill.SummaryLaw`) and have Claude write a neutral Hebrew/English summary, quotes and topic tags | Claude (`src/lib/agent/vote-analyst.ts`) | No |
| **Verify:** every quote must appear word-for-word in the official text; no bill text means no summary; topics only from `data/knesset/watch.json` | Code (`src/lib/knesset/verify.ts`) | Failing drafts are discarded |
| **Review:** drafts land in one rolling pull request (`ai/knesset-drafts`). Editors fix wording, reject drafts (`"state": "rejected"`), or mark key votes (`"keyVote": true` plus a `note`, required by CI) | Editor | No |
| **Approve:** merging the PR publishes its drafts in the merging editor's name (`.github/workflows/knesset-publish.yml`). A merger not listed in `content/editors.json` publishes nothing | Editor | **Yes** |

The model never marks a key vote, never characterizes a member or party, and
never summarizes from memory. Pages: `/knesset` (all final-reading votes),
`/knesset/votes/<id>` (summary and full roll call by faction), and
`/knesset/members/<id>` (each MK's record). Link an investigated profile to its
record with `knessetMemberId` in the entity file.

### Setup (once, in the GitHub repo settings)

1. **Secrets** (Settings → Secrets and variables → Actions):
   - `ANTHROPIC_API_KEY`: needed for drafting. Without it, votes are still ingested and published; only the summaries are skipped.
   - **knesset.gov.il only answers Israeli IP addresses.** GitHub's own runners are in the US and get a block page (confirmed by the "Knesset probe" workflow). Use one of:
     - a self-hosted GitHub Actions runner on a machine in Israel (your own computer, or a small VM in Google Cloud `me-west1` / AWS `il-central-1`, both in Tel Aviv), then set the repository **variable** `KNESSET_RUNNER` to its label; or
     - the secret `KNESSET_HTTP_PROXY`: an HTTP proxy with an Israeli exit address.
     Run "Knesset probe" afterwards: it should print OData XML/JSON, not an HTML page.
   - Hasadna's Open Knesset mirror of the vote tables stopped updating in July 2021, so it can't replace the live source.
2. **Actions permissions** (Settings → Actions → General): "Read and write permissions", and tick "Allow GitHub Actions to create and approve pull requests".
3. **Editors:** each editor's GitHub login goes in `content/editors.json` (`"github"`).
4. If `main` is branch-protected, let `github-actions[bot]` push to it. That's how official vote records and approvals land.
5. Run it once by hand: Actions → "Knesset votes" → Run workflow. The log lists the first votes it saw and which ones it treated as final readings. Check that list on the first run.

Run locally: `npm run knesset:ingest`, `ANTHROPIC_API_KEY=… npm run knesset:analyze -- --max 5`.

## Demo mode

`npm run dev:demo` (or `DEMO_CONTENT=1` at build time) loads
`content-demo/` and `data-demo/`: fictional subjects and votes with placeholder names (Ploni Almoni,
John Doe, Erika Mustermann…) for previewing the design. Every page shows a
"fictional" banner, and demo builds are marked noindex. Never deploy a demo
build as the public site.

## How it works

- **Content is data in git.** Each case is a JSON file in `content/entries/`,
  each subject a JSON file in `content/entities/`. Git history is the audit
  trail of who wrote and changed what.
- **The editorial standard is code.** `src/lib/content/rules.ts` decides what
  may be published, and CI runs it on every pull request. If an entry fails a
  rule, it can't be merged, and the build refuses to render it.
- **Publishing = a reviewed pull request.** An editor opens a PR with a new
  or changed entry, a *different* editor reviews and approves it, and merging
  to `main` redeploys the site.

## The rules (enforced in `rules.ts`)

| Status | Needs |
|---|---|
| Convicted | a court ruling |
| Indicted | the indictment, or a prosecution announcement |
| Under investigation | an official police / prosecution / State Comptroller statement |
| Allegation | two or more independent publishers; always labelled unproven |
| Public record | the record itself (Knesset record, official filing, original recording) |

On top of status:

- Foreign-funding claims need the official filing.
- Vote and record claims need the record itself.
- Incitement claims need the original statement.
- Published entries need `reviewedBy` to be a different editor than `createdBy`.
  Both editors must be listed in `content/editors.json`.
- The subject must be asked to respond before publication. A response that
  arrives gets published.
- Only public actors can be subjects (officials, candidates, public figures,
  organizations, media, foreign governments). The schema has no kind for a
  private person.
- Retractions stay visible, with their date and reason.

## Adding a case

1. Copy `content/_templates/example-official.json` (set `country` and
   `position`) to
   `content/entities/<slug>.json` (if the subject is new), and
   `content/_templates/example-case.json` to `content/entries/<slug>.json`.
2. Fill it in with `"state": "draft"`. Add an `archivedUrl`
   (web.archive.org) for every source, so the citation survives if the
   original page disappears.
3. Contact the subject for a response, and record `response.status` and
   `requestedOn`.
4. Run `npm run validate`, then open a pull request.
5. A second editor checks every source against the text, sets `reviewedBy`,
   `publishedOn` and `"state": "published"`, and approves.

## Development

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /he or /en
npm run dev:demo   # same, with fictional demo content
npm run validate   # editorial rules over content/
npm test           # rule tests (fictional fixtures only)
npm run typecheck
npm run lint
npm run build
```

Environment variables (optional):

- `CONTACT_EMAIL` — shown on the right-of-reply page and on every case for error reports
- `SITE_URL` — canonical URL for metadata

Built with Next.js 16 (App Router, fully static), Tailwind CSS v4 and zod v4.
