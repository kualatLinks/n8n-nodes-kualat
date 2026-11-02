# Changelog

All notable changes to `@kualat/n8n` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the package uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

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
