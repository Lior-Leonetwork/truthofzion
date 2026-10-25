Claude drafted these summaries of Knesset votes. **Nothing here is published until an editor merges this pull request.** Merging publishes every draft in it in your name.

Every draft was written only from the bill's official explanatory notes, and every quote in it was checked word-for-word against that text by code. Drafts that failed the check were discarded, not included.

## For each file in `data/knesset/analysis/`

- [ ] Read the summary against the official bill text (link in `bill.summarySource`). Fix wording directly in the file if needed.
- [ ] Check the topic tags.
- [ ] **Key vote?** `keyVoteSuggested` is the model's suggestion only. To mark a key vote, set `"keyVote": true` and write a `note` (Hebrew and/or English) saying why. CI refuses a key vote without a note.
- [ ] To reject a draft, set `"state": "rejected"`. Don't delete the file, or it will be drafted again tomorrow.

`rationale` is the model's note to you and is never shown on the site.

## Said one thing, voted the opposite (`content/entries/mk-*-vote-*.json`)

For key votes, Claude searched approved outlets (`data/knesset/statement-sources.json`) for members' public statements made before the vote that contradict how they voted. Code kept a finding only if:
- the member's recorded vote (for or against) contradicts the stated position;
- the statement was published before the vote, by an approved outlet;
- the quote appears word for word in the article as fetched, and the article names the member.

These arrive as **draft cases**, and merging this pull request does **not** publish them. Each one first needs:
- [ ] Read the article yourself: is it the member's own words, about this bill, as a firm position, not a condition or a joke?
- [ ] Ask the member for a response (`response.status` and `requestedOn`), as the editorial rules require.
- [ ] Add context in `body` if needed, an archived copy of the article (`archivedUrl`), then set `"state": "published"`, `reviewedBy` (you, not `claude`) and `publishedOn` in a pull request.

To drop a finding, delete its file.

New drafts are added to this pull request every day until it is merged.
