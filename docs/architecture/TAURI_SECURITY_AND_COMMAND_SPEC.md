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
| `metrics_get_account_summary` | renderer -> Tauri | global/provider/market metrics summary | no secrets returned |
| `order_preview` | renderer -> Tauri/domain | validate intent without submission | yes |
| `order_submit_paper` | renderer -> Tauri | paper execution only | yes |
| `order_submit_dry_run` | renderer -> Tauri | live-dry-run validation only | yes |
| `order_submit_live` | renderer -> Tauri | live execution only if every gate passes | no secrets returned |
| `order_cancel` | renderer -> Tauri | cancel existing order | no secrets returned |
| `audit_list_recent` | renderer -> Tauri | read redacted audit events | yes |
| `settings_get_safe` | renderer -> Tauri | non-secret local settings | yes |

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

The trading shell must use a restrictive Content Security Policy. The exact `connect-src` list must be provider-aware and include only approved Polymarket/Kalshi endpoints required for the enabled adapters.

```txt
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'self' https://clob.polymarket.com https://gamma-api.polymarket.com wss://ws-subscriptions-clob.polymarket.com https://external-api.kalshi.com wss://external-api-ws.kalshi.com;
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
