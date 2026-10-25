@AGENTS.md

# Truth of Zion

Bilingual (he/en, RTL-first) accountability site. Read README.md first.

## Rules for any agent working here

- **Never write entries about real people or organizations from memory.**
  Content in `content/` comes from editors working from sources they've
  checked. Tests use fictional fixtures only.
- The editorial rules in `src/lib/content/rules.ts` are the product. Don't
  relax them to get an entry through; fix the entry.
- Verify before shipping: `npm run validate`, `npm test`, `npm run typecheck`,
  `npm run lint`, `npm run build`.
- The Knesset AI pipeline: official vote data is published as-is by code; the
  model only summarises from the official bill text, every quote is verified
  verbatim in code, and summaries publish automatically, labelled as such. Key
  votes are applied automatically only under the human-approved policy
  (`data/knesset/policy.json`), the position derived in code from the stance;
  "said X, voted Y" findings need an editor. Keep it that
  way. knesset.gov.il is not reachable from Claude cloud sessions; test
  the scripts against a local mock (`KNESSET_VOTES_SVC`, `KNESSET_PARLIAMENT_V4`,
  `ANTHROPIC_BASE_URL` override the endpoints).
- Foreign funding (`src/lib/funding/`, `scripts/funding-ingest.ts`): the
  Registrar's filings, published as filed by code, no model. Donor countries
  only when the donor's name names one. data.gov.il is geo-blocked like the
  Knesset; `DATAGOV_API` overrides the endpoint for a local mock.
- Case research (`src/lib/cases/`, `scripts/cases-draft.ts`): drafts only,
  never published by the pipeline. Source sites and the evidence types they may
  carry are fixed in code (`allowedTypes`); keep it that way.
- Next.js 16: middleware is `src/proxy.ts`; `PageProps<"/route">` /
  `LayoutProps` are global type helpers; the root layout lives in `app/[lang]/`.
