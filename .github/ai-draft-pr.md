Claude drafted these summaries of Knesset votes. **Nothing here is published until an editor merges this pull request.** Merging publishes every draft in it in your name.

Every draft was written only from the bill's official explanatory notes, and every quote in it was checked word-for-word against that text by code. Drafts that failed the check were discarded, not included.

## For each file in `data/knesset/analysis/`

- [ ] Read the summary against the official bill text (link in `bill.summarySource`). Fix wording directly in the file if needed.
- [ ] Check the topic tags.
- [ ] **Key vote?** `keyVoteSuggested` is the model's suggestion only. To mark a key vote, set `"keyVote": true` and write a `note` (Hebrew and/or English) saying why. CI refuses a key vote without a note.
- [ ] To reject a draft, set `"state": "rejected"`. Don't delete the file, or it will be drafted again tomorrow.

`rationale` is the model's note to you and is never shown on the site.

New drafts are added to this pull request every day until it is merged.
