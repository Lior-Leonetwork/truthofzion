Claude researched case files about Knesset members: criminal cases and incitement. **Nothing here is published by merging.** Each file is a draft about a named person, and it goes up only after you review it and the member has had the right of reply.

Code kept a case only if at least one source passed every check:
- the source is an allowed site (State Attorney and ministries on gov.il, police, courts, State Comptroller, Knesset, or an approved news outlet), and the evidence type is one that site can carry (a news story can never count as an indictment);
- the quote appears word for word in the page as fetched (through the Israeli VPN), and the page names the member;
- the status fits the category, and dates aren't in the future.

## For each file in `content/entries/mk-*-corruption-*.json` / `mk-*-incitement-*.json`

- [ ] Open every source. Does it say exactly what the title and summary say, and is the status right (investigation ≠ indictment ≠ conviction; appeals, closed cases)?
- [ ] Ask the member for a response. Record `response.status` and `requestedOn`, plus `response.text` if they answer.
- [ ] Add archived copies of the sources (`archivedUrl`) and any context in `body`.
- [ ] Set `"state": "published"`, `reviewedBy` (you, not `claude`) and `publishedOn`. `npm run validate` must pass.

To drop a case, delete its file. Merging this pull request only stores the drafts.
