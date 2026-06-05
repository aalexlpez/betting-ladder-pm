# Tauri Security and Command Spec

Status: implementation source of truth for Tauri shell security, command boundaries, local providers, and desktop runtime behavior.

## Scope decisions

| Decision | Reason | Alternatives considered | Rejected alternatives | Source / evidence |
|---|---|---|---|---|
| Use Tauri commands as the privileged boundary | Keeps filesystem, credentials, network clients, and execution adapters out of React | Direct provider SDK calls from renderer | Renderer trading/network/secret access | Tauri security/runtime authority docs |
| Use capabilities and permissions for exposed frontend access | Makes each WebView/window permission explicit | Broad default permissions for speed | Unscoped plugin/core permissions | Tauri capabilities/permissions docs |
| No remote trading UI by default | Reduces XSS/remote compromise risk in a trading app | Load remote app URLs into the trading shell | Remote trading UI without explicit ADR | Security model + live trading risk model |
| Renderer never receives private keys/API secrets | Prevents accidental UI leak/logging/exfiltration | Pass credentials to renderer | Renderer credential access | Legal/custody model |
| Command payloads are typed and validated | Prevents untrusted UI input from becoming privileged action input | Trust renderer payload shape | Raw unchecked command input | Domain/risk model |

## Process responsibilities

### Tauri Rust side

- Own Tauri command registration and capability configuration.
- Own local settings and approved credential provider integration.
- Own provider SDK/source-of-truth API clients and WebSocket sessions when they are implemented.
- Own execution adapters when live execution is implemented.
- Own file-system audit log writes.
- Enforce app-level kill switch and live gate loading.
- Never load remote trading UI unless a new ADR justifies it.

### React renderer

- Render terminal UI.
- Create order previews/intents.
- Request safe actions through typed command wrappers.
- Never access filesystem, private keys, API secrets, auth signatures, raw signed payloads, or provider SDK clients directly.

### Shared TypeScript packages

- `packages/core` owns deterministic domain logic.
- `packages/ui` renders state and emits intents only.
- Provider adapters live outside React components and must return normalized domain/provider types.
- Official provider SDK objects, generated clients, raw WebSocket messages, auth headers, request signatures, and credentials must not be exposed to shared UI packages or the renderer.

## Required Tauri baseline

- `src-tauri/capabilities` defines explicit permissions for the main trading window.
- Only whitelisted commands are exposed to the frontend.
- File-system plugin permissions, if used, are scoped to the audit/settings paths required by the app.
- Shell/process execution is not exposed to the renderer.
- External URL opening is restricted to explicitly allowed non-trading URLs.
- Production CSP does not allow arbitrary remote script execution.

If a Tauri plugin or permission broadens access materially, the exception needs a short ADR or documented decision plus compensating control.

## Allowed command surface

| Command | Direction | Purpose | Secret-safe? |
|---|---|---|---|
| `app_get_status` | renderer -> Tauri | app/version/mode/gate summary | yes |
| `market_search` | renderer -> Tauri | provider-aware read-only market discovery | yes |
| `market_get_order_book` | renderer -> Tauri | read-only order book snapshot | yes |
| `market_subscribe` | renderer -> Tauri | start read-only stream when available | yes |
| `legal_approval_status` | renderer -> Tauri | read secret-free legal/local approval readiness for the selected provider | yes |
| `legal_approval_submit` | renderer -> Tauri | validate legal responsibility declarations and write the non-committed app-managed local approval | yes |
| `provider_onboarding_status` | renderer -> Tauri | secret-free provider credential/account readiness | yes |
| `provider_connect_account` | renderer -> Tauri | validate one-time local import source references and store app-managed encrypted local credentials | no secrets returned |
| `provider_open_credential_reference` | renderer -> Tauri | open allowlisted provider credential references, such as Polymarket Magic export, in the system browser | yes |
| `provider_import_polymarket_signer_from_clipboard` | renderer -> Tauri | read the copied Magic/exported signer from the OS clipboard in the main process, validate it, store an encrypted local copy, and clear the clipboard on success | no secrets returned |
| `live_preflight_status` | renderer -> Tauri | exact live blockers per provider before live submit | yes |
| `metrics_get_account_summary` | renderer -> Tauri | global/provider/market metrics summary | no secrets returned |
| `order_preview` | renderer -> Tauri/domain | validate intent without submission | yes |
| `order_submit_paper` | renderer -> Tauri | paper execution only | yes |
| `order_submit_dry_run` | renderer -> Tauri | live-dry-run validation only | yes |
| `order_submit_live` | renderer -> Tauri | live execution only if every gate passes | no secrets returned |
| `order_cancel` | renderer -> Tauri | cancel existing order | no secrets returned |
| `audit_list_recent` | renderer -> Tauri | read redacted audit events | yes |
| `settings_get_safe` | renderer -> Tauri | non-secret local settings | yes |

Goal 04C status: `app_get_status`, `market_search`,
`market_get_order_book`, and `market_subscribe` are registered in the Tauri
shell. The three market-data commands return explicit secret-free runtime states
rather than raw provider SDK objects, WebSocket objects, credentials, auth
headers, or signed payloads. `market_search` and `market_get_order_book` now use
provider-owned Rust/Tauri paths where safe: Polymarket discovery, resolution,
and order-book bootstrap use the official Rust SDK (`gamma` and `clob`
features); Kalshi discovery/orderbook uses the documented Trade API REST path
with the recommended `external-api.kalshi.com` host first and the documented
`api.elections.kalshi.com` host as fallback, while normalizing endpoint paths so
`/trade-api/v2` is not duplicated during fallback. `market_search` supports
bounded pagination through secret-free offsets/cursors so the renderer can load
more unified results without receiving raw provider payloads. Kalshi typed
queries stay bounded in the Tauri runtime: exact-looking market identifiers use
the documented `tickers` filter, while general text scans only a small number of
cursor pages before returning the venue state and next cursor. Kalshi `401`/`403`
remains `credentials-required`. Kalshi `market_subscribe` returns
`credentials-required` until a Tauri-side/local credential provider can create
the official WebSocket handshake headers. Polymarket `market_subscribe` returns
`unavailable` with SDK/REST snapshot fallback documented until a safe persistent
Tauri-side WebSocket transport/session is implemented.

The aggregate `market_search` message is intentionally partial-success aware:
when one provider returns normalized markets and another provider fails before a
response, the renderer receives a connected aggregate status plus per-venue
blocker details and a summary that names the blocked venue state.

Kalshi TLS/certificate transport failures remain `disconnected` / `network_error`
states with an explicit DNS/proxy/network-filtering diagnostic. The Tauri
runtime must not disable certificate validation, pin transient provider IPs, or
route around local network policy to make the venue appear connected.

Goal 06/07 status: `live_gate_status`, `legal_approval_status`,
`legal_approval_submit`, `order_submit_live`, and `order_cancel` are registered
as explicit narrow live-execution command boundaries. They return secret-free
gate/order state only. `legal_approval_submit` validates the localized
responsibility checklist and writes the app-managed non-committed local
approval file; normal users do not edit `.local/*.json` or env vars to pass
legal approval. `order_submit_live` checks provider support, app-managed legal
approval or controlled dev/smoke aliases, the non-committed local approval file
(`LEGAL_APPROVAL_FILE` or `.local/legal-gate.local.json`), local
credential-source readiness, explicit live acknowledgement, audit logging, kill
switch, selected market, fresh official order book,
BUY/limit/GTC/non-marketable smoke policy, stake limits,
available funds, provider exposure, and market exposure before any provider
runtime branch. `order_cancel` is risk-reducing and still requires provider
order id plus credential source readiness. The command implementation now has a
Tauri-owned `LiveProviderRuntime` seam that can place a limit order or cancel by
provider order id only after command gates pass; Rust tests inject a mocked
Polymarket runtime to verify submit success, cancel success, provider
rejection, network error, and no provider call while blocked. The Tauri runtime
also requires authenticated provider-owned account metrics readiness before any
risk-increasing live branch can run; renderer-provided funds/exposure values
are not sufficient by themselves. Live submit reloads fresh Tauri-owned account
metrics values for the exact selected provider and market. Those Tauri-owned
values, not renderer payload values, drive available funds, projected exposure,
and local approval exposure-cap checks. `.local/account-metrics.local.json`,
`LOCAL_ACCOUNT_METRICS_FILE`, and `ACCOUNT_METRICS_SOURCE=official_provider`
remain controlled dev/smoke fallbacks only. The Polymarket official Rust SDK
branch is configured by default in the product path, but it still requires
app-managed local signer material in the Tauri process and every
legal/geo/credential/local approval/risk/audit/acknowledgement/non-marketable
gate before any provider call. `POLYMARKET_LIVE_RUNTIME_MODE=disabled` is a
controlled local-off switch. Kalshi live execution remains blocked with
`provider_live_adapter_not_configured`, and no real order is authorized by
committed docs or environment flags alone.
Renderer code still receives no private keys, seed phrases, API secrets, auth
headers, signatures, signed payloads, provider SDK objects, raw provider
payloads, or full wallet/account identifiers.

Goal 07 status: `legal_approval_status`, `legal_approval_submit`,
`provider_onboarding_status`,
`provider_connect_account`, `provider_open_credential_reference`,
`provider_import_polymarket_signer_from_clipboard`, and
`live_preflight_status` are registered as Tauri-owned provider onboarding and
preflight command boundaries.
`legal_approval_submit` receives only non-secret responsibility fields from the
localized desktop modal. The renderer may present one explicit acknowledgement
for usability, but the command still receives the full declaration boolean set
and writes the app-managed local approval only after every required declaration
passes.
`provider_connect_account` may receive one-time import source references from
the renderer, such as a Polymarket local signer source path or Kalshi API Key ID
plus downloaded `.key` source path, but validation, material import, encryption,
and profile persistence stay in Tauri/main process. New product profiles store
app-managed encrypted local credential material under the OS user app-data area;
legacy/manual source paths are compatibility/dev-smoke fallback behavior, not
the normal operator path. The Polymarket normal operator path can open the
official Magic export URL externally through a strict allowlist and can import
the copied signer from the OS clipboard entirely inside the main process; React
does not receive the signer material, auth headers, signatures, signed payloads,
or full identifiers. Responses include masked identifiers, status values, and
reason codes only; they do not echo credential paths or key material. The
explicit local secure provider profile defaults to the OS user app-data area,
with `.local`/env fallback paths reserved for dev/smoke only. The preflight
command combines legal/geo, credential, account metrics, book/market, risk
policy, acknowledgement, kill-switch, audit, non-marketable policy, and provider
adapter gates. Polymarket account metrics are now loaded through a Tauri-owned
authenticated provider runtime before any dev/smoke fallback: CLOB
balance/allowance, CLOB open orders, and provider data API positions are
normalized into secret-free account metric amounts. Kalshi account metrics are
now loaded through a Tauri-owned RSA-PSS signed portfolio runtime before any
dev/smoke fallback: the main process reads the local `.key` file, signs
documented Trade API portfolio requests with `KALSHI-ACCESS-*` headers, and
normalizes USD balance, resting orders, and market positions into secret-free
account metric amounts. Provider credential rejections, provider rejections,
network failures, malformed payloads, invalid provider URLs, missing market
selection, and stale/mismatched local fallback data are returned as exact
blocker reasons. Mocked Tauri tests now cover secret-free onboarding/preflight,
Polymarket seed rejection, Kalshi parseable-RSA key validation, profile
persistence without returning key material, provider-owned account metrics
status without a local metrics file for both providers, and Kalshi place/cancel
success behind the same gates as Polymarket.

## Forbidden renderer capabilities

- arbitrary filesystem access;
- shell/process execution;
- direct provider SDK or trading API access;
- reading `.env` from renderer;
- private keys, API secrets, passphrases, seed phrases, auth headers, or raw signed payloads in renderer memory;
- unrestricted external URL opening;
- remote URL navigation in the trading window;
- live order submission without Tauri-side/domain gate validation.

## Credential and execution location

- `CredentialProvider` lives on the Tauri side or in a Tauri-owned local secure storage adapter.
- Local `.env` credentials are allowed only for controlled dev/smoke tests.
- Product/public builds must use OS secure credential storage or an explicit local credential provider.
- `ExecutionAdapter` lives outside React components and must enforce live gates in the Tauri/domain flow.

## Audit log redaction

Audit events must redact:

- private keys;
- seed phrases;
- API secrets;
- passphrases;
- signed payloads;
- full wallet/account identifiers unless necessary.

## CSP baseline

The trading shell must use a restrictive Content Security Policy. Renderer-side
network access remains blocked by default because provider calls are owned by
Rust/Tauri commands, not React. Therefore the Goal 04C desktop CSP keeps
`connect-src 'self'` and does not list provider HTTP/WebSocket origins in the
renderer policy.

If a later ADR explicitly moves any provider connection into the renderer, the
exact `connect-src` list must become provider-aware and include only the
approved Polymarket/Kalshi endpoints required for the enabled adapter. That is
not the current architecture.

```txt
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

Any additional remote origin requires a documented reason and review.

## Tauri security acceptance checklist

Goal 03 is not complete unless the implementation or documented blocker covers:

- Tauri capabilities expose only required permissions to the trading window;
- renderer cannot access filesystem, shell/process APIs, provider SDKs, private keys, API secrets, passphrases, auth headers, or signed payloads;
- command handlers validate inputs and return typed errors rather than throwing raw platform errors into the renderer;
- trading window blocks unexpected navigation;
- external links are restricted to explicitly allowed, non-trading URLs;
- production CSP is applied and does not allow arbitrary remote script execution;
- provider credentials remain on the Tauri side or in an approved local secure provider;
- no live order path bypasses domain risk validation, legal gates, provider gates, or audit logging.
