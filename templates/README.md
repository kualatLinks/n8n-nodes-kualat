# n8n workflow templates

Importable n8n workflows for kua.lat, written for people who never touch a terminal: install the community node, pick credentials, activate.

## Event templates

Started by something happening on your kua.lat account.

| Template | Trigger | What it does |
| --- | --- | --- |
| [click-log-to-google-sheets.json](click-log-to-google-sheets.json) | `link.clicked` | Appends one row per click to a Google Sheet: timestamp, short URL, destination, country, city, referrer, OS, browser, total clicks |
| [notify-new-link-on-telegram.json](notify-new-link-on-telegram.json) | `link.created` | Sends a Telegram message with the new short URL and its destination |
| [click-feed-to-discord.json](click-feed-to-discord.json) | `link.clicked` | Posts every click to a Discord channel with country, device and referrer |
| [click-alert-email.json](click-alert-email.json) | `link.clicked` | Emails you the moment one specific link is clicked; other clicks are filtered out |

## Scheduled templates

Run on a timetable, no event needed.

| Template | Schedule | What it does |
| --- | --- | --- |
| [top-links-daily-to-slack.json](top-links-daily-to-slack.json) | Daily, 09:00 | Lists the five links with the most clicks and posts the ranking to Slack |
| [broken-link-checker.json](broken-link-checker.json) | Daily, 07:00 | Requests the destination of every link, then emails the ones that time out or answer 4xx/5xx. Silent when all links are healthy |

## Build-your-own tools

Templates that turn n8n into something your other tools can call or fill in.

| Template | Entry point | What it does |
| --- | --- | --- |
| [create-link-api.json](create-link-api.json) | n8n webhook (POST) | Opens a small API on n8n: send `{"url": "..."}` and get the created short URL back, so any tool can create kua.lat links without touching the kua.lat API |
| [shorten-link-form.json](shorten-link-form.json) | n8n form | A web form where anyone can paste a URL and read the short link on the confirmation page |
| [bulk-shorten-from-google-sheets.json](bulk-shorten-from-google-sheets.json) | Manual run | Reads a sheet of URLs, creates a link per row and writes each short URL back into the sheet. Rows without a destination are skipped |

## Pipelines

kua.lat as one step in a bigger flow.

| Template | Trigger | What it does |
| --- | --- | --- |
| [rss-posts-to-tweets.json](rss-posts-to-tweets.json) | RSS feed update | Shortens every new post in a feed and tweets the title with the short link |

## Importing

1. Install **@kualat/n8n-nodes-kualat** in n8n under **Settings → Community Nodes**.
2. Create a **Kualat API** credential: the API URL (for example `https://kua.lat/api`) and an API key from the dashboard.
3. In n8n: **Workflows → Import from File**, pick a template, fill in the credential and the fields listed on the sticky note inside the workflow.
4. Activate.

Each template carries a sticky note with its own setup steps.

## Notes

- The four event templates create and delete a webhook subscription on the kua.lat account automatically when the workflow is activated or deactivated. Activating with **Verify Signature** on (the default) means only deliveries signed with the subscription secret are accepted.
- Templates that read link lists (`top-links-daily-to-slack.json`, `broken-link-checker.json`, `bulk-shorten-from-google-sheets.json`) default to a limit of 5, 100 and full-sheet respectively. Raise the limit or turn on **Return All** for larger accounts.
- The Google Sheets node uses column names in the first row of the sheet. For `click-log-to-google-sheets.json` those are `Timestamp, Short URL, Destination, Country, City, Referrer, OS, Browser, Total Clicks`; for the bulk template they are `Destination, Alias, Description, Short URL`.
- `gmail` nodes ship with placeholder recipients (`you@example.com`), and `telegram` nodes with a placeholder chat id. Replace them before activating.
- Template JSON is hand-authored; import it in a fresh n8n instance before publishing it anywhere, and re-save each node once so the UI populates the resource-locator and schema fields.
