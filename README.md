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

## Demo mode

`npm run dev:demo` (or `DEMO_CONTENT=1` at build time) loads
`content-demo/`: fictional subjects with placeholder names (Ploni Almoni,
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
