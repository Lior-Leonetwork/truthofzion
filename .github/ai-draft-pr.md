Claude checked members' public statements against how they voted on key votes. **Nothing here is published by merging.** Each finding is a draft case that needs a person, because it says a named member said one thing and did the opposite.

For key votes, Claude searched approved outlets (`data/knesset/statement-sources.json`) for statements made before the vote that contradict the member's vote. Code kept a finding only if:
- the member's recorded vote (for or against) contradicts the stated position;
- the statement was published before the vote, by an approved outlet;
- the quote appears word for word in the article as fetched, and the article names the member.

## For each file in `content/entries/mk-*-vote-*.json`

- [ ] Read the article yourself: is it the member's own words, about this bill, as a firm position, not a condition or a joke?
- [ ] Ask the member for a response, and record `response.status` and `requestedOn`. The editorial rules require this.
- [ ] Add context in `body` if needed and an archived copy of the article (`archivedUrl`), then set `"state": "published"`, `reviewedBy` (you, not `claude`) and `publishedOn`.

To drop a finding, delete its file. Merging this pull request only stores the drafts; each is published when its state is "published" and the rules above pass.
