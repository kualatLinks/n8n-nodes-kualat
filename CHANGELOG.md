# Changelog

All notable changes to `@kualat/n8n-nodes-kualat` are recorded here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the package
uses [semantic versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-03

### Changed

- **Breaking:** the package is renamed from `@kualat/n8n` to
  `@kualat/n8n-nodes-kualat`. n8n refuses to install a community package whose
  name (after the scope) does not start with `n8n-nodes-`, so `@kualat/n8n`
  could not be installed from **Settings → Community Nodes**. As a consequence
  the node type is now `@kualat/n8n-nodes-kualat.kualat` and the trigger
  `@kualat/n8n-nodes-kualat.kualatTrigger`; workflows saved with the old node
  type need their Kualat nodes replaced.

### Added

- Ten importable workflow templates under `templates/`: click logging to Google
  Sheets, Telegram and Discord notifications, a click alert email, a daily Slack
  ranking, a broken-link checker, a link-creation webhook API, a short-link form,
  bulk shortening from a spreadsheet, and RSS-to-tweet automation.

## [1.0.0] - 2026-11-03

### Added

- Trigger signature verification follows the
  [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks)
  spec: headers are `webhook-id`, `webhook-timestamp` and `webhook-signature`,
  the signed content is `{webhook-id}.{webhook-timestamp}.{raw body}`, and the
  signature is `v1,` + base64 HMAC-SHA256. Secrets in the `whsec_` base64
  format are decoded; unprefixed secrets (registered before the standard) keep
  working with their raw bytes as the key. Requires a kua.lat installation that
  sends Standard Webhooks deliveries.
- The npm package is renamed to `@kualat/n8n`.
