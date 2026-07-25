# HACKdeck

[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md)

HACKdeck is a public, multilingual tracker for verified hackathons, build weeks, and major AI/technology company programs. It presents opportunities as a connected chronological deck so builders can compare dates, deadlines, location, eligibility, format, prizes, and status.

**Live site:** [hackdeck-app.vercel.app](https://hackdeck-app.vercel.app/)

## Highlights

- Verified company, university, global, remote, and build-week opportunities
- Connected draggable timeline with chronologically aligned event cards
- Filters for host, location, remote availability, dates, deadlines, prizes, eligibility, format, and status
- Detailed event views with official or organizer source links
- English, Mandarin Chinese, and Spanish interfaces
- Saved hackathons stored locally in the browser
- JSON export and import for portable backups
- No account or sign-up required

## Run locally

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

## Validate and build

```bash
pnpm validate:data
pnpm build
```

## Event data

The verified feed lives in `src/data/events.js`. An event is included only when an official company page or organizer source confirms it. Monitored companies are discovery targets, not events by themselves.

When updating the feed:

1. Verify dates and event details against an official or organizer source.
2. Deduplicate event IDs and source URLs.
3. Archive ended events from the exported feed.
4. Keep `feedMeta.sourceCount` aligned with `sourceCatalog`.
5. Run the validation and production build commands above.

## Saved events and privacy

Saved hackathons remain in the visitor's browser using local storage. HACKdeck does not require an account and does not upload saved-event data. Visitors can export a JSON backup and import it on another browser or device.

## Contributing

Pull requests are welcome. For event additions or corrections, include the official company or organizer source that confirms the submitted information.
