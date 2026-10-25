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
  model only drafts summaries from the official bill text, every quote is
  verified verbatim in code, and only an editor's merge publishes a draft. Keep
  it that way. knesset.gov.il is not reachable from Claude cloud sessions; test
  the scripts against a local mock (`KNESSET_VOTES_SVC`, `KNESSET_PARLIAMENT_V4`,
  `ANTHROPIC_BASE_URL` override the endpoints).
- Next.js 16: middleware is `src/proxy.ts`; `PageProps<"/route">` /
  `LayoutProps` are global type helpers; the root layout lives in `app/[lang]/`.
