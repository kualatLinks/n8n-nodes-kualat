# @kualat/n8n

n8n community node for [kua.lat](https://kua.lat): shorten links, read click statistics, manage webhook subscriptions, and start workflows from link events.

Two nodes ship in this package:

| Node | Purpose |
| --- | --- |
| **Kualat** | Actions: create, get, list, update and delete links; list domains; read the account; manage webhooks. |
| **Kualat Trigger** | Webhook trigger: starts the workflow when a link is created, updated, clicked or deleted. |

Both use one credential, **Kualat API**, holding your API root and an API key.

## Installation

### From npm

```bash
npm install @kualat/n8n
```

Or, inside n8n: **Settings → Community Nodes → Install** and enter
`@kualat/n8n`. Restart n8n afterwards; `Kualat` and `Kualat Trigger` then
appear in the node panel.

### From a checkout of this package

```bash
npm install
npm run build
```

Then either install it into your n8n custom folder
(`~/.n8n/custom` on Linux/macOS, `/home/node/.n8n/custom` in Docker) with
`npm install <path to this folder>`, or `npm pack` it and install the
resulting tarball there.

Builds are produced by `npm run build` (`tsc` plus an icon copy into `dist/`);
`dist/` is not committed.

## Credentials

Open **Integrations → n8n** in the kua.lat dashboard. It shows both values:

| Field | Value |
| --- | --- |
| Base URL | `https://your-domain.com/api` |
| API Key | Your personal key, or a scoped key from **API Keys** |

For a scoped key, enable at least the permissions the workflow needs: `links` for link operations, `domains` for domains, `webhooks` for the trigger. `all` grants everything.

The credential test calls `GET /account`, so a wrong key or URL fails immediately in the n8n credential dialog.

## Trigger behaviour

On workflow activation the trigger registers a subscription with your installation:

1. `POST /webhooks` with the n8n webhook URL and the selected events.
2. The response carries the subscription id and a signing secret, stored in the workflow static data.
3. On deactivation, the subscription is deleted so a dead workflow stops receiving events.

Every delivery follows the [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks) spec:

```
webhook-id: dlv_7Q2m0Jp4Cc1s8Rk3
webhook-timestamp: 1767289443
webhook-signature: v1,K5oZfzN95Z9UVu1EsfQmfVNQhnkZ2pj9o9NDN/H/pI4=
X-Kualat-Event: link.created
```

With **Verify Signature** enabled (default) the node rejects a delivery whose `webhook-signature` does not match, or whose timestamp is more than 5 minutes away from the current time. The signature is `v1,` + base64 HMAC-SHA256 over `"{webhook-id}.{webhook-timestamp}.{raw body}"`, keyed with the subscription secret (`whsec_` + base64; several space-separated signatures are accepted during secret rotation). Verification needs the exact bytes that were sent, so it reads the raw request body that n8n exposes to webhook nodes; if a build does not expose it, the node reports that the signature cannot be verified instead of silently accepting the payload. Turn the option off only while debugging locally.

Payload envelope:

```json
{
  "event": "link.created",
  "delivery": "dlv_7Q2m0Jp4Cc1s8Rk3",
  "created_at": "2026-11-02T09:14:03Z",
  "account": { "id": 42, "username": "your-account" },
  "data": {
    "id": 812,
    "short_url": "https://your-domain.com/C2Rxy",
    "long_url": "https://example.com/page",
    "alias": "C2Rxy",
    "domain": null,
    "title": null,
    "created_at": "2026-11-02 09:14:03"
  }
}
```

`link.clicked` puts the click details (`country`, `city`, `referer`, `os`, `browser`, `clicks`, `clicked_at`) in `data`. `link.updated` and `link.deleted` mirror `link.created` with the fields that changed.

Retries: 30 seconds after the first failure, then 5 minutes. A subscription that fails 20 times in a row is paused by the installation; the trigger recreates it the next time the workflow is activated.

## Update semantics

`PATCH /links/{id}` replaces the optional fields it does not receive; omitted targeting, metadata and password are cleared. The **Update** operation therefore sends only the fields you fill in, and the field description states this. Fetch the link first if you need to preserve settings you do not intend to change.

## Development

```bash
npm install
npm run build     # tsc + copy the node icon into dist/
npm run lint      # type check without emitting
```

`dist/` is produced by the build and is not committed.

## Layout

```
credentials/KualatApi.credentials.ts   credential definition (base URL + key)
nodes/Kualat/Kualat.node.ts           action node
nodes/Kualat/KualatTrigger.node.ts    trigger node
nodes/Kualat/GenericFunctions.ts      shared HTTP helpers
```

## License

MIT. See [LICENSE](LICENSE).
