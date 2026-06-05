use alloy::primitives::{keccak256, B256};
use alloy::signers::local::LocalSigner;
use alloy::signers::Signer as _;
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::{DateTime, SecondsFormat, TimeZone, Utc};
use polymarket_client_sdk_v2::auth::{state::Authenticated, Normal};
use polymarket_client_sdk_v2::clob::types::request::{
    BalanceAllowanceRequest, OrderBookSummaryRequest, OrdersRequest, UpdateBalanceAllowanceRequest,
};
use polymarket_client_sdk_v2::clob::types::{
    AssetType as PolymarketAssetType, OrderType as PolymarketOrderType, Side as PolymarketSide,
    SignatureType as PolymarketSignatureType,
};
use polymarket_client_sdk_v2::clob::{
    Client as PolymarketClobClient, Config as PolymarketClobConfig,
};
use polymarket_client_sdk_v2::gamma::types::request::{
    MarketByIdRequest, MarketsRequest, SearchRequest,
};
use polymarket_client_sdk_v2::gamma::Client as PolymarketGammaClient;
use polymarket_client_sdk_v2::types::Address;
use polymarket_client_sdk_v2::types::{Decimal, U256};
use polymarket_client_sdk_v2::POLYGON;
use polymarket_client_sdk_v2::{
    error::{
        Error as PolymarketError, Kind as PolymarketErrorKind, Status as PolymarketStatusError,
        Validation as PolymarketValidationError,
    },
    Result as PolymarketResult,
};
use rand::rngs::OsRng;
use reqwest::{Client as HttpClient, Url};
use rsa::{
    pkcs1::DecodeRsaPrivateKey,
    pkcs8::DecodePrivateKey,
    pss::BlindedSigningKey,
    signature::{RandomizedSigner, SignatureEncoding},
    RsaPrivateKey,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::{
    collections::HashMap,
    env, fs,
    future::Future,
    path::{Path, PathBuf},
    process::Command,
    str::FromStr,
    time::Duration,
};
use tokio::time::timeout;
#[cfg(windows)]
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
    System::{
        DataExchange::{CloseClipboard, EmptyClipboard, GetClipboardData, OpenClipboard},
        Memory::{GlobalLock, GlobalUnlock},
    },
};

const POLYMARKET_CLOB_BASE_URL: &str = "https://clob.polymarket.com";
const POLYMARKET_CLOB_V2_BASE_URL: &str = "https://clob-v2.polymarket.com";
const POLYMARKET_DATA_API_BASE_URL: &str = "https://data-api.polymarket.com";
const POLYMARKET_MAGIC_EXPORT_URL: &str = "https://reveal.magic.link/polymarket";
const POLYMARKET_EXPORT_HELP_URL: &str =
    "https://help.polymarket.com/en/articles/13364258-how-do-i-export-my-key";
const POLYMARKET_PUSD_DOCS_URL: &str = "https://docs.polymarket.com/concepts/pusd";
const POLYMARKET_SIGNATURE_TYPE_EOA: &str = "eoa";
const POLYMARKET_SIGNATURE_TYPE_PROXY: &str = "proxy";
const POLYMARKET_SIGNATURE_TYPE_GNOSIS_SAFE: &str = "gnosis_safe";
const POLYMARKET_SIGNATURE_TYPE_POLY_1271: &str = "poly_1271";
const POLYMARKET_DEPOSIT_WALLET_FACTORY_POLYGON: &str =
    "0x00000000000Fb5C9ADea0298D729A0CB3823Cc07";
const POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION_POLYGON: &str =
    "0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB";
#[cfg(not(test))]
const POLYMARKET_DEPOSIT_WALLET_BEACON_SELECTOR: &str = "0x49493a4d";
#[cfg(windows)]
const WINDOWS_CLIPBOARD_UNICODE_TEXT_FORMAT: u32 = 13;
const POLYMARKET_TERMINAL_CURSOR: &str = "LTE=";
const POLYMARKET_ACCOUNT_METRICS_MAX_ORDER_PAGES: usize = 3;
const KALSHI_ACCOUNT_METRICS_MAX_ORDER_PAGES: usize = 3;
const KALSHI_ACCOUNT_METRICS_MAX_POSITION_PAGES: usize = 3;
const KALSHI_BASE_URLS: [&str; 2] = [
    "https://external-api.kalshi.com/trade-api/v2",
    "https://api.elections.kalshi.com/trade-api/v2",
];
const KALSHI_TRADE_API_PREFIX: &str = "/trade-api/v2";
const KALSHI_TRADE_API_BASE_URL_VAR: &str = "KALSHI_TRADE_API_BASE_URL_DEV_ONLY";
const KALSHI_QUERY_SCAN_MAX_PAGES: usize = 3;
const PROVIDER_REQUEST_TIMEOUT: Duration = Duration::from_secs(12);
const STALE_THRESHOLD_MS: i64 = 10_000;
const POLYMARKET_LIVE_RUNTIME_MODE: &str = "official_sdk";
const POLYMARKET_LIVE_RUNTIME_MODE_VAR: &str = "POLYMARKET_LIVE_RUNTIME_MODE";
const POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR: &str = "POLYMARKET_LOCAL_SIGNER_MATERIAL_DEV_ONLY";
const LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR: &str = "LOCAL_SECURE_PROVIDER_PROFILE_FILE_DEV_ONLY";
const LOCAL_SECURE_PROVIDER_PROFILE_DEFAULT_FILE: &str =
    ".local/secure-provider-credentials.local.json";
const APP_MANAGED_SECRET_STORAGE: &str = "app_managed_encrypted_file";
const APP_MANAGED_SECRET_PROTECTION_WINDOWS: &str = "windows_dpapi_current_user";
const ACCOUNT_METRICS_SOURCE_VAR: &str = "ACCOUNT_METRICS_SOURCE";
const ACCOUNT_METRICS_SOURCE_OFFICIAL: &str = "official_provider";
const LOCAL_ACCOUNT_METRICS_PROVIDER_READY_VAR: &str = "LOCAL_ACCOUNT_METRICS_PROVIDER_READY";
const LOCAL_ACCOUNT_METRICS_FILE_VAR: &str = "LOCAL_ACCOUNT_METRICS_FILE";
const LOCAL_ACCOUNT_METRICS_DEFAULT_FILE: &str = ".local/account-metrics.local.json";
const ACCOUNT_METRICS_STALE_THRESHOLD_MS: i64 = 60_000;
const LEGAL_APPROVAL_FILE_VAR: &str = "LEGAL_APPROVAL_FILE";
const LEGAL_APPROVAL_DEFAULT_FILE: &str = ".local/legal-gate.local.json";

#[cfg(test)]
thread_local! {
    static TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH: std::cell::RefCell<Option<PathBuf>> =
        const { std::cell::RefCell::new(None) };
    static TEST_LOCAL_APPROVAL_GATE_PATH: std::cell::RefCell<Option<PathBuf>> =
        const { std::cell::RefCell::new(None) };
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppStatus {
    product_name: &'static str,
    version: &'static str,
    execution_mode: &'static str,
    live_trading_enabled: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketSearchRequest {
    query: String,
    provider_id: Option<String>,
    limit: Option<u16>,
    offset: Option<u32>,
    cursor_by_provider: Option<HashMap<String, String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketGetOrderBookRequest {
    provider_id: String,
    market_id: String,
    outcome_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarketSubscribeRequest {
    provider_id: String,
    market_id: String,
    outcome_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LiveGateStatusRequest {
    provider_id: String,
    explicit_live_ack: bool,
    audit_log_enabled: bool,
    kill_switch_active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderOnboardingStatusRequest {
    #[serde(default)]
    provider_id: Option<String>,
    #[serde(default)]
    market_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderCredentialConnectRequest {
    provider_id: String,
    credential_source: String,
    #[serde(default)]
    polymarket_signer_file_path: Option<String>,
    #[serde(default)]
    polymarket_trading_address: Option<String>,
    #[serde(default)]
    polymarket_signature_type: Option<String>,
    #[serde(default)]
    kalshi_api_key_id: Option<String>,
    #[serde(default)]
    kalshi_key_file_path: Option<String>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct PolymarketSignerClipboardImportRequest {
    #[serde(default)]
    polymarket_trading_address: Option<String>,
    #[serde(default)]
    polymarket_signature_type: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PolymarketAccountCandidateApplyRequest {
    label: String,
    signature_type: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProviderCredentialReferenceOpenRequest {
    provider_id: String,
    reference_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LivePreflightStatusRequest {
    #[serde(default)]
    provider_id: Option<String>,
    #[serde(default)]
    market_id: Option<String>,
    #[serde(default)]
    outcome_id: Option<String>,
    #[serde(default)]
    selected_market: bool,
    #[serde(default)]
    order_book_freshness: Option<String>,
    explicit_live_ack: bool,
    audit_log_enabled: bool,
    kill_switch_active: bool,
    #[serde(default)]
    stake_amount: Option<String>,
    #[serde(default)]
    max_stake_per_order: Option<String>,
    #[serde(default)]
    max_market_exposure: Option<String>,
    #[serde(default)]
    non_marketable: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LiveOrderSubmitRequest {
    provider_id: String,
    market_id: String,
    outcome_id: String,
    side: String,
    order_type: String,
    time_in_force: String,
    price: String,
    stake_amount: String,
    stake_currency: String,
    quantity: String,
    marketable: bool,
    explicit_live_ack: bool,
    audit_log_enabled: bool,
    kill_switch_active: bool,
    selected_market: bool,
    order_book_freshness: String,
    max_stake_per_order: String,
    max_market_exposure: String,
    #[serde(default)]
    min_order_size: Option<String>,
    available_funds: Option<String>,
    provider_exposure: Option<String>,
    market_exposure: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CancelOrderRequest {
    provider_id: String,
    provider_order_id: String,
    market_id: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RendererOutcomeView {
    provider_id: String,
    market_id: String,
    outcome_id: String,
    label: String,
    status: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RendererMarketSearchResult {
    provider_id: String,
    market_id: String,
    title: String,
    status: String,
    outcomes: Vec<RendererOutcomeView>,
    #[serde(skip_serializing_if = "Option::is_none")]
    volume: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    liquidity: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct VenueCommandState {
    provider_id: String,
    status: String,
    freshness: String,
    connection_mode: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_reason: Option<String>,
    has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    next_cursor: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RendererTradableMarketRef {
    provider_id: String,
    market_id: String,
    outcome_id: String,
    currency: String,
    tick_size: String,
    market_status: String,
    freshness: String,
}

#[derive(Serialize, Clone)]
struct OrderBookLevel {
    price: String,
    size: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct RendererOrderBookSnapshot {
    market_ref: RendererTradableMarketRef,
    captured_at: String,
    bids: Vec<OrderBookLevel>,
    asks: Vec<OrderBookLevel>,
    tick_size: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    min_order_size: Option<String>,
    freshness: String,
    connection_mode: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MarketSearchCommandResponse {
    command: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider_id: Option<String>,
    status: String,
    freshness: String,
    connection_mode: String,
    message: String,
    secret_free: bool,
    markets: Vec<RendererMarketSearchResult>,
    provider_states: Vec<VenueCommandState>,
    provider_ids: Vec<String>,
    has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    next_offset: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next_cursor_by_provider: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    captured_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MarketGetOrderBookCommandResponse {
    command: &'static str,
    provider_id: String,
    market_id: String,
    outcome_id: String,
    status: String,
    freshness: String,
    connection_mode: String,
    message: String,
    secret_free: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    order_book: Option<RendererOrderBookSnapshot>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_reason: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MarketSubscribeCommandResponse {
    command: &'static str,
    provider_id: String,
    market_id: String,
    outcome_id: String,
    status: String,
    freshness: String,
    connection_mode: String,
    message: String,
    secret_free: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_reason: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LiveGateStatusCommandResponse {
    command: &'static str,
    provider_id: String,
    status: String,
    message: String,
    secret_free: bool,
    ready: bool,
    reasons: Vec<String>,
    local_approval_loaded: bool,
    credential_source_ready: bool,
    account_metrics_source_ready: bool,
    live_trading_enabled: bool,
    legal_gate_status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegalApprovalStatusRequest {
    provider_id: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LegalApprovalStatusCommandResponse {
    command: &'static str,
    provider_id: String,
    status: String,
    message: String,
    secret_free: bool,
    ready: bool,
    reasons: Vec<String>,
    local_approval_loaded: bool,
    legal_gate_status: String,
    approval_source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    limits: Option<LocalApprovalLimits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    approved_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegalApprovalSubmitRequest {
    provider_id: String,
    target_jurisdiction: String,
    operator_identity: String,
    approver: String,
    max_stake_first_order: String,
    max_market_exposure: String,
    checks: LegalApprovalSubmitChecks,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegalApprovalSubmitChecks {
    platform_eligible: bool,
    real_operator: bool,
    real_beneficial_owners: bool,
    real_account_owner: bool,
    no_geoblock_bypass: bool,
    no_vpn_bypass: bool,
    no_fake_kyc: bool,
    no_sanctions_bypass: bool,
    no_custody: bool,
    c0_review_pass: bool,
    c1_risk_accepted: bool,
    audit_enabled: bool,
    first_live_smoke_only: bool,
    no_deposits_or_withdrawals: bool,
    understands_risk: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderOnboardingStatusCommandResponse {
    command: &'static str,
    status: String,
    message: String,
    secret_free: bool,
    providers: Vec<ProviderOnboardingProviderStatus>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderCredentialReferenceOpenCommandResponse {
    command: &'static str,
    provider_id: String,
    reference_id: String,
    status: String,
    message: String,
    secret_free: bool,
    opened_url: Option<&'static str>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderOnboardingProviderStatus {
    provider_id: String,
    label: &'static str,
    credential: ProviderCredentialStatus,
    account_metrics: ProviderAccountMetricsStatus,
    live_adapter_status: String,
    ready_for_preflight: bool,
    reasons: Vec<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderCredentialStatus {
    status: String,
    source: String,
    message: String,
    reasons: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    masked_identifier: Option<String>,
    checked_at: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderAccountMetricsStatus {
    status: String,
    source: String,
    message: String,
    reasons: Vec<String>,
    checked_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    available_funds: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider_exposure: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    market_exposure: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    open_order_amount: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    position_exposure: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    public_portfolio_value: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    account_candidates: Vec<ProviderAccountCandidateStatus>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProviderAccountCandidateStatus {
    label: String,
    signature_type: String,
    configured: bool,
    masked_identifier: String,
    status: String,
    reasons: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    public_portfolio_value: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trade_ready_cash: Option<ProviderMetricAmount>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trade_ready_cash_status: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    trade_ready_cash_reasons: Vec<String>,
    #[serde(skip_serializing_if = "is_false")]
    recommended: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    recommendation_reason: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct ProviderMetricAmount {
    amount: String,
    currency: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LivePreflightStatusCommandResponse {
    command: &'static str,
    status: String,
    message: String,
    secret_free: bool,
    ready: bool,
    providers: Vec<LivePreflightProviderStatus>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LivePreflightProviderStatus {
    provider_id: String,
    status: String,
    ready: bool,
    reasons: Vec<String>,
    message: String,
    credential: ProviderCredentialStatus,
    account_metrics: ProviderAccountMetricsStatus,
    gates: Vec<LivePreflightGateStatus>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LivePreflightGateStatus {
    id: String,
    status: String,
    blocks_live: bool,
    reasons: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LiveOrderCommandResponse {
    command: &'static str,
    provider_id: String,
    status: String,
    message: String,
    secret_free: bool,
    submitted_externally: bool,
    reasons: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider_order_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    audit_event_type: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalApprovalGateFile {
    status: String,
    provider_id: String,
    target_jurisdiction: String,
    operator_identity: String,
    approver: String,
    c0_review: String,
    c1_risk_acceptance: String,
    max_stake_first_order: String,
    max_market_exposure: String,
    geoblock_result: String,
    credential_source: String,
    audit_log: String,
    approved_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalAccountMetricsFile {
    provider_id: String,
    market_id: String,
    available_funds: String,
    provider_exposure: String,
    market_exposure: String,
    #[serde(default)]
    open_order_amount: Option<String>,
    #[serde(default)]
    position_exposure: Option<String>,
    captured_at: String,
}

#[derive(Deserialize, Serialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalSecureProviderProfileFile {
    profiles: Vec<LocalSecureProviderProfile>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalSecureProviderProfile {
    provider_id: String,
    credential_source: String,
    configured_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    polymarket_signer_storage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    polymarket_signer_file_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    polymarket_trading_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    polymarket_signature_type: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    polymarket_imported_address_candidates: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kalshi_api_key_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kalshi_key_storage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    kalshi_key_file_path: Option<String>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppManagedCredentialEnvelope {
    version: u8,
    provider_id: String,
    material_kind: String,
    protection: String,
    ciphertext: String,
}

struct LiveGateEvaluation {
    ready: bool,
    reasons: Vec<String>,
    local_approval_loaded: bool,
    credential_source_ready: bool,
    account_metrics_source_ready: bool,
    live_trading_enabled: bool,
    legal_gate_status: String,
    local_approval_limits: Option<LocalApprovalLimits>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalApprovalLimits {
    max_stake_first_order: String,
    max_market_exposure: String,
}

#[derive(Clone, Debug, PartialEq)]
struct TauriOwnedAccountMetrics {
    available_funds: String,
    provider_exposure: String,
    market_exposure: String,
    open_order_amount: String,
    position_exposure: String,
}

#[derive(Default)]
struct ProviderAccountMetricsDiagnostics {
    public_portfolio_value: Option<ProviderMetricAmount>,
    account_candidates: Vec<ProviderAccountCandidateStatus>,
}

#[derive(Clone, Debug)]
struct PolymarketAccountCandidateSpec {
    label: String,
    signature_type: PolymarketSignatureType,
    address: Address,
    configured: bool,
}

struct ProviderSearchResult {
    markets: Vec<RendererMarketSearchResult>,
    state: VenueCommandState,
}

#[derive(Debug)]
struct ProviderFailure {
    status: &'static str,
    freshness: &'static str,
    error_reason: &'static str,
    message: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum LiveProviderRuntimeResult {
    Submitted { provider_order_id: String },
    Cancelled { provider_order_id: String },
    Rejected { reason: String, message: String },
    NetworkError { message: String },
    Unavailable { reason: String, message: String },
}

#[derive(Clone, Debug, PartialEq)]
enum ProviderAccountMetricsRuntimeResult {
    Ready(TauriOwnedAccountMetrics),
    Rejected { reason: String, message: String },
    NetworkError { message: String },
    Unavailable { reason: String, message: String },
}

trait LiveProviderRuntime {
    fn place_limit_order(&self, request: &LiveOrderSubmitRequest) -> LiveProviderRuntimeResult;
    fn cancel_order(&self, request: &CancelOrderRequest) -> LiveProviderRuntimeResult;
}

trait ProviderAccountMetricsRuntime {
    fn load_account_metrics(
        &self,
        request: &LiveOrderSubmitRequest,
    ) -> ProviderAccountMetricsRuntimeResult;
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum LiveProviderRuntimeKind {
    Unconfigured,
    PolymarketOfficialSdk,
}

enum ConfiguredLiveProviderRuntime {
    Unconfigured(UnconfiguredLiveProviderRuntime),
    Polymarket(PolymarketLiveProviderRuntime),
}

enum ConfiguredProviderAccountMetricsRuntime {
    Unconfigured(UnconfiguredProviderAccountMetricsRuntime),
    Polymarket(PolymarketProviderAccountMetricsRuntime),
    Kalshi(KalshiProviderAccountMetricsRuntime),
}

impl LiveProviderRuntime for ConfiguredLiveProviderRuntime {
    fn place_limit_order(&self, request: &LiveOrderSubmitRequest) -> LiveProviderRuntimeResult {
        match self {
            Self::Unconfigured(runtime) => runtime.place_limit_order(request),
            Self::Polymarket(runtime) => runtime.place_limit_order(request),
        }
    }

    fn cancel_order(&self, request: &CancelOrderRequest) -> LiveProviderRuntimeResult {
        match self {
            Self::Unconfigured(runtime) => runtime.cancel_order(request),
            Self::Polymarket(runtime) => runtime.cancel_order(request),
        }
    }
}

impl ProviderAccountMetricsRuntime for ConfiguredProviderAccountMetricsRuntime {
    fn load_account_metrics(
        &self,
        request: &LiveOrderSubmitRequest,
    ) -> ProviderAccountMetricsRuntimeResult {
        match self {
            Self::Unconfigured(runtime) => runtime.load_account_metrics(request),
            Self::Polymarket(runtime) => runtime.load_account_metrics(request),
            Self::Kalshi(runtime) => runtime.load_account_metrics(request),
        }
    }
}

struct UnconfiguredLiveProviderRuntime {
    provider_id: String,
}

struct PolymarketLiveProviderRuntime {
    host: String,
}

struct UnconfiguredProviderAccountMetricsRuntime {
    provider_id: String,
}

struct PolymarketProviderAccountMetricsRuntime {
    clob_host: String,
    data_api_host: String,
}

struct KalshiProviderAccountMetricsRuntime {
    base_urls: Vec<String>,
}

struct KalshiLocalCredentials {
    api_key_id: String,
    private_key: RsaPrivateKey,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum KalshiAccountMetricsError {
    Credential { reason: String },
    ProviderCredentialsRequired,
    ProviderRejected { reason: &'static str },
    Network,
    PayloadInvalid,
    UrlInvalid,
}

impl LiveProviderRuntime for UnconfiguredLiveProviderRuntime {
    fn place_limit_order(&self, _request: &LiveOrderSubmitRequest) -> LiveProviderRuntimeResult {
        LiveProviderRuntimeResult::Unavailable {
            reason: "provider_live_adapter_not_configured".to_string(),
            message: format!(
                "{} live order adapter is not configured in this Tauri build.",
                live_provider_label(&self.provider_id)
            ),
        }
    }

    fn cancel_order(&self, _request: &CancelOrderRequest) -> LiveProviderRuntimeResult {
        LiveProviderRuntimeResult::Unavailable {
            reason: "provider_live_adapter_not_configured".to_string(),
            message: format!(
                "{} live cancel adapter is not configured in this Tauri build.",
                live_provider_label(&self.provider_id)
            ),
        }
    }
}

impl ProviderAccountMetricsRuntime for UnconfiguredProviderAccountMetricsRuntime {
    fn load_account_metrics(
        &self,
        _request: &LiveOrderSubmitRequest,
    ) -> ProviderAccountMetricsRuntimeResult {
        ProviderAccountMetricsRuntimeResult::Unavailable {
            reason: "account_metrics_provider_not_configured".to_string(),
            message: format!(
                "{} authenticated account metrics adapter is not configured in this Tauri build.",
                live_provider_label(&self.provider_id)
            ),
        }
    }
}

impl LiveProviderRuntime for PolymarketLiveProviderRuntime {
    fn place_limit_order(&self, request: &LiveOrderSubmitRequest) -> LiveProviderRuntimeResult {
        tauri::async_runtime::block_on(place_polymarket_limit_order(&self.host, request))
    }

    fn cancel_order(&self, request: &CancelOrderRequest) -> LiveProviderRuntimeResult {
        tauri::async_runtime::block_on(cancel_polymarket_order(&self.host, request))
    }
}

impl ProviderAccountMetricsRuntime for PolymarketProviderAccountMetricsRuntime {
    fn load_account_metrics(
        &self,
        request: &LiveOrderSubmitRequest,
    ) -> ProviderAccountMetricsRuntimeResult {
        tauri::async_runtime::block_on(load_polymarket_provider_account_metrics(
            &self.clob_host,
            &self.data_api_host,
            request,
        ))
    }
}

impl ProviderAccountMetricsRuntime for KalshiProviderAccountMetricsRuntime {
    fn load_account_metrics(
        &self,
        request: &LiveOrderSubmitRequest,
    ) -> ProviderAccountMetricsRuntimeResult {
        tauri::async_runtime::block_on(load_kalshi_provider_account_metrics(
            &self.base_urls,
            request,
        ))
    }
}

async fn place_polymarket_limit_order(
    host: &str,
    request: &LiveOrderSubmitRequest,
) -> LiveProviderRuntimeResult {
    let token_id = match U256::from_str(request.outcome_id.trim()) {
        Ok(token_id) => token_id,
        Err(_) => {
            return LiveProviderRuntimeResult::Rejected {
                reason: "provider_payload_invalid".to_string(),
                message: "Polymarket live order requires a numeric outcome token id.".to_string(),
            };
        }
    };
    let price = match Decimal::from_str(request.price.trim()) {
        Ok(price) => price,
        Err(_) => {
            return LiveProviderRuntimeResult::Rejected {
                reason: "provider_payload_invalid".to_string(),
                message: "Polymarket live order requires a decimal limit price.".to_string(),
            };
        }
    };
    let size = match Decimal::from_str(request.quantity.trim()) {
        Ok(size) => size,
        Err(_) => {
            return LiveProviderRuntimeResult::Rejected {
                reason: "provider_payload_invalid".to_string(),
                message: "Polymarket live order requires a decimal order size.".to_string(),
            };
        }
    };

    match place_polymarket_limit_order_result(host, token_id, price, size).await {
        Ok(result) => result,
        Err(error) => map_polymarket_order_error(error, request),
    }
}

async fn place_polymarket_limit_order_result(
    host: &str,
    token_id: U256,
    price: Decimal,
    size: Decimal,
) -> PolymarketResult<LiveProviderRuntimeResult> {
    let credentials = load_polymarket_runtime_credentials()?;
    let signer = parse_polymarket_local_signer_material(credentials.signer_material.trim())?;
    let mut auth_builder = PolymarketClobClient::new(host, PolymarketClobConfig::default())?
        .authentication_builder(&signer)
        .signature_type(credentials.signature_type);
    if let Some(trading_address) = credentials.trading_address {
        auth_builder = auth_builder.funder(trading_address);
    }
    let client = auth_builder.authenticate().await?;
    refresh_polymarket_collateral_balance_allowance(&client, credentials.signature_type).await?;
    let response = client
        .limit_order()
        .token_id(token_id)
        .side(PolymarketSide::Buy)
        .price(price)
        .size(size)
        .order_type(PolymarketOrderType::GTC)
        .post_only(true)
        .build_sign_and_post(&signer)
        .await?;

    if response.success {
        Ok(LiveProviderRuntimeResult::Submitted {
            provider_order_id: response.order_id,
        })
    } else {
        Ok(LiveProviderRuntimeResult::Rejected {
            reason: "provider_rejected".to_string(),
            message: response
                .error_msg
                .filter(|message| !message.trim().is_empty())
                .unwrap_or_else(|| {
                    format!(
                        "Polymarket rejected the live limit order with status {}.",
                        response.status
                    )
                }),
        })
    }
}

async fn cancel_polymarket_order(
    host: &str,
    request: &CancelOrderRequest,
) -> LiveProviderRuntimeResult {
    match cancel_polymarket_order_result(host, request.provider_order_id.trim()).await {
        Ok(result) => result,
        Err(error) => map_polymarket_error(error),
    }
}

async fn cancel_polymarket_order_result(
    host: &str,
    provider_order_id: &str,
) -> PolymarketResult<LiveProviderRuntimeResult> {
    let credentials = load_polymarket_runtime_credentials()?;
    let signer = parse_polymarket_local_signer_material(credentials.signer_material.trim())?;
    let mut auth_builder = PolymarketClobClient::new(host, PolymarketClobConfig::default())?
        .authentication_builder(&signer)
        .signature_type(credentials.signature_type);
    if let Some(trading_address) = credentials.trading_address {
        auth_builder = auth_builder.funder(trading_address);
    }
    let client = auth_builder.authenticate().await?;
    let response = client.cancel_order(provider_order_id).await?;

    if response
        .canceled
        .iter()
        .any(|order_id| order_id == provider_order_id)
    {
        return Ok(LiveProviderRuntimeResult::Cancelled {
            provider_order_id: provider_order_id.to_string(),
        });
    }

    Ok(LiveProviderRuntimeResult::Rejected {
        reason: "provider_rejected".to_string(),
        message: response
            .not_canceled
            .get(provider_order_id)
            .cloned()
            .filter(|message| !message.trim().is_empty())
            .unwrap_or_else(|| {
                "Polymarket did not confirm cancellation for the requested order.".to_string()
            }),
    })
}

async fn load_polymarket_provider_account_metrics(
    clob_host: &str,
    data_api_host: &str,
    request: &LiveOrderSubmitRequest,
) -> ProviderAccountMetricsRuntimeResult {
    match load_polymarket_provider_account_metrics_result(clob_host, data_api_host, request).await {
        Ok(metrics) => ProviderAccountMetricsRuntimeResult::Ready(metrics),
        Err(error) => map_polymarket_account_metrics_error(error),
    }
}

async fn load_polymarket_provider_account_metrics_result(
    clob_host: &str,
    data_api_host: &str,
    request: &LiveOrderSubmitRequest,
) -> PolymarketResult<TauriOwnedAccountMetrics> {
    let credentials = load_polymarket_runtime_credentials()?;
    let signer = parse_polymarket_local_signer_material(credentials.signer_material.trim())?;
    let account_address = credentials
        .trading_address
        .unwrap_or_else(|| signer.address())
        .to_string();
    let mut auth_builder = PolymarketClobClient::new(clob_host, PolymarketClobConfig::default())?
        .authentication_builder(&signer)
        .signature_type(credentials.signature_type);
    if let Some(trading_address) = credentials.trading_address {
        auth_builder = auth_builder.funder(trading_address);
    }
    let client = auth_builder.authenticate().await?;
    let balance =
        load_polymarket_collateral_balance_allowance(&client, credentials.signature_type).await?;
    let open_order_amount = load_polymarket_open_order_exposure(&client).await?;
    let market_open_order_amount =
        load_polymarket_market_open_order_exposure(&client, &request.market_id).await?;
    let (position_exposure, market_position_exposure) =
        load_polymarket_position_exposure(data_api_host, &account_address, &request.market_id)
            .await
            .map_err(PolymarketError::validation)?;
    let provider_exposure = open_order_amount + position_exposure;
    let market_exposure = market_open_order_amount + market_position_exposure;

    Ok(TauriOwnedAccountMetrics {
        available_funds: normalize_polymarket_collateral_amount(balance.balance).to_string(),
        provider_exposure: provider_exposure.to_string(),
        market_exposure: market_exposure.to_string(),
        open_order_amount: open_order_amount.to_string(),
        position_exposure: position_exposure.to_string(),
    })
}

async fn refresh_polymarket_collateral_balance_allowance(
    client: &PolymarketClobClient<Authenticated<Normal>>,
    signature_type: PolymarketSignatureType,
) -> PolymarketResult<()> {
    client
        .update_balance_allowance(
            UpdateBalanceAllowanceRequest::builder()
                .asset_type(PolymarketAssetType::Collateral)
                .signature_type(signature_type)
                .build(),
        )
        .await
}

async fn load_polymarket_collateral_balance_allowance(
    client: &PolymarketClobClient<Authenticated<Normal>>,
    signature_type: PolymarketSignatureType,
) -> PolymarketResult<polymarket_client_sdk_v2::clob::types::response::BalanceAllowanceResponse> {
    refresh_polymarket_collateral_balance_allowance(client, signature_type).await?;
    client
        .balance_allowance(
            BalanceAllowanceRequest::builder()
                .asset_type(PolymarketAssetType::Collateral)
                .signature_type(signature_type)
                .build(),
        )
        .await
}

async fn load_polymarket_candidate_trade_ready_cash(
    clob_host: &str,
    signer_material: &str,
    candidate: &PolymarketAccountCandidateSpec,
) -> PolymarketResult<Decimal> {
    let signer = parse_polymarket_local_signer_material(signer_material)?;
    let mut auth_builder = PolymarketClobClient::new(clob_host, PolymarketClobConfig::default())?
        .authentication_builder(&signer)
        .signature_type(candidate.signature_type);
    if candidate.signature_type != PolymarketSignatureType::Eoa {
        auth_builder = auth_builder.funder(candidate.address);
    }
    let client = auth_builder.authenticate().await?;
    let balance =
        load_polymarket_collateral_balance_allowance(&client, candidate.signature_type).await?;

    Ok(normalize_polymarket_collateral_amount(balance.balance))
}

fn normalize_polymarket_collateral_amount(amount: Decimal) -> Decimal {
    amount / Decimal::from_str("1000000").expect("decimal literal should parse")
}

#[cfg(not(test))]
fn polymarket_candidate_trade_ready_cash_reason(error: &PolymarketError) -> &'static str {
    if error.kind() == PolymarketErrorKind::Geoblock {
        "geo_blocked"
    } else if is_polymarket_credential_runtime_error(&error.to_string()) {
        "credential_source_missing"
    } else if matches!(
        error.kind(),
        PolymarketErrorKind::Status | PolymarketErrorKind::Validation
    ) {
        "account_metrics_provider_rejected"
    } else {
        "account_metrics_network_error"
    }
}

async fn load_polymarket_open_order_exposure(
    client: &PolymarketClobClient<Authenticated<Normal>>,
) -> PolymarketResult<Decimal> {
    let request = OrdersRequest::builder().build();
    let mut cursor = None;
    let mut exposure = Decimal::ZERO;

    for _ in 0..POLYMARKET_ACCOUNT_METRICS_MAX_ORDER_PAGES {
        let page = client.orders(&request, cursor.clone()).await?;
        exposure += polymarket_open_order_exposure(&page.data, None);
        if page.next_cursor == POLYMARKET_TERMINAL_CURSOR || page.next_cursor.trim().is_empty() {
            break;
        }
        cursor = Some(page.next_cursor);
    }

    Ok(exposure)
}

async fn load_polymarket_market_open_order_exposure(
    client: &PolymarketClobClient<Authenticated<Normal>>,
    market_id: &str,
) -> PolymarketResult<Decimal> {
    let request = OrdersRequest::builder().build();
    let mut cursor = None;
    let mut exposure = Decimal::ZERO;

    for _ in 0..POLYMARKET_ACCOUNT_METRICS_MAX_ORDER_PAGES {
        let page = client.orders(&request, cursor.clone()).await?;
        exposure += polymarket_open_order_exposure(&page.data, Some(market_id));
        if page.next_cursor == POLYMARKET_TERMINAL_CURSOR || page.next_cursor.trim().is_empty() {
            break;
        }
        cursor = Some(page.next_cursor);
    }

    Ok(exposure)
}

fn polymarket_open_order_exposure(
    orders: &[polymarket_client_sdk_v2::clob::types::response::OpenOrderResponse],
    market_id: Option<&str>,
) -> Decimal {
    orders.iter().fold(Decimal::ZERO, |exposure, order| {
        if market_id.is_some_and(|id| order.market.to_string() != id) {
            return exposure;
        }
        let remaining = order.original_size - order.size_matched;
        if remaining <= Decimal::ZERO {
            return exposure;
        }
        let order_exposure = if order.side == PolymarketSide::Buy {
            remaining * order.price
        } else {
            remaining
        };
        exposure + order_exposure
    })
}

async fn load_polymarket_position_exposure(
    data_api_host: &str,
    wallet_address: &str,
    market_id: &str,
) -> Result<(Decimal, Decimal), String> {
    let mut url = Url::parse(data_api_host)
        .map_err(|_| "account_metrics_provider_url_invalid".to_string())?;
    url.set_path("positions");
    {
        let mut query = url.query_pairs_mut();
        query.append_pair("user", wallet_address);
        query.append_pair("limit", "500");
        query.append_pair("sizeThreshold", "0");
    }

    let client = HttpClient::new();
    let response = timeout(PROVIDER_REQUEST_TIMEOUT, client.get(url).send())
        .await
        .map_err(|_| "account_metrics_network_error".to_string())?
        .map_err(|_| "account_metrics_network_error".to_string())?;
    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("provider_credentials_required".to_string());
    }
    if !status.is_success() {
        return Err("account_metrics_provider_rejected".to_string());
    }

    let payload = response
        .json::<Value>()
        .await
        .map_err(|_| "account_metrics_payload_invalid".to_string())?;
    let positions = payload
        .as_array()
        .ok_or_else(|| "account_metrics_payload_invalid".to_string())?;
    let mut provider_exposure = Decimal::ZERO;
    let mut market_exposure = Decimal::ZERO;

    for position in positions {
        let exposure = position_exposure_value(position);
        provider_exposure += exposure;
        if read_string(position, &["conditionId"]).as_deref() == Some(market_id) {
            market_exposure += exposure;
        }
    }

    Ok((provider_exposure, market_exposure))
}

async fn load_polymarket_public_portfolio_value(
    data_api_host: &str,
    wallet_address: &str,
) -> Result<Decimal, String> {
    let mut url = Url::parse(data_api_host)
        .map_err(|_| "account_metrics_provider_url_invalid".to_string())?;
    url.set_path("value");
    url.query_pairs_mut()
        .append_pair("user", wallet_address.trim());

    let client = HttpClient::new();
    let response = timeout(PROVIDER_REQUEST_TIMEOUT, client.get(url).send())
        .await
        .map_err(|_| "account_metrics_network_error".to_string())?
        .map_err(|_| "account_metrics_network_error".to_string())?;
    let status = response.status();
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err("provider_credentials_required".to_string());
    }
    if !status.is_success() {
        return Err("account_metrics_provider_rejected".to_string());
    }

    let payload = response
        .json::<Value>()
        .await
        .map_err(|_| "account_metrics_payload_invalid".to_string())?;
    polymarket_public_portfolio_value_from_payload(&payload, wallet_address)
}

fn polymarket_public_portfolio_value_from_payload(
    payload: &Value,
    wallet_address: &str,
) -> Result<Decimal, String> {
    let values = payload
        .as_array()
        .ok_or_else(|| "account_metrics_payload_invalid".to_string())?;
    if values.is_empty() {
        return Ok(Decimal::ZERO);
    }

    let normalized_wallet = wallet_address.trim().to_ascii_lowercase();
    let matched = values
        .iter()
        .find(|value| {
            read_string(value, &["user"])
                .is_some_and(|user| user.trim().eq_ignore_ascii_case(&normalized_wallet))
        })
        .or_else(|| values.first())
        .ok_or_else(|| "account_metrics_payload_invalid".to_string())?;

    read_decimal_value(matched, "value")
        .ok_or_else(|| "account_metrics_payload_invalid".to_string())
}

fn position_exposure_value(position: &Value) -> Decimal {
    ["initialValue", "currentValue", "totalBought"]
        .iter()
        .filter_map(|field| read_decimal_value(position, field))
        .max_by(|left, right| left.cmp(right))
        .unwrap_or(Decimal::ZERO)
}

fn read_decimal_value(value: &Value, field: &str) -> Option<Decimal> {
    let raw = value.get(field)?;
    if let Some(text) = raw.as_str() {
        return Decimal::from_str(text.trim()).ok();
    }
    if let Some(number) = raw.as_f64() {
        return Decimal::from_str(&number.to_string()).ok();
    }
    None
}

async fn load_kalshi_provider_account_metrics(
    base_urls: &[String],
    request: &LiveOrderSubmitRequest,
) -> ProviderAccountMetricsRuntimeResult {
    match load_kalshi_provider_account_metrics_result(base_urls, request).await {
        Ok(metrics) => ProviderAccountMetricsRuntimeResult::Ready(metrics),
        Err(error) => map_kalshi_account_metrics_error(error),
    }
}

async fn load_kalshi_provider_account_metrics_result(
    base_urls: &[String],
    request: &LiveOrderSubmitRequest,
) -> Result<TauriOwnedAccountMetrics, KalshiAccountMetricsError> {
    let credentials = load_kalshi_local_credentials()?;
    let client = http_client();
    let balance =
        kalshi_signed_get_json(&client, base_urls, &credentials, "/portfolio/balance", &[]).await?;
    let order_pages = load_kalshi_open_order_pages(&client, base_urls, &credentials).await?;
    let position_pages = load_kalshi_position_pages(&client, base_urls, &credentials).await?;

    kalshi_account_metrics_from_payloads(request, &balance, &order_pages, &position_pages)
}

async fn load_kalshi_open_order_pages(
    client: &HttpClient,
    base_urls: &[String],
    credentials: &KalshiLocalCredentials,
) -> Result<Vec<Value>, KalshiAccountMetricsError> {
    let mut pages = Vec::new();
    let mut cursor: Option<String> = None;

    for _ in 0..KALSHI_ACCOUNT_METRICS_MAX_ORDER_PAGES {
        let mut query = vec![
            ("status".to_string(), "resting".to_string()),
            ("limit".to_string(), "100".to_string()),
        ];
        if let Some(page_cursor) = cursor.as_deref() {
            query.push(("cursor".to_string(), page_cursor.to_string()));
        }

        let page =
            kalshi_signed_get_json(client, base_urls, credentials, "/portfolio/orders", &query)
                .await?;
        cursor = extract_kalshi_cursor(&page);
        pages.push(page);

        if cursor.is_none() {
            break;
        }
    }

    Ok(pages)
}

async fn load_kalshi_position_pages(
    client: &HttpClient,
    base_urls: &[String],
    credentials: &KalshiLocalCredentials,
) -> Result<Vec<Value>, KalshiAccountMetricsError> {
    let mut pages = Vec::new();
    let mut cursor: Option<String> = None;

    for _ in 0..KALSHI_ACCOUNT_METRICS_MAX_POSITION_PAGES {
        let mut query = vec![
            ("limit".to_string(), "100".to_string()),
            (
                "count_filter".to_string(),
                "position,total_traded".to_string(),
            ),
        ];
        if let Some(page_cursor) = cursor.as_deref() {
            query.push(("cursor".to_string(), page_cursor.to_string()));
        }

        let page = kalshi_signed_get_json(
            client,
            base_urls,
            credentials,
            "/portfolio/positions",
            &query,
        )
        .await?;
        cursor = extract_kalshi_cursor(&page);
        pages.push(page);

        if cursor.is_none() {
            break;
        }
    }

    Ok(pages)
}

fn kalshi_account_metrics_from_payloads(
    request: &LiveOrderSubmitRequest,
    balance_payload: &Value,
    order_pages: &[Value],
    position_pages: &[Value],
) -> Result<TauriOwnedAccountMetrics, KalshiAccountMetricsError> {
    let available_funds =
        kalshi_available_funds(balance_payload).ok_or(KalshiAccountMetricsError::PayloadInvalid)?;
    let open_order_amount = kalshi_open_order_exposure(order_pages, None)?;
    let market_open_order_amount =
        kalshi_open_order_exposure(order_pages, Some(&request.market_id))?;
    let (position_exposure, market_position_exposure) =
        kalshi_position_exposure(position_pages, &request.market_id)?;
    let provider_exposure = open_order_amount + position_exposure;
    let market_exposure = market_open_order_amount + market_position_exposure;

    Ok(TauriOwnedAccountMetrics {
        available_funds: available_funds.to_string(),
        provider_exposure: provider_exposure.to_string(),
        market_exposure: market_exposure.to_string(),
        open_order_amount: open_order_amount.to_string(),
        position_exposure: position_exposure.to_string(),
    })
}

fn kalshi_available_funds(payload: &Value) -> Option<Decimal> {
    read_decimal_value(payload, "balance_dollars")
        .or_else(|| kalshi_cents_field(payload, "balance"))
}

fn kalshi_open_order_exposure(
    order_pages: &[Value],
    market_id: Option<&str>,
) -> Result<Decimal, KalshiAccountMetricsError> {
    let mut exposure = Decimal::ZERO;

    for page in order_pages {
        let orders = page
            .get("orders")
            .and_then(Value::as_array)
            .ok_or(KalshiAccountMetricsError::PayloadInvalid)?;
        for order in orders {
            exposure += kalshi_single_order_exposure(order, market_id);
        }
    }

    Ok(exposure)
}

fn kalshi_single_order_exposure(order: &Value, market_id: Option<&str>) -> Decimal {
    if market_id.is_some_and(|id| read_string(order, &["ticker"]).as_deref() != Some(id)) {
        return Decimal::ZERO;
    }

    if read_string(order, &["status"]).is_some_and(|status| status != "resting") {
        return Decimal::ZERO;
    }

    let remaining = read_kalshi_contract_count(
        order,
        &["remaining_count_fp", "remaining_count", "count_fp", "count"],
    )
    .unwrap_or(Decimal::ZERO);
    if remaining <= Decimal::ZERO {
        return Decimal::ZERO;
    }

    let yes_price = kalshi_dollar_or_cent_fields(order, &["yes_price_dollars"], &["yes_price"]);
    let no_price = kalshi_dollar_or_cent_fields(order, &["no_price_dollars"], &["no_price"]);
    let unit_exposure = match (yes_price, no_price) {
        (Some(yes), Some(no)) if yes >= no => yes,
        (Some(_), Some(no)) => no,
        (Some(yes), None) => yes,
        (None, Some(no)) => no,
        (None, None) => Decimal::from_str("1").expect("decimal literal should parse"),
    };

    remaining * unit_exposure
}

fn kalshi_position_exposure(
    position_pages: &[Value],
    market_id: &str,
) -> Result<(Decimal, Decimal), KalshiAccountMetricsError> {
    let mut provider_exposure = Decimal::ZERO;
    let mut market_exposure = Decimal::ZERO;

    for page in position_pages {
        let positions = page
            .get("market_positions")
            .and_then(Value::as_array)
            .ok_or(KalshiAccountMetricsError::PayloadInvalid)?;
        for position in positions {
            let exposure = kalshi_dollar_or_cent_fields(
                position,
                &["market_exposure_dollars"],
                &["market_exposure"],
            )
            .ok_or(KalshiAccountMetricsError::PayloadInvalid)?;
            provider_exposure += exposure;
            if read_string(position, &["ticker"]).as_deref() == Some(market_id) {
                market_exposure += exposure;
            }
        }
    }

    Ok((provider_exposure, market_exposure))
}

fn read_kalshi_contract_count(value: &Value, fields: &[&str]) -> Option<Decimal> {
    fields
        .iter()
        .find_map(|field| read_decimal_value(value, field))
}

fn kalshi_dollar_or_cent_fields(
    value: &Value,
    dollar_fields: &[&str],
    cent_fields: &[&str],
) -> Option<Decimal> {
    dollar_fields
        .iter()
        .find_map(|field| read_decimal_value(value, field))
        .or_else(|| {
            cent_fields
                .iter()
                .find_map(|field| kalshi_cents_field(value, field))
        })
}

fn kalshi_cents_field(value: &Value, field: &str) -> Option<Decimal> {
    let cents = read_decimal_value(value, field)?;
    Some(cents / Decimal::from_str("100").expect("decimal literal should parse"))
}

async fn kalshi_signed_get_json(
    client: &HttpClient,
    base_urls: &[String],
    credentials: &KalshiLocalCredentials,
    endpoint_path: &str,
    query_pairs: &[(String, String)],
) -> Result<Value, KalshiAccountMetricsError> {
    let mut last_network_error = None;

    for base_url in base_urls {
        match kalshi_signed_get_json_once(client, base_url, credentials, endpoint_path, query_pairs)
            .await
        {
            Ok(payload) => return Ok(payload),
            Err(KalshiAccountMetricsError::Network) => {
                last_network_error = Some(KalshiAccountMetricsError::Network);
            }
            Err(error) => return Err(error),
        }
    }

    Err(last_network_error.unwrap_or(KalshiAccountMetricsError::UrlInvalid))
}

async fn kalshi_signed_get_json_once(
    client: &HttpClient,
    base_url: &str,
    credentials: &KalshiLocalCredentials,
    endpoint_path: &str,
    query_pairs: &[(String, String)],
) -> Result<Value, KalshiAccountMetricsError> {
    let url = kalshi_account_metrics_url(base_url, endpoint_path, query_pairs)?;
    let timestamp = Utc::now().timestamp_millis().to_string();
    let signature_message = kalshi_request_signature_message(&timestamp, "GET", url.path());
    let signature = kalshi_sign_request(&credentials.private_key, &signature_message)?;
    let response = timeout(
        PROVIDER_REQUEST_TIMEOUT,
        client
            .get(url)
            .header("KALSHI-ACCESS-KEY", &credentials.api_key_id)
            .header("KALSHI-ACCESS-SIGNATURE", signature)
            .header("KALSHI-ACCESS-TIMESTAMP", timestamp)
            .send(),
    )
    .await
    .map_err(|_| KalshiAccountMetricsError::Network)?
    .map_err(|_| KalshiAccountMetricsError::Network)?;
    let status = response.status();

    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return Err(KalshiAccountMetricsError::ProviderCredentialsRequired);
    }
    if !status.is_success() {
        return Err(KalshiAccountMetricsError::ProviderRejected {
            reason: "account_metrics_provider_rejected",
        });
    }

    response
        .json::<Value>()
        .await
        .map_err(|_| KalshiAccountMetricsError::PayloadInvalid)
}

fn kalshi_account_metrics_url(
    base_url: &str,
    endpoint_path: &str,
    query_pairs: &[(String, String)],
) -> Result<Url, KalshiAccountMetricsError> {
    let endpoint = endpoint_path.trim_start_matches('/');
    let mut url = Url::parse(&format!(
        "{}/{}",
        normalize_kalshi_trade_api_base_url(base_url),
        endpoint
    ))
    .map_err(|_| KalshiAccountMetricsError::UrlInvalid)?;

    for (key, value) in query_pairs {
        url.query_pairs_mut().append_pair(key, value);
    }

    Ok(url)
}

fn kalshi_request_signature_message(timestamp: &str, method: &str, path: &str) -> String {
    let path_without_query = path.split('?').next().unwrap_or(path);
    format!(
        "{}{}{}",
        timestamp,
        method.to_ascii_uppercase(),
        path_without_query
    )
}

fn kalshi_sign_request(
    private_key: &RsaPrivateKey,
    message: &str,
) -> Result<String, KalshiAccountMetricsError> {
    let signing_key = BlindedSigningKey::<Sha256>::new(private_key.clone());
    let signature = signing_key.sign_with_rng(&mut OsRng, message.as_bytes());

    Ok(BASE64_STANDARD.encode(signature.to_bytes()))
}

fn load_kalshi_local_credentials() -> Result<KalshiLocalCredentials, KalshiAccountMetricsError> {
    let profile = load_local_secure_provider_profile("kalshi")
        .map_err(|_| KalshiAccountMetricsError::Credential {
            reason: "credential_source_missing".to_string(),
        })?
        .ok_or(KalshiAccountMetricsError::Credential {
            reason: "credential_source_missing".to_string(),
        })?;
    let api_key_id = profile
        .kalshi_api_key_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or(KalshiAccountMetricsError::Credential {
            reason: "kalshi_api_key_id_missing".to_string(),
        })?;
    let material = load_kalshi_key_material_from_profile(&profile)
        .map_err(|reason| KalshiAccountMetricsError::Credential { reason })?;
    validate_kalshi_key_material(&material).map_err(|reason| {
        KalshiAccountMetricsError::Credential {
            reason: reason.to_string(),
        }
    })?;
    let private_key =
        parse_kalshi_private_key(&material).map_err(|_| KalshiAccountMetricsError::Credential {
            reason: "kalshi_key_file_invalid".to_string(),
        })?;

    Ok(KalshiLocalCredentials {
        api_key_id: api_key_id.to_string(),
        private_key,
    })
}

fn map_kalshi_account_metrics_error(
    error: KalshiAccountMetricsError,
) -> ProviderAccountMetricsRuntimeResult {
    match error {
        KalshiAccountMetricsError::Credential { reason } => {
            ProviderAccountMetricsRuntimeResult::Rejected {
                reason: reason.to_string(),
                message:
                    "Kalshi credential material is not ready in the Tauri-owned local provider."
                        .to_string(),
            }
        }
        KalshiAccountMetricsError::ProviderCredentialsRequired => {
            ProviderAccountMetricsRuntimeResult::Rejected {
                reason: "provider_credentials_required".to_string(),
                message:
                    "Kalshi rejected the account metrics request because credentials are not authorized."
                        .to_string(),
            }
        }
        KalshiAccountMetricsError::ProviderRejected { reason } => {
            ProviderAccountMetricsRuntimeResult::Rejected {
                reason: reason.to_string(),
                message: "Kalshi rejected the account metrics request.".to_string(),
            }
        }
        KalshiAccountMetricsError::Network => ProviderAccountMetricsRuntimeResult::NetworkError {
            message:
                "Kalshi account metrics request failed before a confirmed provider response."
                    .to_string(),
        },
        KalshiAccountMetricsError::PayloadInvalid => {
            ProviderAccountMetricsRuntimeResult::Rejected {
                reason: "account_metrics_payload_invalid".to_string(),
                message: "Kalshi account metrics response could not be normalized safely."
                    .to_string(),
            }
        }
        KalshiAccountMetricsError::UrlInvalid => ProviderAccountMetricsRuntimeResult::Rejected {
            reason: "account_metrics_provider_url_invalid".to_string(),
            message: "Kalshi account metrics provider URL could not be constructed.".to_string(),
        },
    }
}

fn parse_polymarket_signature_type(value: &str) -> Result<PolymarketSignatureType, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        POLYMARKET_SIGNATURE_TYPE_EOA | "0" => Ok(PolymarketSignatureType::Eoa),
        POLYMARKET_SIGNATURE_TYPE_PROXY | "poly_proxy" | "1" => Ok(PolymarketSignatureType::Proxy),
        POLYMARKET_SIGNATURE_TYPE_GNOSIS_SAFE | "gnosis" | "safe" | "2" => {
            Ok(PolymarketSignatureType::GnosisSafe)
        }
        POLYMARKET_SIGNATURE_TYPE_POLY_1271 | "poly1271" | "poly-1271" | "3" => {
            Ok(PolymarketSignatureType::Poly1271)
        }
        _ => Err("polymarket_signature_type_invalid".to_string()),
    }
}

fn polymarket_signature_type_label(signature_type: PolymarketSignatureType) -> &'static str {
    match signature_type {
        PolymarketSignatureType::Eoa => POLYMARKET_SIGNATURE_TYPE_EOA,
        PolymarketSignatureType::Proxy => POLYMARKET_SIGNATURE_TYPE_PROXY,
        PolymarketSignatureType::GnosisSafe => POLYMARKET_SIGNATURE_TYPE_GNOSIS_SAFE,
        PolymarketSignatureType::Poly1271 => POLYMARKET_SIGNATURE_TYPE_POLY_1271,
        _ => POLYMARKET_SIGNATURE_TYPE_EOA,
    }
}

fn parse_polymarket_trading_address(
    value: Option<&str>,
    signature_type: PolymarketSignatureType,
) -> Result<Option<Address>, String> {
    let trimmed = value.map(str::trim).unwrap_or_default();

    if signature_type == PolymarketSignatureType::Eoa {
        if trimmed.is_empty() {
            return Ok(None);
        }

        return Err("polymarket_trading_address_not_allowed_for_eoa".to_string());
    }

    if trimmed.is_empty() {
        return Err("polymarket_trading_address_missing".to_string());
    }

    let address =
        Address::from_str(trimmed).map_err(|_| "polymarket_trading_address_invalid".to_string())?;
    if address == Address::ZERO {
        return Err("polymarket_trading_address_zero".to_string());
    }

    Ok(Some(address))
}

fn resolve_polymarket_trading_address(
    signer_material: &str,
    value: Option<&str>,
    signature_type: PolymarketSignatureType,
) -> Result<Option<Address>, String> {
    let trimmed = value.map(str::trim).unwrap_or_default();
    if !trimmed.is_empty() || signature_type == PolymarketSignatureType::Poly1271 {
        return parse_polymarket_trading_address(value, signature_type);
    }

    match signature_type {
        PolymarketSignatureType::Eoa => Ok(None),
        PolymarketSignatureType::Proxy => {
            let signer = parse_polymarket_local_signer_material(signer_material)
                .map_err(|_| "polymarket_local_signer_file_invalid".to_string())?;
            polymarket_client_sdk_v2::derive_proxy_wallet(signer.address(), POLYGON)
                .ok_or_else(|| "polymarket_trading_address_auto_derive_failed".to_string())
                .map(Some)
        }
        PolymarketSignatureType::GnosisSafe => {
            let signer = parse_polymarket_local_signer_material(signer_material)
                .map_err(|_| "polymarket_local_signer_file_invalid".to_string())?;
            polymarket_client_sdk_v2::derive_safe_wallet(signer.address(), POLYGON)
                .ok_or_else(|| "polymarket_trading_address_auto_derive_failed".to_string())
                .map(Some)
        }
        _ => Err("polymarket_trading_address_missing".to_string()),
    }
}

fn map_polymarket_error(error: PolymarketError) -> LiveProviderRuntimeResult {
    map_polymarket_error_with_context(error, None)
}

fn map_polymarket_order_error(
    error: PolymarketError,
    request: &LiveOrderSubmitRequest,
) -> LiveProviderRuntimeResult {
    map_polymarket_error_with_context(error, Some(polymarket_order_error_context(request)))
}

fn map_polymarket_error_with_context(
    error: PolymarketError,
    context: Option<String>,
) -> LiveProviderRuntimeResult {
    match error.kind() {
        PolymarketErrorKind::Status
        | PolymarketErrorKind::Validation
        | PolymarketErrorKind::Geoblock => LiveProviderRuntimeResult::Rejected {
            reason: if error.kind() == PolymarketErrorKind::Geoblock {
                "geo_blocked".to_string()
            } else if is_polymarket_credential_runtime_error(&error.to_string()) {
                "credential_source_missing".to_string()
            } else {
                "provider_rejected".to_string()
            },
            message: polymarket_error_message(&error, context.as_deref()),
        },
        _ => LiveProviderRuntimeResult::NetworkError {
            message: "Polymarket live provider request failed before a confirmed response."
                .to_string(),
        },
    }
}

fn map_polymarket_account_metrics_error(
    error: PolymarketError,
) -> ProviderAccountMetricsRuntimeResult {
    match error.kind() {
        PolymarketErrorKind::Status
        | PolymarketErrorKind::Validation
        | PolymarketErrorKind::Geoblock => {
            let reason = if error.kind() == PolymarketErrorKind::Geoblock {
                "geo_blocked"
            } else if is_polymarket_credential_runtime_error(&error.to_string()) {
                "credential_source_missing"
            } else if error.to_string().contains("account_metrics_network_error") {
                "account_metrics_network_error"
            } else if error
                .to_string()
                .contains("account_metrics_payload_invalid")
            {
                "account_metrics_payload_invalid"
            } else if error.to_string().contains("provider_credentials_required") {
                "provider_credentials_required"
            } else if error
                .to_string()
                .contains("account_metrics_provider_rejected")
            {
                "account_metrics_provider_rejected"
            } else {
                "account_metrics_provider_rejected"
            };
            ProviderAccountMetricsRuntimeResult::Rejected {
                reason: reason.to_string(),
                message: if reason == "credential_source_missing" {
                    "Polymarket local signer material is missing from the Tauri-owned credential provider."
                        .to_string()
                } else if reason == "geo_blocked" {
                    "Polymarket account metrics request failed platform/geographic eligibility."
                        .to_string()
                } else if reason == "account_metrics_network_error" {
                    "Polymarket account metrics request failed before a confirmed provider response."
                        .to_string()
                } else {
                    "Polymarket account metrics request was rejected by the provider.".to_string()
                },
            }
        }
        _ => ProviderAccountMetricsRuntimeResult::NetworkError {
            message:
                "Polymarket account metrics request failed before a confirmed provider response."
                    .to_string(),
        },
    }
}

fn is_polymarket_credential_runtime_error(message: &str) -> bool {
    message.contains("local signer material")
        || message.contains("polymarket_signature_type")
        || message.contains("polymarket_trading_address")
}

fn polymarket_error_message(error: &PolymarketError, context: Option<&str>) -> String {
    if error.to_string().contains("local signer material missing") {
        "Polymarket local signer material is missing from the Tauri-owned credential provider."
            .to_string()
    } else if error.to_string().contains("local signer material invalid") {
        "Polymarket local signer material could not be parsed by the Tauri-owned credential provider."
            .to_string()
    } else if error.kind() == PolymarketErrorKind::Geoblock {
        "Polymarket rejected the request because platform/geographic eligibility failed."
            .to_string()
    } else if let Some(provider_message) = polymarket_provider_error_detail(error) {
        format_polymarket_rejected_message(&provider_message, context)
    } else {
        format_polymarket_rejected_message("provider returned no response body", context)
    }
}

fn polymarket_provider_error_detail(error: &PolymarketError) -> Option<String> {
    if let Some(status) = error.downcast_ref::<PolymarketStatusError>() {
        return sanitize_polymarket_provider_message(&status.message).or_else(|| {
            let status_detail = format!(
                "HTTP {} while calling {} {}",
                status.status_code, status.method, status.path
            );
            sanitize_polymarket_provider_message(&status_detail)
        });
    }

    if let Some(validation) = error.downcast_ref::<PolymarketValidationError>() {
        return sanitize_polymarket_provider_message(&validation.reason);
    }

    sanitize_polymarket_provider_message(&error.to_string())
}

fn format_polymarket_rejected_message(detail: &str, context: Option<&str>) -> String {
    match context {
        Some(context) if !context.trim().is_empty() => {
            format!("Polymarket rejected the live provider request: {detail}. Context: {context}.")
        }
        _ => format!("Polymarket rejected the live provider request: {detail}."),
    }
}

fn polymarket_order_error_context(request: &LiveOrderSubmitRequest) -> String {
    let mut parts = vec![
        format!("side={}", request.side),
        format!("price={}", request.price),
        format!("size={}", request.quantity),
        format!("stake={} {}", request.stake_amount, request.stake_currency),
        format!("postOnly={}", !request.marketable),
        format!("freshness={}", request.order_book_freshness),
    ];

    if let Some(min_order_size) = request
        .min_order_size
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        parts.push(format!("marketMinSize={min_order_size}"));
    }

    parts.join(", ")
}

fn sanitize_polymarket_provider_message(message: &str) -> Option<String> {
    let normalized = message
        .replace(['\r', '\n', '\t'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let trimmed = normalized.trim();

    if trimmed.is_empty() {
        return None;
    }

    let redacted = redact_long_hex_tokens(trimmed);
    let lower = redacted.to_ascii_lowercase();
    let mapped = if lower.contains("invalid post-only order")
        || lower.contains("post-only")
        || lower.contains("crosses book")
        || lower.contains("cross the book")
    {
        "post-only order would cross the current book; choose a less aggressive BUY price"
            .to_string()
    } else if lower.contains("lower than the minimum")
        || lower.contains("minimum")
        || lower.contains("min_size")
        || lower.contains("min size")
        || lower.contains("min_order_size")
        || lower.contains("invalid_order_min_size")
    {
        format!("order size is below Polymarket's market minimum ({redacted})")
    } else if lower.contains("tick size")
        || lower.contains("minimum tick")
        || lower.contains("price increment")
        || lower.contains("invalid_order_min_tick_size")
    {
        format!("price does not conform to the market tick size ({redacted})")
    } else if lower.contains("not enough balance")
        || lower.contains("insufficient balance")
        || lower.contains("allowance")
        || lower.contains("invalid_order_not_enough_balance")
    {
        "not enough pUSD balance or exchange allowance for the funder address".to_string()
    } else if lower.contains("market_not_ready") || lower.contains("market is not yet ready") {
        "market is not yet accepting orders".to_string()
    } else if lower.contains("duplicated") || lower.contains("duplicate") {
        "an identical order is already resting or was just submitted".to_string()
    } else {
        redacted
    };

    Some(truncate_provider_message(&mapped))
}

fn truncate_provider_message(message: &str) -> String {
    const MAX_PROVIDER_MESSAGE_CHARS: usize = 320;
    let mut truncated = String::new();

    for character in message.chars().take(MAX_PROVIDER_MESSAGE_CHARS) {
        truncated.push(character);
    }

    if message.chars().count() > MAX_PROVIDER_MESSAGE_CHARS {
        truncated.push_str("...");
    }

    truncated
}

fn redact_long_hex_tokens(message: &str) -> String {
    let mut output = String::with_capacity(message.len());
    let mut index = 0;

    while index < message.len() {
        let remainder = &message[index..];
        if remainder.starts_with("0x") || remainder.starts_with("0X") {
            let hex_start = index + 2;
            let mut hex_end = hex_start;
            while hex_end < message.len()
                && message.as_bytes()[hex_end].is_ascii_hexdigit()
            {
                hex_end += 1;
            }

            if hex_end - hex_start >= 12 {
                output.push_str("0x[redacted]");
                index = hex_end;
                continue;
            }
        }

        let mut chars = remainder.chars();
        if let Some(character) = chars.next() {
            output.push(character);
            index += character.len_utf8();
        } else {
            break;
        }
    }

    output
}

#[tauri::command]
fn app_get_status() -> AppStatus {
    AppStatus {
        product_name: "Prediction Ladder",
        version: env!("CARGO_PKG_VERSION"),
        execution_mode: "disabled",
        live_trading_enabled: false,
    }
}

#[tauri::command]
fn live_gate_status(request: LiveGateStatusRequest) -> LiveGateStatusCommandResponse {
    let evaluation = evaluate_live_gate_status(
        &request.provider_id,
        request.explicit_live_ack,
        request.audit_log_enabled,
        request.kill_switch_active,
    );

    live_gate_status_response(&request.provider_id, evaluation)
}

#[tauri::command]
fn legal_approval_status(
    request: LegalApprovalStatusRequest,
) -> LegalApprovalStatusCommandResponse {
    legal_approval_status_response(&request.provider_id)
}

#[tauri::command]
fn legal_approval_submit(
    request: LegalApprovalSubmitRequest,
) -> LegalApprovalStatusCommandResponse {
    let provider_id = request.provider_id.trim().to_string();

    match build_local_approval_from_submit(request) {
        Ok(approval) => match save_local_approval_gate(&approval) {
            Ok(()) => legal_approval_status_response(&provider_id),
            Err(reason) => LegalApprovalStatusCommandResponse {
                command: "legal_approval_status",
                provider_id,
                status: "blocked".to_string(),
                message: format!("Legal approval is blocked by: {reason}."),
                secret_free: true,
                ready: false,
                reasons: vec![reason],
                local_approval_loaded: false,
                legal_gate_status: "NOT_APPROVED".to_string(),
                approval_source: "tauri_local_approval_file".to_string(),
                limits: None,
                approved_at: None,
            },
        },
        Err(reasons) => LegalApprovalStatusCommandResponse {
            command: "legal_approval_status",
            provider_id,
            status: "blocked".to_string(),
            message: format!("Legal approval is blocked by: {}.", reasons.join(", ")),
            secret_free: true,
            ready: false,
            reasons,
            local_approval_loaded: false,
            legal_gate_status: "NOT_APPROVED".to_string(),
            approval_source: "tauri_local_approval_file".to_string(),
            limits: None,
            approved_at: None,
        },
    }
}

#[tauri::command]
fn provider_onboarding_status(
    request: ProviderOnboardingStatusRequest,
) -> ProviderOnboardingStatusCommandResponse {
    provider_onboarding_status_response(
        request.provider_id.as_deref(),
        request.market_id.as_deref(),
    )
}

#[tauri::command]
fn provider_connect_account(
    request: ProviderCredentialConnectRequest,
) -> ProviderOnboardingStatusCommandResponse {
    let provider_id = request.provider_id.clone();
    let status = connect_provider_account(request);

    match status {
        Ok(()) => provider_onboarding_status_response(Some(&provider_id), None),
        Err(reason) => ProviderOnboardingStatusCommandResponse {
            command: "provider_onboarding_status",
            status: "blocked".to_string(),
            message: format!(
                "{} account onboarding is blocked by: {}.",
                live_provider_label(&provider_id),
                reason
            ),
            secret_free: true,
            providers: vec![provider_onboarding_provider_status(
                &provider_id,
                None,
                Some(reason),
            )],
        },
    }
}

#[tauri::command]
fn provider_open_credential_reference(
    request: ProviderCredentialReferenceOpenRequest,
) -> ProviderCredentialReferenceOpenCommandResponse {
    let provider_id = request.provider_id.trim().to_string();
    let reference_id = request.reference_id.trim().to_string();
    let Some(url) = allowed_credential_reference_url(&provider_id, &reference_id) else {
        return ProviderCredentialReferenceOpenCommandResponse {
            command: "provider_open_credential_reference",
            provider_id,
            reference_id,
            status: "blocked".to_string(),
            message: "Credential reference blocked because it is not in the Tauri allowlist."
                .to_string(),
            secret_free: true,
            opened_url: None,
        };
    };

    match open_external_https_url(url) {
        Ok(()) => ProviderCredentialReferenceOpenCommandResponse {
            command: "provider_open_credential_reference",
            provider_id,
            reference_id,
            status: "opened".to_string(),
            message: "Opened the approved credential reference in the system browser.".to_string(),
            secret_free: true,
            opened_url: Some(url),
        },
        Err(reason) => ProviderCredentialReferenceOpenCommandResponse {
            command: "provider_open_credential_reference",
            provider_id,
            reference_id,
            status: "blocked".to_string(),
            message: format!("Credential reference could not be opened: {reason}."),
            secret_free: true,
            opened_url: None,
        },
    }
}

#[tauri::command]
fn provider_import_polymarket_signer_from_clipboard(
    request: Option<PolymarketSignerClipboardImportRequest>,
) -> ProviderOnboardingStatusCommandResponse {
    let status = import_polymarket_signer_from_clipboard(request.unwrap_or_default());

    match status {
        Ok(()) => provider_onboarding_status_response(Some("polymarket"), None),
        Err(reason) => ProviderOnboardingStatusCommandResponse {
            command: "provider_onboarding_status",
            status: "blocked".to_string(),
            message: format!("Polymarket account onboarding is blocked by: {}.", reason),
            secret_free: true,
            providers: vec![provider_onboarding_provider_status(
                "polymarket",
                None,
                Some(reason),
            )],
        },
    }
}

#[tauri::command]
fn provider_apply_polymarket_account_candidate(
    request: PolymarketAccountCandidateApplyRequest,
) -> ProviderOnboardingStatusCommandResponse {
    match apply_polymarket_account_candidate(request) {
        Ok(()) => provider_onboarding_status_response(Some("polymarket"), None),
        Err(reason) => ProviderOnboardingStatusCommandResponse {
            command: "provider_onboarding_status",
            status: "blocked".to_string(),
            message: format!("Polymarket account candidate could not be applied: {reason}."),
            secret_free: true,
            providers: vec![provider_onboarding_provider_status(
                "polymarket",
                None,
                Some(reason),
            )],
        },
    }
}

#[tauri::command]
fn live_preflight_status(
    request: LivePreflightStatusRequest,
) -> LivePreflightStatusCommandResponse {
    live_preflight_status_response(&request)
}

#[tauri::command]
fn order_submit_live(request: LiveOrderSubmitRequest) -> LiveOrderCommandResponse {
    let evaluation = evaluate_live_gate_status(
        &request.provider_id,
        request.explicit_live_ack,
        request.audit_log_enabled,
        request.kill_switch_active,
    );
    let runtime = live_provider_runtime_for(&request.provider_id);

    order_submit_live_with_runtime(request, evaluation, &runtime)
}

#[tauri::command]
fn order_cancel(request: CancelOrderRequest) -> LiveOrderCommandResponse {
    let credential_ready = credential_source_ready_for(&request.provider_id);
    let runtime = live_provider_runtime_for(&request.provider_id);

    order_cancel_with_runtime(request, credential_ready, &runtime)
}

fn order_submit_live_with_runtime(
    request: LiveOrderSubmitRequest,
    evaluation: LiveGateEvaluation,
    runtime: &dyn LiveProviderRuntime,
) -> LiveOrderCommandResponse {
    order_submit_live_with_runtime_and_account_metrics_loader(
        request,
        evaluation,
        runtime,
        load_tauri_owned_account_metrics_for_request,
    )
}

fn order_submit_live_with_runtime_and_account_metrics_loader<F>(
    request: LiveOrderSubmitRequest,
    mut evaluation: LiveGateEvaluation,
    runtime: &dyn LiveProviderRuntime,
    load_account_metrics: F,
) -> LiveOrderCommandResponse
where
    F: Fn(&LiveOrderSubmitRequest) -> Result<TauriOwnedAccountMetrics, String>,
{
    let account_metrics = if evaluation.account_metrics_source_ready {
        match load_account_metrics(&request) {
            Ok(metrics) => Some(metrics),
            Err(reason) => {
                evaluation.reasons.push(reason);
                None
            }
        }
    } else {
        None
    };

    evaluation.reasons.extend(validate_live_order_request(
        &request,
        evaluation.local_approval_limits.as_ref(),
        account_metrics.as_ref(),
    ));
    evaluation.reasons.sort();
    evaluation.reasons.dedup();
    evaluation.ready = evaluation.reasons.is_empty();

    if !evaluation.ready {
        let provider_id = request.provider_id.clone();
        let message = live_order_blocked_message(&request, &evaluation.reasons);
        return LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "blocked".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: evaluation.reasons,
            provider_order_id: None,
            audit_event_type: Some("validation_failed".to_string()),
        };
    }

    live_place_response(
        request.provider_id.clone(),
        runtime.place_limit_order(&request),
    )
}

fn order_cancel_with_runtime(
    request: CancelOrderRequest,
    credential_ready: bool,
    runtime: &dyn LiveProviderRuntime,
) -> LiveOrderCommandResponse {
    let reasons = validate_cancel_order_request(&request, credential_ready);

    if !reasons.is_empty() {
        return LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id: request.provider_id,
            status: "blocked".to_string(),
            message: format!(
                "Live cancellation blocked before provider request: {}.",
                reasons.join(", ")
            ),
            secret_free: true,
            submitted_externally: false,
            reasons,
            provider_order_id: None,
            audit_event_type: Some("order_rejected".to_string()),
        };
    }

    live_cancel_response(
        request.provider_id.clone(),
        request.provider_order_id.clone(),
        runtime.cancel_order(&request),
    )
}

fn validate_cancel_order_request(
    request: &CancelOrderRequest,
    credential_ready: bool,
) -> Vec<String> {
    let mut reasons = Vec::new();

    if !is_supported_provider(&request.provider_id) {
        reasons.push("provider_not_supported".to_string());
    }

    if request.provider_order_id.trim().is_empty() {
        reasons.push("provider_order_id_missing".to_string());
    }

    if request
        .market_id
        .as_deref()
        .is_some_and(|market_id| market_id.trim().is_empty())
    {
        reasons.push("market_id_invalid".to_string());
    }

    if !credential_ready {
        reasons.push("credential_source_missing".to_string());
    }

    reasons.sort();
    reasons.dedup();
    reasons
}

fn live_place_response(
    provider_id: String,
    result: LiveProviderRuntimeResult,
) -> LiveOrderCommandResponse {
    match result {
        LiveProviderRuntimeResult::Submitted { provider_order_id } => LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "submitted".to_string(),
            message: "Live limit order was accepted by the provider runtime.".to_string(),
            secret_free: true,
            submitted_externally: true,
            reasons: Vec::new(),
            provider_order_id: Some(provider_order_id),
            audit_event_type: Some("order_submitted".to_string()),
        },
        LiveProviderRuntimeResult::Rejected { reason, message } => LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "rejected".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec![reason],
            provider_order_id: None,
            audit_event_type: Some("order_rejected".to_string()),
        },
        LiveProviderRuntimeResult::NetworkError { message } => LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "failed".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec!["network_error".to_string()],
            provider_order_id: None,
            audit_event_type: Some("error_occurred".to_string()),
        },
        LiveProviderRuntimeResult::Unavailable { reason, message } => LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "blocked".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec![reason],
            provider_order_id: None,
            audit_event_type: Some("order_rejected".to_string()),
        },
        LiveProviderRuntimeResult::Cancelled { provider_order_id } => LiveOrderCommandResponse {
            command: "order_submit_live",
            provider_id,
            status: "failed".to_string(),
            message: "Provider runtime returned a cancel result for a live order submission."
                .to_string(),
            secret_free: true,
            submitted_externally: false,
            reasons: vec!["provider_protocol_error".to_string()],
            provider_order_id: Some(provider_order_id),
            audit_event_type: Some("error_occurred".to_string()),
        },
    }
}

fn live_cancel_response(
    provider_id: String,
    requested_order_id: String,
    result: LiveProviderRuntimeResult,
) -> LiveOrderCommandResponse {
    match result {
        LiveProviderRuntimeResult::Cancelled { provider_order_id } => LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id,
            status: "cancelled".to_string(),
            message: "Live cancellation was accepted by the provider runtime.".to_string(),
            secret_free: true,
            submitted_externally: true,
            reasons: Vec::new(),
            provider_order_id: Some(provider_order_id),
            audit_event_type: Some("order_cancelled".to_string()),
        },
        LiveProviderRuntimeResult::Rejected { reason, message } => LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id,
            status: "rejected".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec![reason],
            provider_order_id: Some(requested_order_id),
            audit_event_type: Some("order_rejected".to_string()),
        },
        LiveProviderRuntimeResult::NetworkError { message } => LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id,
            status: "failed".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec!["network_error".to_string()],
            provider_order_id: Some(requested_order_id),
            audit_event_type: Some("error_occurred".to_string()),
        },
        LiveProviderRuntimeResult::Unavailable { reason, message } => LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id,
            status: "blocked".to_string(),
            message,
            secret_free: true,
            submitted_externally: false,
            reasons: vec![reason],
            provider_order_id: Some(requested_order_id),
            audit_event_type: Some("order_rejected".to_string()),
        },
        LiveProviderRuntimeResult::Submitted { provider_order_id } => LiveOrderCommandResponse {
            command: "order_cancel",
            provider_id,
            status: "failed".to_string(),
            message: "Provider runtime returned a submit result for a live cancellation."
                .to_string(),
            secret_free: true,
            submitted_externally: false,
            reasons: vec!["provider_protocol_error".to_string()],
            provider_order_id: Some(provider_order_id),
            audit_event_type: Some("error_occurred".to_string()),
        },
    }
}

#[tauri::command]
async fn market_search(request: MarketSearchRequest) -> MarketSearchCommandResponse {
    let Some(provider_ids) = provider_scope(request.provider_id.as_deref()) else {
        return unsupported_search_response(request);
    };
    let normalized_query = request.query.trim().to_string();

    let client = http_client();
    let mut markets = Vec::new();
    let mut provider_states = Vec::new();
    let limit = normalize_limit(request.limit);
    let offset = normalize_offset(request.offset);
    let cursors = request.cursor_by_provider.clone().unwrap_or_default();

    for provider_id in &provider_ids {
        let provider_result = match *provider_id {
            "polymarket" => {
                search_polymarket_markets(&client, &normalized_query, limit, offset).await
            }
            "kalshi" => {
                search_kalshi_markets(
                    &client,
                    &normalized_query,
                    limit,
                    cursors.get("kalshi").map(String::as_str),
                )
                .await
            }
            _ => unreachable!("provider scope is normalized"),
        };

        match provider_result {
            Ok(result) => {
                markets.extend(result.markets);
                provider_states.push(result.state);
            }
            Err(error) => provider_states.push(failure_state(provider_id, error)),
        }
    }

    let status = aggregate_status(&markets, &provider_states);
    let freshness = if status == "connected" {
        "fresh"
    } else {
        "disconnected"
    };
    let message = market_search_message(&markets, &provider_states, status);
    let has_more = provider_states.iter().any(|state| state.has_more);
    let next_cursor_by_provider = collect_next_cursors(&provider_states);
    let next_offset = if has_more {
        Some(offset.saturating_add(limit as u32))
    } else {
        None
    };

    MarketSearchCommandResponse {
        command: "market_search",
        provider_id: request.provider_id,
        status: status.to_string(),
        freshness: freshness.to_string(),
        connection_mode: "polling_fallback".to_string(),
        message,
        secret_free: true,
        markets,
        provider_states,
        provider_ids: provider_ids
            .iter()
            .map(|provider| provider.to_string())
            .collect(),
        has_more,
        next_offset,
        next_cursor_by_provider,
        captured_at: Some(now_iso()),
        error_reason: if status == "connected" {
            None
        } else {
            Some("provider_status_unknown".to_string())
        },
    }
}

#[tauri::command]
async fn market_get_order_book(
    request: MarketGetOrderBookRequest,
) -> MarketGetOrderBookCommandResponse {
    let client = http_client();

    match request.provider_id.as_str() {
        "polymarket" => match load_polymarket_order_book(&client, &request).await {
            Ok(order_book) => order_book_response(request, order_book),
            Err(error) => order_book_error_response(request, error),
        },
        "kalshi" => match load_kalshi_order_book(&client, &request).await {
            Ok(order_book) => order_book_response(request, order_book),
            Err(error) => order_book_error_response(request, error),
        },
        _ => order_book_error_response(
            request,
            ProviderFailure {
                status: "blocked",
                freshness: "disconnected",
                error_reason: "provider_not_supported",
                message: "Unsupported provider requested for order-book command.".to_string(),
            },
        ),
    }
}

#[tauri::command]
fn market_subscribe(request: MarketSubscribeRequest) -> MarketSubscribeCommandResponse {
    match request.provider_id.as_str() {
        "kalshi" => MarketSubscribeCommandResponse {
            command: "market_subscribe",
            provider_id: request.provider_id,
            market_id: request.market_id,
            outcome_id: request.outcome_id,
            status: "credentials-required".to_string(),
            freshness: "disconnected".to_string(),
            connection_mode: "streaming".to_string(),
            message:
                "Kalshi WebSocket streaming requires authenticated handshake headers from a local credential provider."
                    .to_string(),
            secret_free: true,
            error_reason: Some("provider_credentials_required".to_string()),
        },
        "polymarket" => MarketSubscribeCommandResponse {
            command: "market_subscribe",
            provider_id: request.provider_id,
            market_id: request.market_id,
            outcome_id: request.outcome_id,
            status: "unavailable".to_string(),
            freshness: "disconnected".to_string(),
            connection_mode: "streaming".to_string(),
            message:
                "Polymarket public WebSocket normalization exists, but no safe persistent Tauri WebSocket transport is configured in this command path; REST snapshot is the documented fallback."
                    .to_string(),
            secret_free: true,
            error_reason: Some("not_implemented".to_string()),
        },
        _ => MarketSubscribeCommandResponse {
            command: "market_subscribe",
            provider_id: request.provider_id,
            market_id: request.market_id,
            outcome_id: request.outcome_id,
            status: "blocked".to_string(),
            freshness: "disconnected".to_string(),
            connection_mode: "streaming".to_string(),
            message: "Unsupported provider requested for subscription command.".to_string(),
            secret_free: true,
            error_reason: Some("provider_not_supported".to_string()),
        },
    }
}

async fn search_polymarket_markets(
    _client: &HttpClient,
    query: &str,
    limit: usize,
    offset: u32,
) -> Result<ProviderSearchResult, ProviderFailure> {
    let normalized_query = query.trim().to_lowercase();
    let mut market_values = if normalized_query.is_empty() {
        list_polymarket_market_values(limit, offset).await?
    } else {
        search_polymarket_market_values(query, limit, offset).await?
    };

    if !normalized_query.is_empty() && market_values.is_empty() {
        market_values = list_polymarket_market_values(expanded_search_limit(limit), offset).await?;
    }

    let has_more = market_values.len() >= limit;
    let markets = market_values
        .iter()
        .filter_map(normalize_polymarket_market)
        .filter(|market| matches_query(market, &normalized_query))
        .take(limit)
        .collect::<Vec<_>>();

    Ok(ProviderSearchResult {
        state: VenueCommandState {
            provider_id: "polymarket".to_string(),
            status: "connected".to_string(),
            freshness: "fresh".to_string(),
            connection_mode: "polling_fallback".to_string(),
            message: format!(
                "Polymarket official Rust SDK returned {} read-only markets.",
                markets.len()
            ),
            error_reason: None,
            has_more,
            next_cursor: None,
        },
        markets,
    })
}

async fn search_kalshi_markets(
    client: &HttpClient,
    query: &str,
    limit: usize,
    cursor: Option<&str>,
) -> Result<ProviderSearchResult, ProviderFailure> {
    let normalized_query = query.trim().to_lowercase();
    let mut page_cursor = normalize_cursor(cursor);
    let mut markets = Vec::new();
    let mut next_cursor = None;
    let mut pages_scanned = 0usize;
    let mut raw_markets_scanned = 0usize;

    if let Some(ticker_filter) =
        kalshi_direct_ticker_filter(query).filter(|_| page_cursor.is_none())
    {
        let (market_values, page_next_cursor) =
            load_kalshi_market_page(client, limit, None, Some(&ticker_filter)).await?;
        pages_scanned = pages_scanned.saturating_add(1);
        raw_markets_scanned = raw_markets_scanned.saturating_add(market_values.len());
        next_cursor = page_next_cursor;
        append_matching_kalshi_markets(&mut markets, &market_values, &normalized_query, limit);

        if markets.is_empty() {
            next_cursor = None;
            pages_scanned = 0;
            raw_markets_scanned = 0;
        }
    }

    if markets.is_empty() {
        let page_budget = kalshi_query_scan_page_budget(&normalized_query);

        for _ in 0..page_budget {
            let (market_values, page_next_cursor) =
                load_kalshi_market_page(client, limit, page_cursor.as_deref(), None).await?;
            pages_scanned = pages_scanned.saturating_add(1);
            raw_markets_scanned = raw_markets_scanned.saturating_add(market_values.len());
            next_cursor = page_next_cursor;
            append_matching_kalshi_markets(&mut markets, &market_values, &normalized_query, limit);

            if markets.len() >= limit || next_cursor.is_none() || normalized_query.is_empty() {
                break;
            }

            page_cursor = next_cursor.clone();
        }
    }

    let has_more = next_cursor.is_some();
    let message = if normalized_query.is_empty() {
        format!(
            "Kalshi public REST browse returned {} markets.",
            markets.len()
        )
    } else {
        format!(
            "Kalshi public REST discovery scanned {} markets across {} bounded cursor page(s) and returned {} matches.",
            raw_markets_scanned,
            pages_scanned,
            markets.len()
        )
    };

    Ok(ProviderSearchResult {
        state: VenueCommandState {
            provider_id: "kalshi".to_string(),
            status: "connected".to_string(),
            freshness: "fresh".to_string(),
            connection_mode: "polling_fallback".to_string(),
            message,
            error_reason: None,
            has_more,
            next_cursor,
        },
        markets,
    })
}

async fn list_polymarket_market_values(
    limit: usize,
    offset: u32,
) -> Result<Vec<Value>, ProviderFailure> {
    let client = PolymarketGammaClient::default();
    let request = MarketsRequest::builder()
        .closed(false)
        .limit(limit as i32)
        .offset(offset.min(i32::MAX as u32) as i32)
        .build();
    let markets = with_provider_timeout(client.markets(&request), "polymarket").await?;

    markets
        .iter()
        .map(|market| serialize_provider_value("polymarket", market))
        .collect()
}

async fn search_polymarket_market_values(
    query: &str,
    limit: usize,
    offset: u32,
) -> Result<Vec<Value>, ProviderFailure> {
    let client = PolymarketGammaClient::default();
    let page = (offset / limit.max(1) as u32).saturating_add(1);
    let request = SearchRequest::builder()
        .q(query)
        .limit_per_type(limit as i32)
        .page(page.min(i32::MAX as u32) as i32)
        .keep_closed_markets(0)
        .search_profiles(false)
        .search_tags(false)
        .build();
    let search = with_provider_timeout(client.search(&request), "polymarket").await?;
    let payload = serialize_provider_value("polymarket", &search)?;

    Ok(extract_polymarket_search_market_values(&payload))
}

async fn load_polymarket_market_value(market_id: &str) -> Result<Value, ProviderFailure> {
    let client = PolymarketGammaClient::default();
    let request = MarketByIdRequest::builder().id(market_id).build();
    let market = with_provider_timeout(client.market_by_id(&request), "polymarket").await?;

    serialize_provider_value("polymarket", &market)
}

async fn load_polymarket_order_book_value(token_id: &str) -> Result<Value, ProviderFailure> {
    let token_id = U256::from_str(token_id).map_err(|error| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: format!("Polymarket outcome token id could not be parsed: {error}."),
    })?;
    let mut last_error: Option<ProviderFailure> = None;

    for host in [POLYMARKET_CLOB_BASE_URL, POLYMARKET_CLOB_V2_BASE_URL] {
        let client = match PolymarketClobClient::new(host, PolymarketClobConfig::default()) {
            Ok(client) => client,
            Err(error) => {
                last_error = Some(provider_error("polymarket", error.to_string()));
                continue;
            }
        };
        let request = OrderBookSummaryRequest::builder()
            .token_id(token_id)
            .build();

        match with_provider_timeout(client.order_book(&request), "polymarket").await {
            Ok(order_book) => return serialize_provider_value("polymarket", &order_book),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.unwrap_or_else(|| ProviderFailure {
        status: "provider-error",
        freshness: "disconnected",
        error_reason: "provider_status_unknown",
        message: "Polymarket CLOB SDK could not construct an order-book client.".to_string(),
    }))
}

async fn load_polymarket_order_book(
    _client: &HttpClient,
    request: &MarketGetOrderBookRequest,
) -> Result<RendererOrderBookSnapshot, ProviderFailure> {
    let market_payload = load_polymarket_market_value(&request.market_id).await?;
    let market = normalize_polymarket_market(&market_payload).ok_or_else(|| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: "Polymarket market response did not include usable identifiers.".to_string(),
    })?;
    let selected_outcome = market
        .outcomes
        .iter()
        .find(|outcome| {
            outcome.outcome_id.eq_ignore_ascii_case(&request.outcome_id)
                || outcome.label.eq_ignore_ascii_case(&request.outcome_id)
        })
        .ok_or_else(|| ProviderFailure {
            status: "unavailable",
            freshness: "disconnected",
            error_reason: "outcome_not_found",
            message: "Polymarket outcome token was not present in market metadata.".to_string(),
        })?;

    let book_payload = load_polymarket_order_book_value(&selected_outcome.outcome_id).await?;
    let tick_size = read_string(
        &book_payload,
        &["tick_size", "tickSize", "minimum_tick_size"],
    )
    .filter(|value| is_positive_decimal(value))
    .ok_or_else(|| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_tick_size",
        message: "Polymarket order book did not include a valid tick size.".to_string(),
    })?;
    let min_order_size = read_string(&book_payload, &["min_order_size", "minOrderSize"])
        .filter(|value| is_positive_decimal(value));
    let captured_at = read_value(&book_payload, "timestamp")
        .and_then(parse_provider_timestamp)
        .ok_or_else(|| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Polymarket order book did not include a valid timestamp.".to_string(),
        })?;
    let bids =
        parse_object_levels(read_value(&book_payload, "bids")).ok_or_else(|| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Polymarket order book did not include valid bid levels.".to_string(),
        })?;
    let asks =
        parse_object_levels(read_value(&book_payload, "asks")).ok_or_else(|| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Polymarket order book did not include valid ask levels.".to_string(),
        })?;

    create_snapshot(
        "polymarket",
        &market.market_id,
        &selected_outcome.outcome_id,
        "USDC",
        &tick_size,
        min_order_size,
        captured_at,
        bids,
        asks,
    )
}

async fn load_kalshi_order_book(
    client: &HttpClient,
    request: &MarketGetOrderBookRequest,
) -> Result<RendererOrderBookSnapshot, ProviderFailure> {
    let selected_side =
        normalize_kalshi_side(&request.outcome_id).ok_or_else(|| ProviderFailure {
            status: "unavailable",
            freshness: "disconnected",
            error_reason: "outcome_not_found",
            message: "Kalshi order-book selection requires outcomeId yes or no.".to_string(),
        })?;
    let mut market_url = parse_kalshi_url("/markets")?;
    market_url
        .query_pairs_mut()
        .append_pair("tickers", &request.market_id)
        .append_pair("limit", "1")
        .append_pair("status", "open");
    let market_payload = load_kalshi_provider_json(client, market_url).await?;
    let market_value = extract_kalshi_markets(&market_payload)?
        .into_iter()
        .find(|market| {
            read_string(market, &["ticker"]).as_deref() == Some(request.market_id.as_str())
        })
        .ok_or_else(|| ProviderFailure {
            status: "unavailable",
            freshness: "disconnected",
            error_reason: "market_not_found",
            message: "Kalshi market ticker was not returned by the official markets endpoint."
                .to_string(),
        })?;
    let tick_size = resolve_kalshi_tick_size(market_value).ok_or_else(|| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_tick_size",
        message: "Kalshi market response did not include a valid tick size.".to_string(),
    })?;
    let book_url = format!(
        "/markets/{}/orderbook",
        encode_path_segment(&request.market_id)
    );
    let book_payload = load_kalshi_provider_json(client, parse_kalshi_url(&book_url)?).await?;
    let orderbook = read_value(&book_payload, "orderbook_fp").ok_or_else(|| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: "Kalshi order-book response did not include orderbook_fp.".to_string(),
    })?;
    let yes_bids = parse_tuple_levels(read_value(orderbook, "yes_dollars")).ok_or_else(|| {
        ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Kalshi orderbook_fp did not include valid yes_dollars.".to_string(),
        }
    })?;
    let no_bids =
        parse_tuple_levels(read_value(orderbook, "no_dollars")).ok_or_else(|| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Kalshi orderbook_fp did not include valid no_dollars.".to_string(),
        })?;
    let (bids, opposite_bids) = if selected_side == "yes" {
        (yes_bids, no_bids)
    } else {
        (no_bids, yes_bids)
    };
    let asks = create_kalshi_implied_asks(opposite_bids)?;

    create_snapshot(
        "kalshi",
        &request.market_id,
        selected_side,
        "USD",
        &tick_size,
        None,
        now_iso(),
        bids,
        asks,
    )
}

fn create_snapshot(
    provider_id: &str,
    market_id: &str,
    outcome_id: &str,
    currency: &str,
    tick_size: &str,
    min_order_size: Option<String>,
    captured_at: String,
    mut bids: Vec<OrderBookLevel>,
    mut asks: Vec<OrderBookLevel>,
) -> Result<RendererOrderBookSnapshot, ProviderFailure> {
    if bids.is_empty() && asks.is_empty() {
        return Err(ProviderFailure {
            status: "unavailable",
            freshness: "disconnected",
            error_reason: "empty_liquidity",
            message: "Provider order book returned no visible liquidity.".to_string(),
        });
    }

    bids.sort_by(|left, right| compare_decimal_desc(&left.price, &right.price));
    asks.sort_by(|left, right| compare_decimal_asc(&left.price, &right.price));

    let freshness = if is_stale(&captured_at) {
        "stale"
    } else {
        "fresh"
    };

    Ok(RendererOrderBookSnapshot {
        market_ref: RendererTradableMarketRef {
            provider_id: provider_id.to_string(),
            market_id: market_id.to_string(),
            outcome_id: outcome_id.to_string(),
            currency: currency.to_string(),
            tick_size: tick_size.to_string(),
            market_status: "open".to_string(),
            freshness: "fresh".to_string(),
        },
        captured_at,
        bids,
        asks,
        tick_size: tick_size.to_string(),
        min_order_size,
        freshness: freshness.to_string(),
        connection_mode: "snapshot".to_string(),
    })
}

fn order_book_response(
    request: MarketGetOrderBookRequest,
    order_book: RendererOrderBookSnapshot,
) -> MarketGetOrderBookCommandResponse {
    let status = if order_book.freshness == "fresh" {
        "connected"
    } else {
        "stale"
    };

    MarketGetOrderBookCommandResponse {
        command: "market_get_order_book",
        provider_id: request.provider_id,
        market_id: request.market_id,
        outcome_id: request.outcome_id,
        status: status.to_string(),
        freshness: order_book.freshness.clone(),
        connection_mode: "snapshot".to_string(),
        message: "Normalized official provider snapshot loaded through Tauri.".to_string(),
        secret_free: true,
        source_kind: Some("official_live".to_string()),
        order_book: Some(order_book),
        error_reason: None,
    }
}

fn order_book_error_response(
    request: MarketGetOrderBookRequest,
    error: ProviderFailure,
) -> MarketGetOrderBookCommandResponse {
    MarketGetOrderBookCommandResponse {
        command: "market_get_order_book",
        provider_id: request.provider_id,
        market_id: request.market_id,
        outcome_id: request.outcome_id,
        status: error.status.to_string(),
        freshness: error.freshness.to_string(),
        connection_mode: "snapshot".to_string(),
        message: error.message,
        secret_free: true,
        source_kind: None,
        order_book: None,
        error_reason: Some(error.error_reason.to_string()),
    }
}

async fn load_provider_json(client: &HttpClient, url: Url) -> Result<Value, ProviderFailure> {
    let response = client
        .get(url.clone())
        .send()
        .await
        .map_err(|error| transport_failure(&url, error.to_string()))?;
    let status = response.status();

    if status.is_success() {
        return response
            .json::<Value>()
            .await
            .map_err(|error| ProviderFailure {
                status: "invalid",
                freshness: "invalid",
                error_reason: "invalid_payload",
                message: format!("Provider response was not valid JSON: {error}."),
            });
    }

    Err(http_failure(status.as_u16(), url.as_str()))
}

async fn load_kalshi_provider_json(
    client: &HttpClient,
    preferred_url: Url,
) -> Result<Value, ProviderFailure> {
    let path = kalshi_endpoint_path(preferred_url.path());
    let query = preferred_url.query().map(str::to_string);
    let mut last_error: Option<ProviderFailure> = None;

    for base_url in KALSHI_BASE_URLS {
        let mut url = Url::parse(&format!("{base_url}{path}"))
            .map_err(|error| provider_error("kalshi", error.to_string()))?;

        if let Some(query) = &query {
            url.set_query(Some(query));
        }

        match load_provider_json(client, url).await {
            Ok(value) => return Ok(value),
            Err(error) => last_error = Some(error),
        }
    }

    Err(last_error.unwrap_or_else(|| ProviderFailure {
        status: "provider-error",
        freshness: "disconnected",
        error_reason: "provider_status_unknown",
        message: "Kalshi provider request could not be built for any documented host.".to_string(),
    }))
}

async fn load_kalshi_market_page(
    client: &HttpClient,
    limit: usize,
    cursor: Option<&str>,
    ticker_filter: Option<&str>,
) -> Result<(Vec<Value>, Option<String>), ProviderFailure> {
    let url = build_kalshi_markets_url(limit, cursor, ticker_filter)?;
    let payload = load_kalshi_provider_json(client, url).await?;
    let market_values = extract_kalshi_markets(&payload)?.clone();
    let next_cursor = extract_kalshi_cursor(&payload);

    Ok((market_values, next_cursor))
}

async fn with_provider_timeout<T, E, F>(
    future: F,
    provider_id: &'static str,
) -> Result<T, ProviderFailure>
where
    E: std::fmt::Display,
    F: Future<Output = Result<T, E>>,
{
    match timeout(PROVIDER_REQUEST_TIMEOUT, future).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(error)) => Err(provider_error(provider_id, error.to_string())),
        Err(_) => Err(ProviderFailure {
            status: "disconnected",
            freshness: "disconnected",
            error_reason: "network_error",
            message: format!(
                "{provider_id} provider request timed out after {} seconds.",
                PROVIDER_REQUEST_TIMEOUT.as_secs()
            ),
        }),
    }
}

fn serialize_provider_value<T: Serialize>(
    provider_id: &'static str,
    value: &T,
) -> Result<Value, ProviderFailure> {
    serde_json::to_value(value).map_err(|error| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: format!("{provider_id} SDK response could not be serialized: {error}."),
    })
}

fn extract_polymarket_search_market_values(payload: &Value) -> Vec<Value> {
    let mut markets = Vec::new();

    if let Some(values) = payload.get("markets").and_then(Value::as_array) {
        markets.extend(values.iter().cloned());
    }

    if let Some(events) = payload.get("events").and_then(Value::as_array) {
        for event in events {
            if let Some(values) = event.get("markets").and_then(Value::as_array) {
                markets.extend(values.iter().cloned());
            }
        }
    }

    markets
}

fn http_failure(status: u16, url: &str) -> ProviderFailure {
    if status == 401 || status == 403 {
        return ProviderFailure {
            status: "credentials-required",
            freshness: "disconnected",
            error_reason: "provider_credentials_required",
            message: format!(
                "Provider returned authentication or authorization status {status} for read-only endpoint {url}."
            ),
        };
    }

    if status == 404 {
        return ProviderFailure {
            status: "unavailable",
            freshness: "disconnected",
            error_reason: "market_not_found",
            message: format!("Provider endpoint returned 404 for {url}."),
        };
    }

    if status >= 500 {
        return ProviderFailure {
            status: "provider-error",
            freshness: "disconnected",
            error_reason: "provider_status_unknown",
            message: format!("Provider returned server status {status} for {url}."),
        };
    }

    ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: format!("Provider returned unexpected status {status} for {url}."),
    }
}

fn transport_failure(url: &Url, error: String) -> ProviderFailure {
    let host = url.host_str().unwrap_or_default();
    let lower_error = error.to_ascii_lowercase();

    if is_kalshi_host(host)
        && (lower_error.contains("certificate")
            || lower_error.contains("cert")
            || lower_error.contains("tls")
            || lower_error.contains("notvalidforname")
            || lower_error.contains("wrong principal"))
    {
        return ProviderFailure {
            status: "disconnected",
            freshness: "disconnected",
            error_reason: "network_error",
            message: format!(
                "Kalshi provider TLS/certificate validation failed before a response for {url}. This usually means local DNS, proxy, or network filtering resolved the official Kalshi host to a server with a certificate for another name. Do not disable TLS; check DNS/proxy/network filtering and retry. Raw transport error: {error}."
            ),
        };
    }

    ProviderFailure {
        status: "disconnected",
        freshness: "disconnected",
        error_reason: "network_error",
        message: format!("Provider request failed before a response: {error}."),
    }
}

fn is_kalshi_host(host: &str) -> bool {
    matches!(host, "external-api.kalshi.com" | "api.elections.kalshi.com")
}

fn normalize_polymarket_market(value: &Value) -> Option<RendererMarketSearchResult> {
    let market_id = read_string(value, &["id", "market", "conditionId", "condition_id"])?;
    let title = read_string(value, &["question", "title", "slug"]).unwrap_or(market_id.clone());
    let active = read_bool(value, "active").unwrap_or(false);
    let closed = read_bool(value, "closed").unwrap_or(false);
    let archived = read_bool(value, "archived").unwrap_or(false);
    let order_book_enabled = read_bool(value, "enableOrderBook").unwrap_or(true);
    let status = if active && !closed && !archived && order_book_enabled {
        "open"
    } else if closed {
        "closed"
    } else if archived {
        "archived"
    } else {
        "unknown"
    };
    let labels = parse_string_array(read_value(value, "outcomes"))?;
    let token_ids = parse_string_array(
        read_value(value, "clobTokenIds").or_else(|| read_value(value, "tokenIds")),
    )?;

    if labels.len() != token_ids.len() || labels.is_empty() {
        return None;
    }

    let outcomes = labels
        .iter()
        .zip(token_ids.iter())
        .map(|(label, token_id)| RendererOutcomeView {
            provider_id: "polymarket".to_string(),
            market_id: market_id.clone(),
            outcome_id: token_id.clone(),
            label: label.clone(),
            status: if status == "open" {
                "tradable"
            } else {
                "unknown"
            }
            .to_string(),
        })
        .collect::<Vec<_>>();

    Some(RendererMarketSearchResult {
        provider_id: "polymarket".to_string(),
        market_id,
        title,
        status: status.to_string(),
        outcomes,
        volume: read_string(value, &["volume", "volumeNum"]),
        liquidity: read_string(value, &["liquidity", "liquidityNum"]),
    })
}

fn normalize_kalshi_market(value: &Value) -> Option<RendererMarketSearchResult> {
    let market_id = read_string(value, &["ticker"])?;
    let title = read_string(value, &["title", "subtitle", "ticker"]).unwrap_or(market_id.clone());
    let status = match read_string(value, &["status"]).as_deref() {
        Some("open") => "open",
        Some("closed") => "closed",
        Some("settled") => "resolved",
        Some("unopened") | Some("paused") => "inactive",
        _ => "unknown",
    };
    let yes_label = read_string(value, &["yes_sub_title"]).unwrap_or("Yes".to_string());
    let no_label = read_string(value, &["no_sub_title"]).unwrap_or("No".to_string());
    let outcomes = vec![
        RendererOutcomeView {
            provider_id: "kalshi".to_string(),
            market_id: market_id.clone(),
            outcome_id: "yes".to_string(),
            label: yes_label,
            status: if status == "open" {
                "tradable"
            } else {
                "unknown"
            }
            .to_string(),
        },
        RendererOutcomeView {
            provider_id: "kalshi".to_string(),
            market_id: market_id.clone(),
            outcome_id: "no".to_string(),
            label: no_label,
            status: if status == "open" {
                "tradable"
            } else {
                "unknown"
            }
            .to_string(),
        },
    ];

    Some(RendererMarketSearchResult {
        provider_id: "kalshi".to_string(),
        market_id,
        title,
        status: status.to_string(),
        outcomes,
        volume: read_string(value, &["volume_fp", "volume", "volume_24h_fp"]),
        liquidity: read_string(value, &["liquidity_dollars", "liquidity"]),
    })
}

fn extract_kalshi_markets(payload: &Value) -> Result<&Vec<Value>, ProviderFailure> {
    payload
        .get("markets")
        .and_then(Value::as_array)
        .ok_or_else(|| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Kalshi market response did not include a markets array.".to_string(),
        })
}

fn extract_kalshi_cursor(payload: &Value) -> Option<String> {
    read_string(payload, &["cursor"]).filter(|cursor| !cursor.trim().is_empty())
}

fn parse_object_levels(value: Option<&Value>) -> Option<Vec<OrderBookLevel>> {
    let levels = value?.as_array()?;
    let mut parsed = Vec::new();

    for level in levels {
        let price = read_string(level, &["price"])?;
        let size = read_string(level, &["size"])?;

        if !is_positive_decimal(&price) || !is_positive_decimal(&size) {
            return None;
        }

        parsed.push(OrderBookLevel { price, size });
    }

    Some(parsed)
}

fn parse_tuple_levels(value: Option<&Value>) -> Option<Vec<OrderBookLevel>> {
    let levels = value?.as_array()?;
    let mut parsed = Vec::new();

    for level in levels {
        let tuple = level.as_array()?;
        let price = value_to_string(tuple.first()?)?;
        let size = value_to_string(tuple.get(1)?)?;

        if !is_positive_decimal(&price) || !is_positive_decimal(&size) {
            return None;
        }

        parsed.push(OrderBookLevel { price, size });
    }

    Some(parsed)
}

fn create_kalshi_implied_asks(
    bids: Vec<OrderBookLevel>,
) -> Result<Vec<OrderBookLevel>, ProviderFailure> {
    let mut asks = Vec::new();

    for bid in bids {
        let price = bid.price.parse::<f64>().map_err(|_| ProviderFailure {
            status: "invalid",
            freshness: "invalid",
            error_reason: "invalid_payload",
            message: "Kalshi opposite-side bid price was invalid.".to_string(),
        })?;

        if price <= 0.0 || price >= 1.0 {
            return Err(ProviderFailure {
                status: "invalid",
                freshness: "invalid",
                error_reason: "invalid_payload",
                message: "Kalshi opposite-side bid price could not imply a valid ask.".to_string(),
            });
        }

        asks.push(OrderBookLevel {
            price: trim_decimal(1.0 - price),
            size: bid.size,
        });
    }

    Ok(asks)
}

fn resolve_kalshi_tick_size(value: &Value) -> Option<String> {
    if let Some(tick) = read_string(
        value,
        &["tick_size", "tick_size_dollars", "minimum_tick_size"],
    )
    .filter(|candidate| is_positive_decimal(candidate))
    {
        return Some(tick);
    }

    let ranges = read_value(value, "price_ranges")?.as_array()?;

    for range in ranges {
        if let Some(step) =
            read_string(range, &["step"]).filter(|candidate| is_positive_decimal(candidate))
        {
            return Some(step);
        }
    }

    None
}

fn failure_state(provider_id: &str, error: ProviderFailure) -> VenueCommandState {
    VenueCommandState {
        provider_id: provider_id.to_string(),
        status: error.status.to_string(),
        freshness: error.freshness.to_string(),
        connection_mode: "polling_fallback".to_string(),
        message: error.message,
        error_reason: Some(error.error_reason.to_string()),
        has_more: false,
        next_cursor: None,
    }
}

fn unsupported_search_response(request: MarketSearchRequest) -> MarketSearchCommandResponse {
    MarketSearchCommandResponse {
        command: "market_search",
        provider_id: request.provider_id,
        status: "blocked".to_string(),
        freshness: "disconnected".to_string(),
        connection_mode: "polling_fallback".to_string(),
        message: "Unsupported provider requested for market search.".to_string(),
        secret_free: true,
        markets: Vec::new(),
        provider_states: Vec::new(),
        provider_ids: Vec::new(),
        has_more: false,
        next_offset: None,
        next_cursor_by_provider: None,
        captured_at: Some(now_iso()),
        error_reason: Some("provider_not_supported".to_string()),
    }
}

fn aggregate_status(
    markets: &[RendererMarketSearchResult],
    provider_states: &[VenueCommandState],
) -> &'static str {
    if !markets.is_empty() {
        return "connected";
    }

    if provider_states
        .iter()
        .any(|state| state.status == "connected")
    {
        return "connected";
    }

    if provider_states
        .iter()
        .any(|state| state.status == "credentials-required")
    {
        return "credentials-required";
    }

    if provider_states
        .iter()
        .any(|state| state.status == "provider-error")
    {
        return "provider-error";
    }

    if provider_states
        .iter()
        .any(|state| state.status == "invalid")
    {
        return "invalid";
    }

    "unavailable"
}

fn market_search_message(
    markets: &[RendererMarketSearchResult],
    provider_states: &[VenueCommandState],
    status: &str,
) -> String {
    if markets.is_empty() {
        if status == "connected" {
            return "No matching provider-backed markets were returned for this query/filter."
                .to_string();
        }

        return "No real provider markets were returned. Provider states show the exact blocker."
            .to_string();
    }

    let connected_count = provider_states
        .iter()
        .filter(|state| state.status == "connected")
        .count();
    let blocked_states = provider_states
        .iter()
        .filter(|state| state.status != "connected")
        .map(|state| format!("{} {}", state.provider_id, state.status))
        .collect::<Vec<_>>();
    let market_word = if markets.len() == 1 {
        "market"
    } else {
        "markets"
    };

    if blocked_states.is_empty() {
        return format!(
            "Unified read-only search returned {} provider-backed {} from {}/{} connected venues.",
            markets.len(),
            market_word,
            connected_count,
            provider_states.len()
        );
    }

    format!(
        "Unified read-only search returned {} provider-backed {} from {}/{} connected venues; blocked venues: {}.",
        markets.len(),
        market_word,
        connected_count,
        provider_states.len(),
        blocked_states.join(", ")
    )
}

fn matches_query(market: &RendererMarketSearchResult, query: &str) -> bool {
    query.is_empty()
        || market.market_id.to_lowercase().contains(query)
        || market.title.to_lowercase().contains(query)
        || market
            .outcomes
            .iter()
            .any(|outcome| outcome.label.to_lowercase().contains(query))
}

fn provider_scope(provider_id: Option<&str>) -> Option<Vec<&'static str>> {
    match provider_id {
        None => Some(vec!["polymarket", "kalshi"]),
        Some("polymarket") => Some(vec!["polymarket"]),
        Some("kalshi") => Some(vec!["kalshi"]),
        Some(_) => None,
    }
}

fn normalize_limit(limit: Option<u16>) -> usize {
    limit.unwrap_or(50).clamp(1, 100) as usize
}

fn normalize_offset(offset: Option<u32>) -> u32 {
    offset.unwrap_or(0)
}

fn expanded_search_limit(limit: usize) -> usize {
    limit.saturating_mul(5).clamp(limit, 100)
}

fn http_client() -> HttpClient {
    HttpClient::builder()
        .user_agent("Prediction Ladder read-only desktop runtime")
        .timeout(PROVIDER_REQUEST_TIMEOUT)
        .build()
        .expect("reqwest client should build")
}

fn parse_kalshi_url(path: &str) -> Result<Url, ProviderFailure> {
    Url::parse(&format!("{}{path}", KALSHI_BASE_URLS[0])).map_err(|error| ProviderFailure {
        status: "invalid",
        freshness: "invalid",
        error_reason: "invalid_payload",
        message: format!("Kalshi provider URL could not be constructed: {error}."),
    })
}

fn normalize_kalshi_trade_api_base_url(base_url: &str) -> String {
    let normalized = base_url.trim().trim_end_matches('/');

    if normalized.ends_with(KALSHI_TRADE_API_PREFIX) {
        normalized.to_string()
    } else {
        format!("{normalized}{KALSHI_TRADE_API_PREFIX}")
    }
}

fn build_kalshi_markets_url(
    limit: usize,
    cursor: Option<&str>,
    ticker_filter: Option<&str>,
) -> Result<Url, ProviderFailure> {
    let mut url = parse_kalshi_url("/markets")?;
    url.query_pairs_mut()
        .append_pair("limit", &limit.to_string())
        .append_pair("status", "open");

    if let Some(cursor) = cursor.filter(|value| !value.trim().is_empty()) {
        url.query_pairs_mut().append_pair("cursor", cursor);
    }

    if let Some(ticker_filter) = ticker_filter.filter(|value| !value.trim().is_empty()) {
        url.query_pairs_mut().append_pair("tickers", ticker_filter);
    }

    Ok(url)
}

fn kalshi_endpoint_path(path: &str) -> String {
    let endpoint_path = path
        .strip_prefix(KALSHI_TRADE_API_PREFIX)
        .unwrap_or(path)
        .trim_start_matches('/');

    format!("/{endpoint_path}")
}

fn collect_next_cursors(provider_states: &[VenueCommandState]) -> Option<HashMap<String, String>> {
    let cursors = provider_states
        .iter()
        .filter_map(|state| {
            state
                .next_cursor
                .as_ref()
                .map(|cursor| (state.provider_id.clone(), cursor.clone()))
        })
        .collect::<HashMap<_, _>>();

    if cursors.is_empty() {
        None
    } else {
        Some(cursors)
    }
}

fn append_matching_kalshi_markets(
    markets: &mut Vec<RendererMarketSearchResult>,
    market_values: &[Value],
    normalized_query: &str,
    limit: usize,
) {
    for market in market_values
        .iter()
        .filter_map(normalize_kalshi_market)
        .filter(|market| matches_query(market, normalized_query))
    {
        if markets.len() >= limit {
            return;
        }

        markets.push(market);
    }
}

fn normalize_cursor(cursor: Option<&str>) -> Option<String> {
    cursor
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn kalshi_query_scan_page_budget(normalized_query: &str) -> usize {
    if normalized_query.is_empty() {
        1
    } else {
        KALSHI_QUERY_SCAN_MAX_PAGES
    }
}

fn kalshi_direct_ticker_filter(query: &str) -> Option<String> {
    let ticker = query.trim().to_ascii_uppercase();

    if !(2..=128).contains(&ticker.len()) {
        return None;
    }

    if !ticker
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return None;
    }

    if ticker.starts_with("KX") || ticker.contains('-') {
        Some(ticker)
    } else {
        None
    }
}

fn provider_error(_provider_id: &str, message: String) -> ProviderFailure {
    ProviderFailure {
        status: "provider-error",
        freshness: "disconnected",
        error_reason: "provider_status_unknown",
        message,
    }
}

fn read_value<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    value.as_object()?.get(key)
}

fn read_string(value: &Value, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(found) = read_value(value, key).and_then(value_to_string) {
            return Some(found);
        }
    }

    None
}

fn value_to_string(value: &Value) -> Option<String> {
    match value {
        Value::String(text) => Some(text.clone()),
        Value::Number(number) => Some(number.to_string()),
        _ => None,
    }
}

fn read_bool(value: &Value, key: &str) -> Option<bool> {
    read_value(value, key)?.as_bool()
}

fn parse_string_array(value: Option<&Value>) -> Option<Vec<String>> {
    match value? {
        Value::Array(items) => items.iter().map(value_to_string).collect(),
        Value::String(text) => {
            let parsed = serde_json::from_str::<Vec<Value>>(text).ok()?;
            parsed.iter().map(value_to_string).collect()
        }
        _ => None,
    }
}

fn parse_provider_timestamp(value: &Value) -> Option<String> {
    let raw = value_to_string(value)?;

    if let Ok(number) = raw.parse::<i64>() {
        let timestamp_ms = if number < 1_000_000_000_000 {
            number * 1000
        } else {
            number
        };
        return Utc
            .timestamp_millis_opt(timestamp_ms)
            .single()
            .map(|timestamp| timestamp.to_rfc3339_opts(SecondsFormat::Millis, true));
    }

    DateTime::parse_from_rfc3339(&raw).ok().map(|timestamp| {
        timestamp
            .with_timezone(&Utc)
            .to_rfc3339_opts(SecondsFormat::Millis, true)
    })
}

fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn is_stale(captured_at: &str) -> bool {
    let Ok(timestamp) = DateTime::parse_from_rfc3339(captured_at) else {
        return true;
    };

    Utc::now()
        .signed_duration_since(timestamp.with_timezone(&Utc))
        .num_milliseconds()
        > STALE_THRESHOLD_MS
}

fn provider_onboarding_status_response(
    provider_id: Option<&str>,
    market_id: Option<&str>,
) -> ProviderOnboardingStatusCommandResponse {
    let provider_ids = provider_id
        .filter(|id| is_supported_provider(id))
        .map(|id| vec![id.to_string()])
        .unwrap_or_else(|| vec!["polymarket".to_string(), "kalshi".to_string()]);
    let providers: Vec<ProviderOnboardingProviderStatus> = provider_ids
        .iter()
        .map(|id| provider_onboarding_provider_status(id, market_id, None))
        .collect();
    let ready_count = providers
        .iter()
        .filter(|provider| provider.ready_for_preflight)
        .count();
    let status = if ready_count == providers.len() {
        "ready"
    } else if ready_count > 0 {
        "partial"
    } else {
        "blocked"
    };

    ProviderOnboardingStatusCommandResponse {
        command: "provider_onboarding_status",
        status: status.to_string(),
        message: format!(
            "{ready_count}/{} provider credential profiles are ready for secret-free preflight.",
            providers.len()
        ),
        secret_free: true,
        providers,
    }
}

fn provider_onboarding_provider_status(
    provider_id: &str,
    market_id: Option<&str>,
    forced_credential_reason: Option<String>,
) -> ProviderOnboardingProviderStatus {
    let mut credential = credential_status_for_provider(provider_id);
    if let Some(reason) = forced_credential_reason {
        credential.status = "invalid".to_string();
        credential.source = "explicit_local_provider".to_string();
        credential.message = format!(
            "{} credential onboarding is blocked by {}.",
            live_provider_label(provider_id),
            reason
        );
        credential.reasons = vec![reason];
        credential.masked_identifier = None;
    }

    let account_metrics =
        account_metrics_status_for_provider_with_diagnostics(provider_id, market_id, true);
    let live_adapter_status = if live_provider_runtime_kind(
        provider_id,
        env::var(POLYMARKET_LIVE_RUNTIME_MODE_VAR).ok().as_deref(),
    ) == LiveProviderRuntimeKind::Unconfigured
    {
        "not_configured"
    } else {
        "configured"
    };
    let mut reasons = Vec::new();
    if credential.status != "ready" {
        reasons.extend(credential.reasons.clone());
    }
    if account_metrics.status != "ready" {
        reasons.extend(account_metrics.reasons.clone());
    }
    if live_adapter_status != "configured" {
        reasons.push("provider_live_adapter_not_configured".to_string());
    }
    reasons.sort();
    reasons.dedup();

    ProviderOnboardingProviderStatus {
        provider_id: provider_id.to_string(),
        label: live_provider_label(provider_id),
        credential,
        account_metrics,
        live_adapter_status: live_adapter_status.to_string(),
        ready_for_preflight: reasons.is_empty(),
        reasons,
    }
}

fn connect_provider_account(request: ProviderCredentialConnectRequest) -> Result<(), String> {
    if !is_supported_provider(&request.provider_id) {
        return Err("provider_not_supported".to_string());
    }

    if request.credential_source != "explicit_local_provider" {
        return Err("credential_source_not_supported_for_onboarding".to_string());
    }

    let profile = match request.provider_id.as_str() {
        "polymarket" => {
            let signer_path = request
                .polymarket_signer_file_path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "polymarket_local_signer_file_missing".to_string())?;
            let signer_material = load_and_validate_polymarket_signer_file(Path::new(signer_path))?;
            app_managed_polymarket_profile_from_signer_material(
                &signer_material,
                request.polymarket_trading_address.as_deref(),
                request.polymarket_signature_type.as_deref(),
            )?
        }
        "kalshi" => {
            let api_key_id = request
                .kalshi_api_key_id
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "kalshi_api_key_id_missing".to_string())?;
            let key_file_path = request
                .kalshi_key_file_path
                .as_deref()
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "kalshi_key_file_missing".to_string())?;
            let key_material = load_and_validate_kalshi_key_file(Path::new(key_file_path))?;
            save_app_managed_credential_material("kalshi", "rsa_private_key", &key_material)?;
            LocalSecureProviderProfile {
                provider_id: "kalshi".to_string(),
                credential_source: "explicit_local_provider".to_string(),
                configured_at: now_iso(),
                polymarket_signer_storage: None,
                polymarket_signer_file_path: None,
                polymarket_trading_address: None,
                polymarket_signature_type: None,
                polymarket_imported_address_candidates: Vec::new(),
                kalshi_api_key_id: Some(api_key_id.to_string()),
                kalshi_key_storage: Some(APP_MANAGED_SECRET_STORAGE.to_string()),
                kalshi_key_file_path: None,
            }
        }
        _ => return Err("provider_not_supported".to_string()),
    };

    save_local_secure_provider_profile(profile)
}

fn import_polymarket_signer_from_clipboard(
    request: PolymarketSignerClipboardImportRequest,
) -> Result<(), String> {
    parse_polymarket_signature_type(
        request
            .polymarket_signature_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "polymarket_signature_type_missing".to_string())?,
    )?;

    let clipboard_text = read_os_clipboard_text()?;
    let signer_material = normalize_polymarket_signer_material(
        &clipboard_text,
        "polymarket_clipboard_signer_missing",
        "polymarket_clipboard_signer_invalid",
    )?;
    let cached_profile = load_cached_polymarket_profile_for_same_signer(&signer_material);
    let (profile_trading_address, profile_signature_type) =
        polymarket_clipboard_import_profile_inputs(&request, cached_profile.as_ref());
    let imported_address_candidates = merge_polymarket_imported_address_candidates(
        extract_polymarket_public_address_candidates(&clipboard_text),
        cached_profile.as_ref(),
    );

    let mut profile = app_managed_polymarket_profile_from_signer_material(
        &signer_material,
        profile_trading_address.as_deref(),
        profile_signature_type.as_deref(),
    )?;
    profile.polymarket_imported_address_candidates = imported_address_candidates;
    save_local_secure_provider_profile(profile)?;
    clear_os_clipboard_text().ok();

    Ok(())
}

fn load_cached_polymarket_profile_for_same_signer(
    signer_material: &str,
) -> Option<LocalSecureProviderProfile> {
    let profile = load_local_secure_provider_profile("polymarket")
        .ok()
        .flatten()?;
    let imported_signer = parse_polymarket_local_signer_material(signer_material).ok()?;
    let cached_signer_material = load_polymarket_signer_material_from_profile(&profile).ok()?;
    let cached_signer = parse_polymarket_local_signer_material(&cached_signer_material).ok()?;

    if imported_signer.address() != cached_signer.address() {
        return None;
    }

    Some(profile)
}

fn polymarket_clipboard_import_profile_inputs(
    request: &PolymarketSignerClipboardImportRequest,
    cached_profile: Option<&LocalSecureProviderProfile>,
) -> (Option<String>, Option<String>) {
    let requested_trading_address = request
        .polymarket_trading_address
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    let requested_signature_type = request
        .polymarket_signature_type
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    if requested_trading_address.is_some() {
        return (requested_trading_address, requested_signature_type);
    }

    if let Some(profile) = cached_profile {
        if let Some(signature_type_label) = profile
            .polymarket_signature_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            if let Ok(signature_type) = parse_polymarket_signature_type(signature_type_label) {
                if parse_polymarket_trading_address(
                    profile.polymarket_trading_address.as_deref(),
                    signature_type,
                )
                .is_ok()
                {
                    let cached_trading_address = profile
                        .polymarket_trading_address
                        .as_deref()
                        .map(str::trim)
                        .filter(|value| !value.is_empty())
                        .map(str::to_string);
                    return (
                        cached_trading_address,
                        Some(polymarket_signature_type_label(signature_type).to_string()),
                    );
                }
            }
        }
    }

    (None, requested_signature_type)
}

fn merge_polymarket_imported_address_candidates(
    clipboard_candidates: Vec<Address>,
    cached_profile: Option<&LocalSecureProviderProfile>,
) -> Vec<String> {
    let mut merged = Vec::new();

    for address in clipboard_candidates.into_iter().chain(
        cached_profile
            .map(|profile| {
                parse_polymarket_imported_address_candidates(
                    &profile.polymarket_imported_address_candidates,
                )
            })
            .unwrap_or_default(),
    ) {
        if merged.len() >= 8 {
            break;
        }

        if address != Address::ZERO && !merged.contains(&address) {
            merged.push(address);
        }
    }

    merged
        .into_iter()
        .map(|address| address.to_string())
        .collect()
}

fn apply_polymarket_account_candidate(
    request: PolymarketAccountCandidateApplyRequest,
) -> Result<(), String> {
    let requested_label = request.label.trim();
    let requested_signature_type = parse_polymarket_signature_type(request.signature_type.trim())?;
    if requested_label.is_empty() {
        return Err("polymarket_account_candidate_missing".to_string());
    }

    let mut profile = load_local_secure_provider_profile("polymarket")?
        .ok_or_else(|| "credential_profile_missing".to_string())?;
    let current_signature_type = profile
        .polymarket_signature_type
        .as_deref()
        .ok_or_else(|| "polymarket_signature_type_missing".to_string())
        .and_then(parse_polymarket_signature_type)?;
    let current_funder = parse_polymarket_trading_address(
        profile.polymarket_trading_address.as_deref(),
        current_signature_type,
    )?;
    let signer_material = load_polymarket_signer_material_from_profile(&profile)?;
    let signer = parse_polymarket_local_signer_material(&signer_material)
        .map_err(|_| "polymarket_local_signer_file_invalid".to_string())?;
    let imported_address_candidates = parse_polymarket_imported_address_candidates(
        &profile.polymarket_imported_address_candidates,
    );
    let candidate = polymarket_account_candidate_specs(
        signer.address(),
        current_funder,
        current_signature_type,
        &imported_address_candidates,
    )
    .into_iter()
    .find(|candidate| {
        candidate.label == requested_label && candidate.signature_type == requested_signature_type
    })
    .ok_or_else(|| "polymarket_account_candidate_not_found".to_string())?;

    profile.polymarket_signature_type =
        Some(polymarket_signature_type_label(candidate.signature_type).to_string());
    profile.polymarket_trading_address = if candidate.signature_type == PolymarketSignatureType::Eoa
    {
        None
    } else {
        Some(candidate.address.to_string())
    };
    profile.configured_at = now_iso();

    save_local_secure_provider_profile(profile)
}

fn app_managed_polymarket_profile_from_signer_material(
    signer_material: &str,
    trading_address: Option<&str>,
    signature_type: Option<&str>,
) -> Result<LocalSecureProviderProfile, String> {
    validate_polymarket_signer_material(signer_material)?;
    let signature_type = parse_polymarket_signature_type(
        signature_type
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "polymarket_signature_type_missing".to_string())?,
    )?;
    let parsed_trading_address =
        resolve_polymarket_trading_address(signer_material, trading_address, signature_type)?;
    let normalized_trading_address = parsed_trading_address.map(|address| address.to_string());
    save_app_managed_credential_material("polymarket", "local_signer", signer_material.trim())?;

    Ok(LocalSecureProviderProfile {
        provider_id: "polymarket".to_string(),
        credential_source: "explicit_local_provider".to_string(),
        configured_at: now_iso(),
        polymarket_signer_storage: Some(APP_MANAGED_SECRET_STORAGE.to_string()),
        polymarket_signer_file_path: None,
        polymarket_trading_address: normalized_trading_address,
        polymarket_signature_type: Some(
            polymarket_signature_type_label(signature_type).to_string(),
        ),
        polymarket_imported_address_candidates: Vec::new(),
        kalshi_api_key_id: None,
        kalshi_key_storage: None,
        kalshi_key_file_path: None,
    })
}

fn allowed_credential_reference_url(provider_id: &str, reference_id: &str) -> Option<&'static str> {
    match (provider_id, reference_id) {
        ("polymarket", "polymarket_magic_export") => Some(POLYMARKET_MAGIC_EXPORT_URL),
        ("polymarket", "polymarket_export_help") => Some(POLYMARKET_EXPORT_HELP_URL),
        ("polymarket", "polymarket_pusd_docs") => Some(POLYMARKET_PUSD_DOCS_URL),
        ("kalshi", "kalshi_profile") => Some("https://kalshi.com/account/profile"),
        ("kalshi", "kalshi_api_keys") => Some("https://docs.kalshi.com/getting_started/api_keys"),
        _ => None,
    }
}

fn open_external_https_url(url: &str) -> Result<(), String> {
    if !url.starts_with("https://") || allowed_external_url(url).is_none() {
        return Err("credential_reference_url_not_allowed".to_string());
    }

    open_external_https_url_impl(url)
}

fn allowed_external_url(url: &str) -> Option<&'static str> {
    [
        POLYMARKET_MAGIC_EXPORT_URL,
        POLYMARKET_EXPORT_HELP_URL,
        POLYMARKET_PUSD_DOCS_URL,
        "https://kalshi.com/account/profile",
        "https://docs.kalshi.com/getting_started/api_keys",
    ]
    .into_iter()
    .find(|allowed_url| *allowed_url == url)
}

#[cfg(windows)]
fn open_external_https_url_impl(url: &str) -> Result<(), String> {
    Command::new("rundll32.exe")
        .arg("url.dll,FileProtocolHandler")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|_| "credential_reference_open_failed".to_string())
}

#[cfg(not(windows))]
fn open_external_https_url_impl(_url: &str) -> Result<(), String> {
    Err("credential_reference_open_unavailable".to_string())
}

fn live_preflight_status_response(
    request: &LivePreflightStatusRequest,
) -> LivePreflightStatusCommandResponse {
    let providers = vec!["polymarket", "kalshi"]
        .into_iter()
        .map(|provider_id| live_preflight_provider_status(provider_id, request))
        .collect::<Vec<_>>();
    let ready = providers.iter().all(|provider| provider.ready);
    let ready_count = providers.iter().filter(|provider| provider.ready).count();

    LivePreflightStatusCommandResponse {
        command: "live_preflight_status",
        status: if ready { "ready" } else { "blocked" }.to_string(),
        message: if ready {
            "Every provider preflight is ready for the requested live order policy.".to_string()
        } else {
            format!(
                "Live preflight is blocked; {ready_count}/{} providers are ready.",
                providers.len()
            )
        },
        secret_free: true,
        ready,
        providers,
    }
}

fn live_preflight_provider_status(
    provider_id: &str,
    request: &LivePreflightStatusRequest,
) -> LivePreflightProviderStatus {
    let selected_for_provider = request
        .provider_id
        .as_deref()
        .is_some_and(|id| id == provider_id);
    let market_id_for_provider = if selected_for_provider {
        request.market_id.as_deref()
    } else {
        None
    };
    let credential = credential_status_for_provider(provider_id);
    let account_metrics = account_metrics_status_for_provider(provider_id, market_id_for_provider);
    let evaluation = evaluate_live_gate_status(
        provider_id,
        request.explicit_live_ack,
        request.audit_log_enabled,
        request.kill_switch_active,
    );
    let mut reasons = evaluation.reasons.clone();

    if !selected_for_provider || !request.selected_market {
        reasons.push("selected_market_missing".to_string());
    }

    if selected_for_provider {
        if request
            .market_id
            .as_deref()
            .map(str::trim)
            .is_none_or(str::is_empty)
        {
            reasons.push("market_id_missing".to_string());
        }
        if request
            .outcome_id
            .as_deref()
            .map(str::trim)
            .is_none_or(str::is_empty)
        {
            reasons.push("outcome_id_missing".to_string());
        }
    }

    if request.order_book_freshness.as_deref() != Some("fresh") {
        reasons.push("fresh_official_order_book_missing".to_string());
    }

    if !request.non_marketable {
        reasons.push("marketable_order_blocked".to_string());
    }

    if request
        .stake_amount
        .as_deref()
        .is_none_or(|value| !is_positive_decimal(value))
    {
        reasons.push("stake_not_configured".to_string());
    }

    if request
        .max_stake_per_order
        .as_deref()
        .is_none_or(|value| !is_positive_decimal(value))
    {
        reasons.push("max_stake_not_configured".to_string());
    }

    if request
        .max_market_exposure
        .as_deref()
        .is_none_or(|value| !is_positive_decimal(value))
    {
        reasons.push("max_exposure_not_configured".to_string());
    }

    if credential.status != "ready" {
        reasons.extend(credential.reasons.clone());
    }

    if account_metrics.status != "ready" {
        reasons.extend(account_metrics.reasons.clone());
    }

    if live_provider_runtime_kind(
        provider_id,
        env::var(POLYMARKET_LIVE_RUNTIME_MODE_VAR).ok().as_deref(),
    ) == LiveProviderRuntimeKind::Unconfigured
    {
        reasons.push("provider_live_adapter_not_configured".to_string());
    }

    reasons.sort();
    reasons.dedup();
    let ready = reasons.is_empty();

    LivePreflightProviderStatus {
        provider_id: provider_id.to_string(),
        status: if ready { "ready" } else { "blocked" }.to_string(),
        ready,
        message: if ready {
            format!(
                "{} preflight is ready for BUY limit/GTC/post-only live order.",
                live_provider_label(provider_id)
            )
        } else {
            format!(
                "{} preflight is blocked by: {}.",
                live_provider_label(provider_id),
                reasons.join(", ")
            )
        },
        credential,
        account_metrics,
        gates: live_preflight_gates(&reasons),
        reasons,
    }
}

fn live_preflight_gates(reasons: &[String]) -> Vec<LivePreflightGateStatus> {
    let groups = [
        (
            "legal_geo",
            vec![
                "legal_gate_not_approved",
                "geo_blocked",
                "geo_unknown",
                "local_approval_missing",
                "local_approval_not_approved",
                "local_approval_provider_mismatch",
            ],
        ),
        (
            "credential",
            vec![
                "credential_source_missing",
                "credential_source_invalid",
                "polymarket_local_signer_file_missing",
                "polymarket_local_signer_file_invalid",
                "kalshi_api_key_id_missing",
                "kalshi_key_file_missing",
                "kalshi_key_file_invalid",
                "kalshi_key_file_encrypted_passphrase_not_supported",
                "seed_phrase_not_allowed",
            ],
        ),
        (
            "account_metrics",
            vec![
                "account_metrics_source_missing",
                "account_metrics_provider_not_configured",
                "account_metrics_values_source_missing",
                "account_metrics_values_malformed",
                "account_metrics_values_stale",
                "account_metrics_provider_mismatch",
                "account_metrics_market_mismatch",
                "account_metrics_network_error",
                "account_metrics_payload_invalid",
                "account_metrics_provider_rejected",
                "account_metrics_provider_url_invalid",
                "available_funds_unknown",
                "provider_exposure_unknown",
                "market_exposure_unknown",
                "provider_credentials_required",
            ],
        ),
        (
            "book_market",
            vec![
                "selected_market_missing",
                "market_id_missing",
                "outcome_id_missing",
                "fresh_official_order_book_missing",
            ],
        ),
        (
            "risk_policy",
            vec![
                "stake_not_configured",
                "max_stake_not_configured",
                "max_exposure_not_configured",
                "marketable_order_blocked",
                "stake_exceeds_limit",
                "exposure_exceeds_limit",
                "c0_risk_detected",
                "c1_approval_missing",
            ],
        ),
        (
            "runtime",
            vec![
                "provider_live_adapter_not_configured",
                "enable_live_trading_not_true",
                "explicit_live_ack_missing",
                "audit_log_not_enabled",
                "kill_switch_active",
            ],
        ),
    ];

    groups
        .into_iter()
        .map(|(id, group_reasons)| {
            let matches = reasons
                .iter()
                .filter(|reason| group_reasons.contains(&reason.as_str()))
                .cloned()
                .collect::<Vec<_>>();
            LivePreflightGateStatus {
                id: id.to_string(),
                status: if matches.is_empty() {
                    "ready".to_string()
                } else {
                    "blocked".to_string()
                },
                blocks_live: !matches.is_empty(),
                reasons: matches,
            }
        })
        .collect()
}

fn evaluate_live_gate_status(
    provider_id: &str,
    explicit_live_ack: bool,
    audit_log_enabled: bool,
    kill_switch_active: bool,
) -> LiveGateEvaluation {
    let mut reasons = Vec::new();

    if !is_supported_provider(provider_id) {
        reasons.push("provider_not_supported".to_string());
    }

    let local_approval = load_local_approval_gate(provider_id);
    let local_approval_loaded = local_approval.is_ok();
    let mut local_approval_limits = None;
    let mut local_approval_approved = false;
    match local_approval {
        Ok(approval) if approval_file_allows_live(provider_id, &approval) => {
            local_approval_approved = true;
            local_approval_limits = Some(LocalApprovalLimits {
                max_stake_first_order: approval.max_stake_first_order,
                max_market_exposure: approval.max_market_exposure,
            });
        }
        Ok(_) => reasons.push("local_approval_not_approved".to_string()),
        Err(reason) => reasons.push(reason),
    }

    let live_trading_enabled = env::var("ENABLE_LIVE_TRADING").is_ok_and(|value| value == "true")
        || local_approval_approved;
    if !live_trading_enabled {
        reasons.push("enable_live_trading_not_true".to_string());
    }

    let legal_gate_status_from_env =
        env::var("LEGAL_GATE_STATUS").unwrap_or_else(|_| "NOT_APPROVED".to_string());
    let legal_gate_approved = legal_gate_status_from_env == "APPROVED" || local_approval_approved;
    let legal_gate_status = if legal_gate_approved {
        "APPROVED".to_string()
    } else {
        legal_gate_status_from_env
    };
    if !legal_gate_approved {
        reasons.push("legal_gate_not_approved".to_string());
    }

    let credential_ready = credential_source_ready_for(provider_id);
    if !credential_ready {
        reasons.push("credential_source_missing".to_string());
    }

    let account_metrics_ready = account_metrics_source_ready_for(provider_id);
    if !account_metrics_ready {
        reasons.push("account_metrics_source_missing".to_string());
    }

    if !explicit_live_ack {
        reasons.push("explicit_live_ack_missing".to_string());
    }

    if !audit_log_enabled {
        reasons.push("audit_log_not_enabled".to_string());
    }

    if kill_switch_active {
        reasons.push("kill_switch_active".to_string());
    }

    reasons.sort();
    reasons.dedup();

    LiveGateEvaluation {
        ready: reasons.is_empty(),
        reasons,
        local_approval_loaded,
        credential_source_ready: credential_ready,
        account_metrics_source_ready: account_metrics_ready,
        live_trading_enabled,
        legal_gate_status,
        local_approval_limits,
    }
}

fn live_gate_status_response(
    provider_id: &str,
    evaluation: LiveGateEvaluation,
) -> LiveGateStatusCommandResponse {
    LiveGateStatusCommandResponse {
        command: "live_gate_status",
        provider_id: provider_id.to_string(),
        status: if evaluation.ready {
            "ready".to_string()
        } else {
            "blocked".to_string()
        },
        message: if evaluation.ready {
            "All configured live gates are ready for the selected provider.".to_string()
        } else {
            format!("Live is blocked by: {}.", evaluation.reasons.join(", "))
        },
        secret_free: true,
        ready: evaluation.ready,
        reasons: evaluation.reasons,
        local_approval_loaded: evaluation.local_approval_loaded,
        credential_source_ready: evaluation.credential_source_ready,
        account_metrics_source_ready: evaluation.account_metrics_source_ready,
        live_trading_enabled: evaluation.live_trading_enabled,
        legal_gate_status: evaluation.legal_gate_status,
    }
}

fn legal_approval_status_response(provider_id: &str) -> LegalApprovalStatusCommandResponse {
    if !is_supported_provider(provider_id) {
        return LegalApprovalStatusCommandResponse {
            command: "legal_approval_status",
            provider_id: provider_id.to_string(),
            status: "blocked".to_string(),
            message: "Legal approval is blocked by: provider_not_supported.".to_string(),
            secret_free: true,
            ready: false,
            reasons: vec!["provider_not_supported".to_string()],
            local_approval_loaded: false,
            legal_gate_status: "NOT_APPROVED".to_string(),
            approval_source: "tauri_local_approval_file".to_string(),
            limits: None,
            approved_at: None,
        };
    }

    match load_local_approval_gate(provider_id) {
        Ok(approval) if approval_file_allows_live(provider_id, &approval) => {
            LegalApprovalStatusCommandResponse {
                command: "legal_approval_status",
                provider_id: provider_id.to_string(),
                status: "ready".to_string(),
                message:
                    "Legal approval is complete for this provider; remaining live gates still apply."
                        .to_string(),
                secret_free: true,
                ready: true,
                reasons: Vec::new(),
                local_approval_loaded: true,
                legal_gate_status: "APPROVED".to_string(),
                approval_source: "tauri_local_approval_file".to_string(),
                limits: Some(LocalApprovalLimits {
                    max_stake_first_order: approval.max_stake_first_order,
                    max_market_exposure: approval.max_market_exposure,
                }),
                approved_at: Some(approval.approved_at),
            }
        }
        Ok(_) => LegalApprovalStatusCommandResponse {
            command: "legal_approval_status",
            provider_id: provider_id.to_string(),
            status: "blocked".to_string(),
            message: "Legal approval is blocked by: local_approval_not_approved.".to_string(),
            secret_free: true,
            ready: false,
            reasons: vec!["local_approval_not_approved".to_string()],
            local_approval_loaded: true,
            legal_gate_status: "NOT_APPROVED".to_string(),
            approval_source: "tauri_local_approval_file".to_string(),
            limits: None,
            approved_at: None,
        },
        Err(reason) => LegalApprovalStatusCommandResponse {
            command: "legal_approval_status",
            provider_id: provider_id.to_string(),
            status: "blocked".to_string(),
            message: format!("Legal approval is blocked by: {reason}."),
            secret_free: true,
            ready: false,
            reasons: vec![reason],
            local_approval_loaded: false,
            legal_gate_status: "NOT_APPROVED".to_string(),
            approval_source: "tauri_local_approval_file".to_string(),
            limits: None,
            approved_at: None,
        },
    }
}

fn build_local_approval_from_submit(
    request: LegalApprovalSubmitRequest,
) -> Result<LocalApprovalGateFile, Vec<String>> {
    let provider_id = request.provider_id.trim().to_string();
    let mut reasons = Vec::new();

    if !is_supported_provider(&provider_id) {
        reasons.push("provider_not_supported".to_string());
    }
    if request.target_jurisdiction.trim().is_empty() {
        reasons.push("legal_target_jurisdiction_missing".to_string());
    }
    if request.operator_identity.trim().is_empty() {
        reasons.push("legal_operator_identity_missing".to_string());
    }
    if request.approver.trim().is_empty() {
        reasons.push("legal_approver_missing".to_string());
    }
    if !is_positive_decimal(&request.max_stake_first_order) {
        reasons.push("legal_max_stake_invalid".to_string());
    }
    if !is_positive_decimal(&request.max_market_exposure) {
        reasons.push("legal_max_exposure_invalid".to_string());
    }

    let checks = request.checks;
    if !checks.platform_eligible {
        reasons.push("legal_platform_eligibility_not_confirmed".to_string());
    }
    if !checks.real_operator {
        reasons.push("legal_real_operator_not_confirmed".to_string());
    }
    if !checks.real_beneficial_owners {
        reasons.push("legal_real_beneficial_owners_not_confirmed".to_string());
    }
    if !checks.real_account_owner {
        reasons.push("legal_real_account_owner_not_confirmed".to_string());
    }
    if !checks.no_geoblock_bypass {
        reasons.push("legal_geoblock_bypass_not_rejected".to_string());
    }
    if !checks.no_vpn_bypass {
        reasons.push("legal_vpn_bypass_not_rejected".to_string());
    }
    if !checks.no_fake_kyc {
        reasons.push("legal_fake_kyc_not_rejected".to_string());
    }
    if !checks.no_sanctions_bypass {
        reasons.push("legal_sanctions_bypass_not_rejected".to_string());
    }
    if !checks.no_custody {
        reasons.push("legal_custody_not_rejected".to_string());
    }
    if !checks.c0_review_pass {
        reasons.push("legal_c0_review_not_passed".to_string());
    }
    if !checks.c1_risk_accepted {
        reasons.push("legal_c1_risk_not_accepted".to_string());
    }
    if !checks.audit_enabled {
        reasons.push("legal_audit_not_confirmed".to_string());
    }
    if !checks.first_live_smoke_only {
        reasons.push("legal_first_live_smoke_policy_not_confirmed".to_string());
    }
    if !checks.no_deposits_or_withdrawals {
        reasons.push("legal_no_deposits_withdrawals_not_confirmed".to_string());
    }
    if !checks.understands_risk {
        reasons.push("legal_operator_risk_not_acknowledged".to_string());
    }

    reasons.sort();
    reasons.dedup();
    if !reasons.is_empty() {
        return Err(reasons);
    }

    Ok(LocalApprovalGateFile {
        status: "APPROVED".to_string(),
        provider_id,
        target_jurisdiction: request.target_jurisdiction.trim().to_string(),
        operator_identity: request.operator_identity.trim().to_string(),
        approver: request.approver.trim().to_string(),
        c0_review: "PASS".to_string(),
        c1_risk_acceptance: "APPROVED_OR_NOT_REQUIRED".to_string(),
        max_stake_first_order: request.max_stake_first_order.trim().to_string(),
        max_market_exposure: request.max_market_exposure.trim().to_string(),
        geoblock_result: "PASS".to_string(),
        credential_source: "explicit_local_provider".to_string(),
        audit_log: "enabled".to_string(),
        approved_at: now_iso(),
    })
}

fn validate_live_order_request(
    request: &LiveOrderSubmitRequest,
    local_approval_limits: Option<&LocalApprovalLimits>,
    account_metrics: Option<&TauriOwnedAccountMetrics>,
) -> Vec<String> {
    let mut reasons = Vec::new();

    if !request.selected_market {
        reasons.push("selected_market_missing".to_string());
    }

    if request.order_book_freshness != "fresh" {
        reasons.push("fresh_official_order_book_missing".to_string());
    }

    if request.side != "BUY" {
        reasons.push("live_smoke_buy_only".to_string());
    }

    if request.order_type != "limit" {
        reasons.push("limit_order_required".to_string());
    }

    if request.time_in_force != "GTC" {
        reasons.push("gtc_required".to_string());
    }

    if request.marketable {
        reasons.push("marketable_order_blocked".to_string());
    }

    if request.market_id.trim().is_empty() {
        reasons.push("market_id_missing".to_string());
    }

    if request.outcome_id.trim().is_empty() {
        reasons.push("outcome_id_missing".to_string());
    }

    if request.stake_currency.trim().is_empty() {
        reasons.push("stake_currency_missing".to_string());
    }

    if !is_positive_decimal(&request.price) {
        reasons.push("price_invalid".to_string());
    }

    if !is_positive_decimal(&request.quantity) {
        reasons.push("quantity_invalid".to_string());
    }

    if !is_positive_decimal(&request.stake_amount) {
        reasons.push("stake_not_configured".to_string());
    }

    if !is_positive_decimal(&request.max_stake_per_order) {
        reasons.push("max_stake_not_configured".to_string());
    }

    if !is_positive_decimal(&request.max_market_exposure) {
        reasons.push("max_exposure_not_configured".to_string());
    }

    let price = parse_positive_provider_decimal(&request.price);
    let quantity = parse_positive_provider_decimal(&request.quantity);
    let stake = parse_positive_provider_decimal(&request.stake_amount);
    let max_stake = parse_positive_provider_decimal(&request.max_stake_per_order);
    let max_exposure = parse_positive_provider_decimal(&request.max_market_exposure);
    let min_order_size = request
        .min_order_size
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .and_then(parse_positive_provider_decimal);

    if request
        .min_order_size
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .is_some()
        && min_order_size.is_none()
    {
        reasons.push("market_min_order_size_invalid".to_string());
    }

    if stake
        .zip(max_stake)
        .is_some_and(|(stake, max_stake)| stake > max_stake)
    {
        reasons.push("stake_exceeds_limit".to_string());
    }

    let metric_market_exposure = match account_metrics {
        Some(metrics) => {
            let available_funds = parse_non_negative_provider_decimal(&metrics.available_funds);
            let provider_exposure = parse_non_negative_provider_decimal(&metrics.provider_exposure);
            let market_exposure = parse_non_negative_provider_decimal(&metrics.market_exposure);

            if available_funds.is_none() {
                reasons.push("available_funds_unknown".to_string());
            } else if let (Some(available_funds), Some(stake)) = (available_funds, stake) {
                if available_funds < stake {
                    reasons.push("insufficient_available_funds".to_string());
                }
            }

            if provider_exposure.is_none() {
                reasons.push("provider_exposure_unknown".to_string());
            }

            if market_exposure.is_none() {
                reasons.push("market_exposure_unknown".to_string());
            }

            market_exposure
        }
        None => {
            reasons.push("account_metrics_values_source_missing".to_string());
            None
        }
    };

    if let (Some(quantity), Some(min_order_size)) = (quantity, min_order_size) {
        if quantity < min_order_size {
            reasons.push("order_size_below_market_minimum".to_string());
        }
    }

    if let (Some(price), Some(quantity), Some(stake)) = (price, quantity, stake) {
        let estimated_cost = price * quantity;
        let rounding_tolerance = Decimal::new(1, 6);
        if estimated_cost > stake + rounding_tolerance {
            reasons.push("estimated_order_cost_exceeds_stake_amount".to_string());
        }
    }

    if let (Some(market_exposure), Some(stake), Some(max_exposure)) =
        (metric_market_exposure, stake, max_exposure)
    {
        if market_exposure + stake > max_exposure {
            reasons.push("exposure_exceeds_limit".to_string());
        }
    }

    if let (Some(limits), Some(stake)) = (local_approval_limits, stake) {
        if parse_positive_provider_decimal(&limits.max_stake_first_order)
            .is_some_and(|approved_max| stake > approved_max)
        {
            reasons.push("stake_exceeds_local_approval".to_string());
        }

        if let (Some(market_exposure), Some(approved_max_exposure)) = (
            metric_market_exposure,
            parse_positive_provider_decimal(&limits.max_market_exposure),
        ) {
            if market_exposure + stake > approved_max_exposure {
                reasons.push("exposure_exceeds_local_approval".to_string());
            }
        }
    }

    reasons.sort();
    reasons.dedup();
    reasons
}

fn live_order_blocked_message(request: &LiveOrderSubmitRequest, reasons: &[String]) -> String {
    let base = format!(
        "Live order blocked before provider submission: {}.",
        reasons.join(", ")
    );

    if reasons
        .iter()
        .any(|reason| reason == "estimated_order_cost_exceeds_stake_amount")
    {
        let price = parse_positive_provider_decimal(&request.price);
        let quantity = parse_positive_provider_decimal(&request.quantity);
        let stake = parse_positive_provider_decimal(&request.stake_amount);

        if let (Some(price), Some(quantity), Some(stake)) = (price, quantity, stake) {
            let estimated_cost = price * quantity;
            return format!(
                "{base} Estimated BUY cost {estimated_cost} {} exceeds declared stake {stake} {}; quantity is shares, so it may be higher than stake when price is below 1.",
                request.stake_currency, request.stake_currency
            );
        }
    }

    if reasons
        .iter()
        .any(|reason| reason == "order_size_below_market_minimum")
    {
        let quantity = parse_positive_provider_decimal(&request.quantity);
        let min_order_size = request
            .min_order_size
            .as_deref()
            .and_then(parse_positive_provider_decimal);

        if let (Some(quantity), Some(min_order_size)) = (quantity, min_order_size) {
            return format!(
                "{base} Order size {quantity} is below this Polymarket market minimum size {min_order_size}; increase stake or choose a higher price so the share quantity reaches the minimum."
            );
        }
    }

    base
}

fn credential_status_for_provider(provider_id: &str) -> ProviderCredentialStatus {
    if !is_supported_provider(provider_id) {
        return ProviderCredentialStatus {
            status: "blocked".to_string(),
            source: "none".to_string(),
            message: "Provider is not supported by the live credential gate.".to_string(),
            reasons: vec!["provider_not_supported".to_string()],
            masked_identifier: None,
            checked_at: now_iso(),
        };
    }

    match load_local_secure_provider_profile(provider_id) {
        Ok(Some(profile)) => validate_local_secure_provider_profile(provider_id, &profile),
        Ok(None) => credential_status_from_dev_fallback(provider_id),
        Err(reason) => ProviderCredentialStatus {
            status: "invalid".to_string(),
            source: "explicit_local_provider".to_string(),
            message: format!(
                "{} local secure credential profile could not be read.",
                live_provider_label(provider_id)
            ),
            reasons: vec![reason],
            masked_identifier: None,
            checked_at: now_iso(),
        },
    }
}

fn credential_status_from_dev_fallback(provider_id: &str) -> ProviderCredentialStatus {
    let source = env::var("CREDENTIAL_SOURCE").unwrap_or_else(|_| "none".to_string());
    let provider_ready =
        env::var("LOCAL_CREDENTIAL_PROVIDER_READY").is_ok_and(|value| value == "true");

    if is_allowed_credential_source(&source) && provider_ready {
        return ProviderCredentialStatus {
            status: "ready".to_string(),
            source,
            message: format!(
                "{} credential source reports ready through the local dev/smoke fallback.",
                live_provider_label(provider_id)
            ),
            reasons: Vec::new(),
            masked_identifier: None,
            checked_at: now_iso(),
        };
    }

    ProviderCredentialStatus {
        status: "missing".to_string(),
        source,
        message: format!(
            "{} has no approved local credential provider profile.",
            live_provider_label(provider_id)
        ),
        reasons: vec!["credential_source_missing".to_string()],
        masked_identifier: None,
        checked_at: now_iso(),
    }
}

fn validate_local_secure_provider_profile(
    provider_id: &str,
    profile: &LocalSecureProviderProfile,
) -> ProviderCredentialStatus {
    if profile.credential_source != "explicit_local_provider" {
        return ProviderCredentialStatus {
            status: "blocked".to_string(),
            source: profile.credential_source.clone(),
            message: "Only the explicit local provider is implemented in this build.".to_string(),
            reasons: vec!["credential_source_not_supported_for_onboarding".to_string()],
            masked_identifier: None,
            checked_at: now_iso(),
        };
    }

    match provider_id {
        "polymarket" => {
            let signer_material_result = load_polymarket_signer_material_from_profile(profile);
            let validation = match signer_material_result.as_deref() {
                Ok(material) => validate_polymarket_signer_material(material),
                Err(reason) => Err(reason.clone()),
            };
            let signature_type_validation = profile
                .polymarket_signature_type
                .as_deref()
                .ok_or_else(|| "polymarket_signature_type_missing".to_string())
                .and_then(parse_polymarket_signature_type);
            let trading_address_validation = signature_type_validation.and_then(|signature_type| {
                let parsed_address = parse_polymarket_trading_address(
                    profile.polymarket_trading_address.as_deref(),
                    signature_type,
                )?;
                Ok((
                    signature_type,
                    parsed_address.map(|address| address.to_string()),
                ))
            });

            match (validation, trading_address_validation) {
                (Ok(()), Ok((signature_type, trading_address))) => ProviderCredentialStatus {
                    status: "ready".to_string(),
                    source: profile.credential_source.clone(),
                    message: "Polymarket signer and trading funder are available in the Tauri-owned local credential provider."
                        .to_string(),
                    reasons: Vec::new(),
                    masked_identifier: Some(
                        trading_address
                            .as_deref()
                            .map(mask_identifier)
                            .map(|address| {
                                format!(
                                    "{}:{address}",
                                    polymarket_signature_type_label(signature_type)
                                )
                            })
                            .unwrap_or_else(|| "eoa-signer:configured".to_string()),
                    ),
                    checked_at: now_iso(),
                },
                (Err(reason), _) | (_, Err(reason)) => ProviderCredentialStatus {
                    status: "invalid".to_string(),
                    source: profile.credential_source.clone(),
                    message: "Polymarket signer, signature type, or trading funder failed local provider validation."
                        .to_string(),
                    reasons: vec![reason],
                    masked_identifier: None,
                    checked_at: now_iso(),
                },
            }
        }
        "kalshi" => {
            let Some(api_key_id) = profile.kalshi_api_key_id.as_deref() else {
                return ProviderCredentialStatus {
                    status: "missing".to_string(),
                    source: profile.credential_source.clone(),
                    message: "Kalshi API Key ID is not configured.".to_string(),
                    reasons: vec!["kalshi_api_key_id_missing".to_string()],
                    masked_identifier: None,
                    checked_at: now_iso(),
                };
            };
            let validation =
                if profile.kalshi_key_storage.as_deref() == Some(APP_MANAGED_SECRET_STORAGE) {
                    load_app_managed_credential_material("kalshi", "rsa_private_key").and_then(
                        |material| validate_kalshi_key_material(&material).map_err(str::to_string),
                    )
                } else if let Some(path) = profile.kalshi_key_file_path.as_deref() {
                    validate_kalshi_key_file(Path::new(path))
                } else {
                    Err("kalshi_key_file_missing".to_string())
                };

            match validation {
                Ok(()) => ProviderCredentialStatus {
                    status: "ready".to_string(),
                    source: profile.credential_source.clone(),
                    message: "Kalshi API Key ID and app-managed local key material are available to Tauri."
                        .to_string(),
                    reasons: Vec::new(),
                    masked_identifier: Some(mask_identifier(api_key_id)),
                    checked_at: now_iso(),
                },
                Err(reason) => ProviderCredentialStatus {
                    status: "invalid".to_string(),
                    source: profile.credential_source.clone(),
                    message: "Kalshi app-managed key material failed validation.".to_string(),
                    reasons: vec![reason],
                    masked_identifier: Some(mask_identifier(api_key_id)),
                    checked_at: now_iso(),
                },
            }
        }
        _ => ProviderCredentialStatus {
            status: "blocked".to_string(),
            source: profile.credential_source.clone(),
            message: "Provider is not supported by the credential profile validator.".to_string(),
            reasons: vec!["provider_not_supported".to_string()],
            masked_identifier: None,
            checked_at: now_iso(),
        },
    }
}

fn account_metrics_status_for_provider(
    provider_id: &str,
    market_id: Option<&str>,
) -> ProviderAccountMetricsStatus {
    account_metrics_status_for_provider_with_diagnostics(provider_id, market_id, false)
}

fn account_metrics_status_for_provider_with_diagnostics(
    provider_id: &str,
    market_id: Option<&str>,
    include_diagnostics: bool,
) -> ProviderAccountMetricsStatus {
    let runtime = provider_account_metrics_runtime_for(provider_id);
    account_metrics_status_for_provider_with_runtime_and_diagnostics(
        provider_id,
        market_id,
        &runtime,
        include_diagnostics,
    )
}

fn account_metrics_status_for_provider_with_runtime_and_diagnostics(
    provider_id: &str,
    market_id: Option<&str>,
    runtime: &dyn ProviderAccountMetricsRuntime,
    include_diagnostics: bool,
) -> ProviderAccountMetricsStatus {
    let credential = credential_status_for_provider(provider_id);
    account_metrics_status_for_provider_with_runtime_and_credential(
        provider_id,
        market_id,
        runtime,
        &credential,
        include_diagnostics,
    )
}

fn account_metrics_status_for_provider_with_runtime_and_credential(
    provider_id: &str,
    market_id: Option<&str>,
    runtime: &dyn ProviderAccountMetricsRuntime,
    credential: &ProviderCredentialStatus,
    include_diagnostics: bool,
) -> ProviderAccountMetricsStatus {
    if credential.status != "ready" {
        return ProviderAccountMetricsStatus {
            status: "missing".to_string(),
            source: "provider_owned_account_metrics".to_string(),
            message: format!(
                "{} account metrics require a ready Tauri-owned credential profile.",
                live_provider_label(provider_id)
            ),
            reasons: vec!["credentials_missing".to_string()],
            checked_at: now_iso(),
            available_funds: None,
            provider_exposure: None,
            market_exposure: None,
            open_order_amount: None,
            position_exposure: None,
            public_portfolio_value: None,
            account_candidates: Vec::new(),
        };
    }

    let diagnostics = account_metrics_diagnostics_for_provider(provider_id, include_diagnostics);

    let Some(market_id) = market_id else {
        return ProviderAccountMetricsStatus {
            status: "missing".to_string(),
            source: "provider_owned_account_metrics".to_string(),
            message:
                "A selected provider market is required before account metrics can be matched."
                    .to_string(),
            reasons: vec!["account_metrics_market_not_selected".to_string()],
            checked_at: now_iso(),
            available_funds: None,
            provider_exposure: None,
            market_exposure: None,
            open_order_amount: None,
            position_exposure: None,
            public_portfolio_value: diagnostics.public_portfolio_value,
            account_candidates: diagnostics.account_candidates,
        };
    };

    let request = account_metrics_preflight_request(provider_id, market_id);

    match load_tauri_owned_account_metrics_for_request_with_runtime(&request, runtime) {
        Ok(metrics) => {
            let source = if account_metrics_source_ready()
                && !provider_account_metrics_runtime_configured(provider_id)
            {
                "local_file_dev_only"
            } else {
                "provider_owned_account_metrics"
            };
            ProviderAccountMetricsStatus {
                status: "ready".to_string(),
                source: source.to_string(),
                message: if source == "local_file_dev_only" {
                    "Account metrics were loaded by the Tauri-owned local dev/smoke fallback."
                        .to_string()
                } else {
                    format!(
                        "{} authenticated account metrics were loaded by the Tauri-owned provider adapter.",
                        live_provider_label(provider_id)
                    )
                },
                reasons: Vec::new(),
                checked_at: now_iso(),
                available_funds: Some(metric_amount(
                    metrics.available_funds,
                    provider_currency(provider_id),
                )),
                provider_exposure: Some(metric_amount(
                    metrics.provider_exposure,
                    provider_currency(provider_id),
                )),
                market_exposure: Some(metric_amount(
                    metrics.market_exposure,
                    provider_currency(provider_id),
                )),
                open_order_amount: Some(metric_amount(
                    metrics.open_order_amount,
                    provider_currency(provider_id),
                )),
                position_exposure: Some(metric_amount(
                    metrics.position_exposure,
                    provider_currency(provider_id),
                )),
                public_portfolio_value: diagnostics.public_portfolio_value.clone(),
                account_candidates: diagnostics.account_candidates.clone(),
            }
        }
        Err(reason) => ProviderAccountMetricsStatus {
            status: "missing".to_string(),
            source: "provider_owned_account_metrics".to_string(),
            message: format!(
                "{} account metrics are not ready: {}.",
                live_provider_label(provider_id),
                reason
            ),
            reasons: vec![reason],
            checked_at: now_iso(),
            available_funds: None,
            provider_exposure: None,
            market_exposure: None,
            open_order_amount: None,
            position_exposure: None,
            public_portfolio_value: diagnostics.public_portfolio_value,
            account_candidates: diagnostics.account_candidates,
        },
    }
}

fn account_metrics_preflight_request(provider_id: &str, market_id: &str) -> LiveOrderSubmitRequest {
    LiveOrderSubmitRequest {
        provider_id: provider_id.to_string(),
        market_id: market_id.to_string(),
        outcome_id: "preflight".to_string(),
        side: "BUY".to_string(),
        order_type: "limit".to_string(),
        time_in_force: "GTC".to_string(),
        price: "1".to_string(),
        stake_amount: "1".to_string(),
        stake_currency: provider_currency(provider_id).to_string(),
        quantity: "1".to_string(),
        marketable: false,
        explicit_live_ack: true,
        audit_log_enabled: true,
        kill_switch_active: false,
        selected_market: true,
        order_book_freshness: "fresh".to_string(),
        max_stake_per_order: "1".to_string(),
        max_market_exposure: "1".to_string(),
        min_order_size: None,
        available_funds: None,
        provider_exposure: None,
        market_exposure: None,
    }
}

fn account_metrics_diagnostics_for_provider(
    provider_id: &str,
    include_diagnostics: bool,
) -> ProviderAccountMetricsDiagnostics {
    if !include_diagnostics || provider_id != "polymarket" {
        return ProviderAccountMetricsDiagnostics::default();
    }

    let account_candidates =
        polymarket_account_candidates_for_local_profile().unwrap_or_else(|_| Vec::new());
    let public_portfolio_value = account_candidates
        .iter()
        .find(|candidate| candidate.configured)
        .and_then(|candidate| candidate.public_portfolio_value.clone());

    ProviderAccountMetricsDiagnostics {
        public_portfolio_value,
        account_candidates,
    }
}

#[cfg(test)]
fn polymarket_account_candidates_for_local_profile(
) -> Result<Vec<ProviderAccountCandidateStatus>, String> {
    Ok(Vec::new())
}

#[cfg(not(test))]
fn polymarket_account_candidates_for_local_profile(
) -> Result<Vec<ProviderAccountCandidateStatus>, String> {
    let profile = load_local_secure_provider_profile("polymarket")?
        .ok_or_else(|| "credential_profile_missing".to_string())?;
    let signature_type_label = profile
        .polymarket_signature_type
        .as_deref()
        .ok_or_else(|| "polymarket_signature_type_missing".to_string())?;
    let signature_type = parse_polymarket_signature_type(signature_type_label)?;
    let configured_funder = parse_polymarket_trading_address(
        profile.polymarket_trading_address.as_deref(),
        signature_type,
    )?;
    let signer_material = load_polymarket_signer_material_from_profile(&profile)?;
    let signer = parse_polymarket_local_signer_material(signer_material.trim())
        .map_err(|_| "polymarket_local_signer_file_invalid".to_string())?;
    let imported_address_candidates = parse_polymarket_imported_address_candidates(
        &profile.polymarket_imported_address_candidates,
    );
    let clob_host =
        env::var("POLYMARKET_CLOB_URL").unwrap_or_else(|_| POLYMARKET_CLOB_BASE_URL.to_string());
    let data_api_host = env::var("POLYMARKET_DATA_API_URL")
        .unwrap_or_else(|_| POLYMARKET_DATA_API_BASE_URL.to_string());

    let mut candidates: Vec<ProviderAccountCandidateStatus> = polymarket_account_candidate_specs(
        signer.address(),
        configured_funder,
        signature_type,
        &imported_address_candidates,
    )
    .into_iter()
    .map(|candidate| {
        let public_value = tauri::async_runtime::block_on(load_polymarket_public_portfolio_value(
            &data_api_host,
            &candidate.address.to_string(),
        ));
        let trade_ready_cash =
            tauri::async_runtime::block_on(load_polymarket_candidate_trade_ready_cash(
                &clob_host,
                signer_material.trim(),
                &candidate,
            ));
        let (status, reasons, public_portfolio_value) = match public_value {
            Ok(value) => (
                "ready".to_string(),
                Vec::new(),
                Some(metric_amount(
                    value.to_string(),
                    provider_currency("polymarket"),
                )),
            ),
            Err(reason) => ("unknown".to_string(), vec![reason], None),
        };
        let (trade_ready_cash_status, trade_ready_cash_reasons, trade_ready_cash) =
            match trade_ready_cash {
                Ok(value) => (
                    Some("ready".to_string()),
                    Vec::new(),
                    Some(metric_amount(
                        value.to_string(),
                        provider_currency("polymarket"),
                    )),
                ),
                Err(error) => (
                    Some("unknown".to_string()),
                    vec![polymarket_candidate_trade_ready_cash_reason(&error).to_string()],
                    None,
                ),
            };

        ProviderAccountCandidateStatus {
            label: candidate.label,
            signature_type: polymarket_signature_type_label(candidate.signature_type).to_string(),
            configured: candidate.configured,
            masked_identifier: mask_identifier(&candidate.address.to_string()),
            status,
            reasons,
            public_portfolio_value,
            trade_ready_cash,
            trade_ready_cash_status,
            trade_ready_cash_reasons,
            recommended: false,
            recommendation_reason: None,
        }
    })
    .collect();
    mark_recommended_polymarket_account_candidate(&mut candidates);

    Ok(candidates)
}

fn mark_recommended_polymarket_account_candidate(
    candidates: &mut [ProviderAccountCandidateStatus],
) {
    if mark_recommended_polymarket_account_candidate_by_metric(
        candidates,
        polymarket_candidate_trade_ready_cash_decimal,
        "trade_ready_cash_higher_than_configured",
    ) {
        return;
    }

    mark_recommended_polymarket_account_candidate_by_metric(
        candidates,
        polymarket_candidate_public_portfolio_decimal,
        "public_portfolio_value_higher_than_configured",
    );
}

fn mark_recommended_polymarket_account_candidate_by_metric(
    candidates: &mut [ProviderAccountCandidateStatus],
    metric: fn(&ProviderAccountCandidateStatus) -> Option<Decimal>,
    recommendation_reason: &str,
) -> bool {
    let configured_value = candidates
        .iter()
        .filter(|candidate| candidate.configured)
        .filter_map(metric)
        .max()
        .unwrap_or(Decimal::ZERO);
    let mut best: Option<(usize, Decimal)> = None;
    let mut ambiguous_best = false;

    for (index, candidate) in candidates.iter().enumerate() {
        if candidate.configured {
            continue;
        }

        let Some(value) = metric(candidate) else {
            continue;
        };
        if value <= Decimal::ZERO || value <= configured_value {
            continue;
        }

        match best {
            Some((_, best_value)) if value == best_value => ambiguous_best = true,
            Some((_, best_value)) if value < best_value => {}
            _ => {
                best = Some((index, value));
                ambiguous_best = false;
            }
        }
    }

    if ambiguous_best {
        return false;
    }

    if let Some((index, _)) = best {
        if let Some(candidate) = candidates.get_mut(index) {
            candidate.recommended = true;
            candidate.recommendation_reason = Some(recommendation_reason.to_string());
            return true;
        }
    }

    false
}

fn polymarket_candidate_trade_ready_cash_decimal(
    candidate: &ProviderAccountCandidateStatus,
) -> Option<Decimal> {
    candidate
        .trade_ready_cash
        .as_ref()
        .and_then(|value| parse_non_negative_provider_decimal(&value.amount))
}

fn polymarket_candidate_public_portfolio_decimal(
    candidate: &ProviderAccountCandidateStatus,
) -> Option<Decimal> {
    candidate
        .public_portfolio_value
        .as_ref()
        .and_then(|value| parse_non_negative_provider_decimal(&value.amount))
}

fn is_false(value: &bool) -> bool {
    !*value
}

fn parse_polymarket_imported_address_candidates(values: &[String]) -> Vec<Address> {
    let mut candidates = Vec::new();

    for value in values {
        if candidates.len() >= 8 {
            break;
        }

        let Ok(address) = Address::from_str(value.trim()) else {
            continue;
        };
        if address == Address::ZERO || candidates.contains(&address) {
            continue;
        }

        candidates.push(address);
    }

    candidates
}

fn polymarket_account_candidate_specs(
    signer_address: Address,
    configured_funder: Option<Address>,
    configured_signature_type: PolymarketSignatureType,
    imported_address_candidates: &[Address],
) -> Vec<PolymarketAccountCandidateSpec> {
    let mut candidates = Vec::new();

    if let Some(address) = configured_funder {
        push_polymarket_account_candidate_spec(
            &mut candidates,
            "configured_funder",
            configured_signature_type,
            address,
            true,
        );
    }

    push_polymarket_account_candidate_spec(
        &mut candidates,
        "signer_eoa",
        PolymarketSignatureType::Eoa,
        signer_address,
        configured_funder.is_none() && configured_signature_type == PolymarketSignatureType::Eoa,
    );

    let derived_proxy = polymarket_client_sdk_v2::derive_proxy_wallet(signer_address, POLYGON);
    if let Some(address) = derived_proxy {
        push_polymarket_account_candidate_spec(
            &mut candidates,
            "sdk_proxy",
            PolymarketSignatureType::Proxy,
            address,
            configured_funder == Some(address)
                && configured_signature_type == PolymarketSignatureType::Proxy,
        );
    }

    let derived_safe = polymarket_client_sdk_v2::derive_safe_wallet(signer_address, POLYGON);
    if let Some(address) = derived_safe {
        push_polymarket_account_candidate_spec(
            &mut candidates,
            "sdk_safe",
            PolymarketSignatureType::GnosisSafe,
            address,
            configured_funder == Some(address)
                && configured_signature_type == PolymarketSignatureType::GnosisSafe,
        );
    }

    if let Ok(deposit_wallets) = derive_polymarket_deposit_wallet_candidates(signer_address) {
        for candidate in deposit_wallets {
            push_polymarket_account_candidate_spec(
                &mut candidates,
                candidate.label,
                PolymarketSignatureType::Poly1271,
                candidate.address,
                configured_funder == Some(candidate.address)
                    && configured_signature_type == PolymarketSignatureType::Poly1271,
            );
        }
    }

    let mut imported_candidate_index = 1usize;
    let has_multiple_imported_candidates = imported_address_candidates.len() > 1;
    for address in imported_address_candidates {
        if *address == signer_address
            || Some(*address) == derived_proxy
            || Some(*address) == derived_safe
        {
            continue;
        }

        let label = if has_multiple_imported_candidates {
            let label = format!("magic_export_deposit_wallet_{imported_candidate_index}");
            imported_candidate_index += 1;
            label
        } else {
            "magic_export_deposit_wallet".to_string()
        };

        push_polymarket_account_candidate_spec(
            &mut candidates,
            &label,
            PolymarketSignatureType::Poly1271,
            *address,
            configured_funder == Some(*address)
                && configured_signature_type == PolymarketSignatureType::Poly1271,
        );
    }

    candidates
}

fn push_polymarket_account_candidate_spec(
    candidates: &mut Vec<PolymarketAccountCandidateSpec>,
    label: &str,
    signature_type: PolymarketSignatureType,
    address: Address,
    configured: bool,
) {
    if let Some(existing) = candidates.iter_mut().find(|candidate| {
        candidate.signature_type == signature_type && candidate.address == address
    }) {
        if !existing
            .label
            .split('+')
            .any(|existing_label| existing_label == label)
        {
            existing.label.push('+');
            existing.label.push_str(label);
        }
        existing.configured |= configured;
        return;
    }

    candidates.push(PolymarketAccountCandidateSpec {
        label: label.to_string(),
        signature_type,
        address,
        configured,
    });
}

struct PolymarketDerivedDepositWalletCandidate {
    label: &'static str,
    address: Address,
}

fn derive_polymarket_deposit_wallet_candidates(
    owner: Address,
) -> Result<Vec<PolymarketDerivedDepositWalletCandidate>, String> {
    let factory = Address::from_str(POLYMARKET_DEPOSIT_WALLET_FACTORY_POLYGON)
        .map_err(|_| "polymarket_deposit_wallet_factory_invalid".to_string())?;
    let implementation = Address::from_str(POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION_POLYGON)
        .map_err(|_| "polymarket_deposit_wallet_implementation_invalid".to_string())?;
    let uups = derive_polymarket_uups_deposit_wallet(owner, factory, implementation)?;
    let mut candidates = Vec::new();
    candidates.push(PolymarketDerivedDepositWalletCandidate {
        label: "derived_deposit_wallet_uups",
        address: uups,
    });

    #[cfg(not(test))]
    if let Ok(Some(beacon)) = fetch_polymarket_deposit_wallet_factory_beacon(factory) {
        candidates.push(PolymarketDerivedDepositWalletCandidate {
            label: "derived_deposit_wallet_beacon",
            address: derive_polymarket_beacon_deposit_wallet(owner, factory, beacon)?,
        });
    }

    Ok(candidates)
}

fn derive_polymarket_uups_deposit_wallet(
    owner: Address,
    factory: Address,
    implementation: Address,
) -> Result<Address, String> {
    let args = polymarket_deposit_wallet_args(owner, factory);
    let salt = keccak256(&args);
    let init_code_hash = polymarket_init_code_hash_erc1967(implementation, &args)?;
    Ok(factory.create2(salt, init_code_hash))
}

#[cfg(not(test))]
fn derive_polymarket_beacon_deposit_wallet(
    owner: Address,
    factory: Address,
    beacon: Address,
) -> Result<Address, String> {
    let args = polymarket_deposit_wallet_args(owner, factory);
    let salt = keccak256(&args);
    let init_code_hash = polymarket_init_code_hash_erc1967_beacon(beacon, &args)?;
    Ok(factory.create2(salt, init_code_hash))
}

fn polymarket_deposit_wallet_args(owner: Address, factory: Address) -> Vec<u8> {
    let mut args = Vec::with_capacity(64);
    args.extend_from_slice(&address_left_padded_32(factory));
    args.extend_from_slice(&address_left_padded_32(owner));
    args
}

fn address_left_padded_32(address: Address) -> [u8; 32] {
    let mut padded = [0u8; 32];
    padded[12..].copy_from_slice(address.as_slice());
    padded
}

fn polymarket_init_code_hash_erc1967(implementation: Address, args: &[u8]) -> Result<B256, String> {
    const ERC1967_CONST1: &str =
        "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3";
    const ERC1967_CONST2: &str =
        "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076";
    const ERC1967_PREFIX: u128 = 0x61003d3d8160233d3973;

    let n = args.len() as u128;
    let combined = ERC1967_PREFIX + (n << 56);
    let mut init_code = Vec::new();
    init_code.extend_from_slice(&combined.to_be_bytes()[6..]);
    init_code.extend_from_slice(implementation.as_slice());
    init_code.extend_from_slice(&[0x60, 0x09]);
    init_code.extend_from_slice(&parse_hex_bytes(ERC1967_CONST2)?);
    init_code.extend_from_slice(&parse_hex_bytes(ERC1967_CONST1)?);
    init_code.extend_from_slice(args);
    Ok(keccak256(init_code))
}

#[cfg(not(test))]
fn polymarket_init_code_hash_erc1967_beacon(beacon: Address, args: &[u8]) -> Result<B256, String> {
    const ERC1967_BEACON_CONST1: &str =
        "0xb3582b35133d50545afa5036515af43d6000803e604d573d6000fd5b3d6000f3";
    const ERC1967_BEACON_CONST2: &str =
        "0x1b60e01b36527fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6c";
    const ERC1967_BEACON_CONST3: &str = "0x60195155f3363d3d373d3d363d602036600436635c60da";
    const ERC1967_BEACON_PREFIX: u128 = 0x6100523d8160233d3973;

    let n = args.len() as u128;
    let combined = ERC1967_BEACON_PREFIX + (n << 56);
    let mut init_code = Vec::new();
    init_code.extend_from_slice(&combined.to_be_bytes()[6..]);
    init_code.extend_from_slice(beacon.as_slice());
    init_code.extend_from_slice(&parse_hex_bytes(ERC1967_BEACON_CONST3)?);
    init_code.extend_from_slice(&parse_hex_bytes(ERC1967_BEACON_CONST2)?);
    init_code.extend_from_slice(&parse_hex_bytes(ERC1967_BEACON_CONST1)?);
    init_code.extend_from_slice(args);
    Ok(keccak256(init_code))
}

#[cfg(not(test))]
fn fetch_polymarket_deposit_wallet_factory_beacon(
    factory: Address,
) -> Result<Option<Address>, String> {
    let response = std::thread::spawn(move || {
        tauri::async_runtime::block_on(async move {
            let client = HttpClient::builder()
                .timeout(PROVIDER_REQUEST_TIMEOUT)
                .build()
                .map_err(|_| "polymarket_deposit_wallet_rpc_client_failed".to_string())?;
            let payload = serde_json::json!({
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_call",
                "params": [
                    {
                        "to": factory.to_string(),
                        "data": POLYMARKET_DEPOSIT_WALLET_BEACON_SELECTOR
                    },
                    "latest"
                ]
            });
            let response = client
                .post("https://polygon-rpc.com")
                .json(&payload)
                .send()
                .await
                .map_err(|_| "polymarket_deposit_wallet_rpc_failed".to_string())?;
            response
                .json::<Value>()
                .await
                .map_err(|_| "polymarket_deposit_wallet_rpc_malformed".to_string())
        })
    })
    .join()
    .map_err(|_| "polymarket_deposit_wallet_rpc_failed".to_string())??;
    let Some(result) = response.get("result").and_then(Value::as_str) else {
        return Ok(None);
    };
    let Some(beacon_hex) = result.get(result.len().saturating_sub(40)..) else {
        return Ok(None);
    };
    let beacon = Address::from_str(&format!("0x{beacon_hex}"))
        .map_err(|_| "polymarket_deposit_wallet_beacon_invalid".to_string())?;
    if beacon == Address::ZERO {
        Ok(None)
    } else {
        Ok(Some(beacon))
    }
}

fn parse_hex_bytes(value: &str) -> Result<Vec<u8>, String> {
    let hex = value.strip_prefix("0x").unwrap_or(value);
    if hex.len() % 2 != 0 {
        return Err("hex_invalid".to_string());
    }

    let mut bytes = Vec::with_capacity(hex.len() / 2);
    for index in (0..hex.len()).step_by(2) {
        let byte = u8::from_str_radix(&hex[index..index + 2], 16)
            .map_err(|_| "hex_invalid".to_string())?;
        bytes.push(byte);
    }

    Ok(bytes)
}

fn metric_amount(amount: String, currency: &str) -> ProviderMetricAmount {
    ProviderMetricAmount {
        amount,
        currency: currency.to_string(),
    }
}

fn load_local_approval_gate(provider_id: &str) -> Result<LocalApprovalGateFile, String> {
    let approval_path = local_approval_gate_path();
    let contents =
        fs::read_to_string(&approval_path).map_err(|_| "local_approval_missing".to_string())?;
    let approval: LocalApprovalGateFile =
        serde_json::from_str(&contents).map_err(|_| "local_approval_malformed".to_string())?;

    if approval.provider_id != provider_id {
        return Err("local_approval_provider_mismatch".to_string());
    }

    Ok(approval)
}

fn save_local_approval_gate(approval: &LocalApprovalGateFile) -> Result<(), String> {
    let approval_path = local_approval_gate_path();
    if let Some(parent) = approval_path.parent() {
        fs::create_dir_all(parent).map_err(|_| "local_approval_write_failed".to_string())?;
    }

    let contents = serde_json::to_string_pretty(approval)
        .map_err(|_| "local_approval_write_failed".to_string())?;
    fs::write(&approval_path, contents).map_err(|_| "local_approval_write_failed".to_string())
}

fn local_approval_gate_path() -> PathBuf {
    #[cfg(test)]
    if let Some(path) =
        TEST_LOCAL_APPROVAL_GATE_PATH.with(|approval_path| approval_path.borrow().clone())
    {
        return path;
    }

    env::var(LEGAL_APPROVAL_FILE_VAR)
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(LEGAL_APPROVAL_DEFAULT_FILE))
}

fn load_tauri_owned_account_metrics_for_request(
    request: &LiveOrderSubmitRequest,
) -> Result<TauriOwnedAccountMetrics, String> {
    let runtime = provider_account_metrics_runtime_for(&request.provider_id);
    load_tauri_owned_account_metrics_for_request_with_runtime(request, &runtime)
}

fn load_tauri_owned_account_metrics_for_request_with_runtime(
    request: &LiveOrderSubmitRequest,
    runtime: &dyn ProviderAccountMetricsRuntime,
) -> Result<TauriOwnedAccountMetrics, String> {
    match runtime.load_account_metrics(request) {
        ProviderAccountMetricsRuntimeResult::Ready(metrics) => return Ok(metrics),
        ProviderAccountMetricsRuntimeResult::Rejected { reason, .. } => return Err(reason),
        ProviderAccountMetricsRuntimeResult::NetworkError { .. } => {
            return Err("account_metrics_network_error".to_string());
        }
        ProviderAccountMetricsRuntimeResult::Unavailable { reason, .. } => {
            if !account_metrics_source_ready() {
                return Err(reason);
            }
        }
    }

    let metrics_path = env::var(LOCAL_ACCOUNT_METRICS_FILE_VAR)
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(LOCAL_ACCOUNT_METRICS_DEFAULT_FILE));
    load_tauri_owned_account_metrics_from_path(request, &metrics_path)
}

fn load_tauri_owned_account_metrics_from_path(
    request: &LiveOrderSubmitRequest,
    metrics_path: &PathBuf,
) -> Result<TauriOwnedAccountMetrics, String> {
    let contents = fs::read_to_string(&metrics_path)
        .map_err(|_| "account_metrics_values_source_missing".to_string())?;
    let metrics: LocalAccountMetricsFile = serde_json::from_str(&contents)
        .map_err(|_| "account_metrics_values_malformed".to_string())?;

    if metrics.provider_id != request.provider_id {
        return Err("account_metrics_provider_mismatch".to_string());
    }

    if metrics.market_id != request.market_id {
        return Err("account_metrics_market_mismatch".to_string());
    }

    if !account_metrics_captured_at_fresh(&metrics.captured_at) {
        return Err("account_metrics_values_stale".to_string());
    }

    Ok(TauriOwnedAccountMetrics {
        available_funds: metrics.available_funds,
        provider_exposure: metrics.provider_exposure,
        market_exposure: metrics.market_exposure,
        open_order_amount: metrics.open_order_amount.unwrap_or_else(|| "0".to_string()),
        position_exposure: metrics.position_exposure.unwrap_or_else(|| "0".to_string()),
    })
}

fn local_secure_provider_profile_path() -> PathBuf {
    #[cfg(test)]
    if let Some(path) =
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|profile_path| profile_path.borrow().clone())
    {
        return path;
    }

    if let Ok(path) = env::var(LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR) {
        return PathBuf::from(path);
    }

    if let Ok(app_data) = env::var("APPDATA") {
        return PathBuf::from(app_data)
            .join("Prediction Ladder")
            .join("secure-provider")
            .join("credentials.local.json");
    }

    PathBuf::from(LOCAL_SECURE_PROVIDER_PROFILE_DEFAULT_FILE)
}

fn app_managed_credential_material_path(provider_id: &str, material_kind: &str) -> PathBuf {
    let profile_path = local_secure_provider_profile_path();
    let directory = profile_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from(".local"));

    directory.join(format!(
        "{provider_id}-{material_kind}.credential.local.json"
    ))
}

fn load_local_secure_provider_profiles() -> Result<LocalSecureProviderProfileFile, String> {
    let profile_path = local_secure_provider_profile_path();
    if !profile_path.exists() {
        return Ok(LocalSecureProviderProfileFile::default());
    }

    let contents = fs::read_to_string(&profile_path)
        .map_err(|_| "credential_profile_unreadable".to_string())?;
    serde_json::from_str(&contents).map_err(|_| "credential_profile_malformed".to_string())
}

fn load_local_secure_provider_profile(
    provider_id: &str,
) -> Result<Option<LocalSecureProviderProfile>, String> {
    Ok(load_local_secure_provider_profiles()?
        .profiles
        .into_iter()
        .find(|profile| profile.provider_id == provider_id))
}

fn save_local_secure_provider_profile(profile: LocalSecureProviderProfile) -> Result<(), String> {
    let profile_path = local_secure_provider_profile_path();
    let mut profiles = load_local_secure_provider_profiles()?;
    profiles
        .profiles
        .retain(|existing| existing.provider_id != profile.provider_id);
    profiles.profiles.push(profile);

    if let Some(parent) = profile_path.parent() {
        fs::create_dir_all(parent).map_err(|_| "credential_profile_write_failed".to_string())?;
    }

    let serialized = serde_json::to_string_pretty(&profiles)
        .map_err(|_| "credential_profile_write_failed".to_string())?;
    fs::write(profile_path, serialized).map_err(|_| "credential_profile_write_failed".to_string())
}

fn save_app_managed_credential_material(
    provider_id: &str,
    material_kind: &str,
    material: &str,
) -> Result<(), String> {
    let encrypted = protect_local_credential_material(material)?;
    let envelope = AppManagedCredentialEnvelope {
        version: 1,
        provider_id: provider_id.to_string(),
        material_kind: material_kind.to_string(),
        protection: APP_MANAGED_SECRET_PROTECTION_WINDOWS.to_string(),
        ciphertext: BASE64_STANDARD.encode(encrypted),
    };
    let path = app_managed_credential_material_path(provider_id, material_kind);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| "credential_material_write_failed".to_string())?;
    }

    let serialized = serde_json::to_string_pretty(&envelope)
        .map_err(|_| "credential_material_write_failed".to_string())?;
    fs::write(path, serialized).map_err(|_| "credential_material_write_failed".to_string())
}

fn load_app_managed_credential_material(
    provider_id: &str,
    material_kind: &str,
) -> Result<String, String> {
    let path = app_managed_credential_material_path(provider_id, material_kind);
    let contents =
        fs::read_to_string(path).map_err(|_| "credential_material_missing".to_string())?;
    let envelope: AppManagedCredentialEnvelope =
        serde_json::from_str(&contents).map_err(|_| "credential_material_malformed".to_string())?;

    if envelope.version != 1
        || envelope.provider_id != provider_id
        || envelope.material_kind != material_kind
        || envelope.protection != APP_MANAGED_SECRET_PROTECTION_WINDOWS
    {
        return Err("credential_material_malformed".to_string());
    }

    let encrypted = BASE64_STANDARD
        .decode(envelope.ciphertext.as_bytes())
        .map_err(|_| "credential_material_malformed".to_string())?;
    let decrypted = unprotect_local_credential_material(&encrypted)?;
    String::from_utf8(decrypted).map_err(|_| "credential_material_malformed".to_string())
}

#[cfg(windows)]
fn protect_local_credential_material(material: &str) -> Result<Vec<u8>, String> {
    let bytes = material.as_bytes();
    let mut input = CRYPT_INTEGER_BLOB {
        cbData: bytes.len() as u32,
        pbData: bytes.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let result = unsafe {
        CryptProtectData(
            &mut input,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if result == 0 {
        return Err("credential_secure_storage_unavailable".to_string());
    }

    let protected =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        let _ = LocalFree(output.pbData.cast());
    }

    Ok(protected)
}

#[cfg(not(windows))]
fn protect_local_credential_material(_material: &str) -> Result<Vec<u8>, String> {
    Err("credential_secure_storage_unavailable".to_string())
}

#[cfg(windows)]
fn unprotect_local_credential_material(encrypted: &[u8]) -> Result<Vec<u8>, String> {
    let mut input = CRYPT_INTEGER_BLOB {
        cbData: encrypted.len() as u32,
        pbData: encrypted.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    let result = unsafe {
        CryptUnprotectData(
            &mut input,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
    };

    if result == 0 {
        return Err("credential_secure_storage_unavailable".to_string());
    }

    let unprotected =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        let _ = LocalFree(output.pbData.cast());
    }

    Ok(unprotected)
}

#[cfg(not(windows))]
fn unprotect_local_credential_material(_encrypted: &[u8]) -> Result<Vec<u8>, String> {
    Err("credential_secure_storage_unavailable".to_string())
}

#[cfg(windows)]
struct ClipboardSession;

#[cfg(windows)]
impl Drop for ClipboardSession {
    fn drop(&mut self) {
        unsafe {
            CloseClipboard();
        }
    }
}

#[cfg(windows)]
fn open_clipboard_session() -> Result<ClipboardSession, String> {
    let opened = unsafe { OpenClipboard(std::ptr::null_mut()) };

    if opened == 0 {
        return Err("credential_clipboard_unavailable".to_string());
    }

    Ok(ClipboardSession)
}

#[cfg(windows)]
fn read_os_clipboard_text() -> Result<String, String> {
    let _session = open_clipboard_session()?;
    let handle = unsafe { GetClipboardData(WINDOWS_CLIPBOARD_UNICODE_TEXT_FORMAT) };

    if handle.is_null() {
        return Err("polymarket_clipboard_signer_missing".to_string());
    }

    let locked = unsafe { GlobalLock(handle) };

    if locked.is_null() {
        return Err("credential_clipboard_unavailable".to_string());
    }

    let wide = locked.cast::<u16>();
    let mut len = 0usize;
    unsafe {
        while *wide.add(len) != 0 {
            len += 1;

            if len > 4096 {
                let _ = GlobalUnlock(handle);
                return Err("polymarket_clipboard_signer_invalid".to_string());
            }
        }
    }

    let value = unsafe {
        let slice = std::slice::from_raw_parts(wide, len);
        String::from_utf16(slice).map_err(|_| "credential_clipboard_invalid_utf16".to_string())
    };

    unsafe {
        let _ = GlobalUnlock(handle);
    }

    value
}

#[cfg(not(windows))]
fn read_os_clipboard_text() -> Result<String, String> {
    Err("credential_clipboard_unavailable".to_string())
}

#[cfg(windows)]
fn clear_os_clipboard_text() -> Result<(), String> {
    let _session = open_clipboard_session()?;
    let cleared = unsafe { EmptyClipboard() };

    if cleared == 0 {
        return Err("credential_clipboard_clear_failed".to_string());
    }

    Ok(())
}

#[cfg(not(windows))]
fn clear_os_clipboard_text() -> Result<(), String> {
    Err("credential_clipboard_unavailable".to_string())
}

fn load_and_validate_polymarket_signer_file(path: &Path) -> Result<String, String> {
    let material =
        fs::read_to_string(path).map_err(|_| "polymarket_local_signer_file_missing".to_string())?;
    normalize_polymarket_signer_material(
        &material,
        "polymarket_local_signer_file_missing",
        "polymarket_local_signer_file_invalid",
    )
}

fn validate_polymarket_signer_material(material: &str) -> Result<(), String> {
    normalize_polymarket_signer_material(
        material,
        "polymarket_local_signer_file_missing",
        "polymarket_local_signer_file_invalid",
    )
    .map(|_| ())
}

fn normalize_polymarket_signer_material(
    material: &str,
    missing_reason: &str,
    invalid_reason: &str,
) -> Result<String, String> {
    let trimmed = material.trim();

    if trimmed.is_empty() {
        return Err(missing_reason.to_string());
    }

    if looks_like_seed_phrase(trimmed) {
        return Err("seed_phrase_not_allowed".to_string());
    }

    if parse_polymarket_local_signer_material(trimmed).is_ok() {
        return Ok(trimmed.to_string());
    }

    if let Some(candidate) = extract_first_private_key_candidate(trimmed) {
        if parse_polymarket_local_signer_material(&candidate).is_ok() {
            return Ok(candidate);
        }
    }

    Err(invalid_reason.to_string())
}

fn extract_polymarket_public_address_candidates(value: &str) -> Vec<Address> {
    let bytes = value.as_bytes();
    let mut candidates = Vec::new();
    let mut index = 0usize;

    while index + 42 <= bytes.len() {
        if bytes[index] != b'0' || !matches!(bytes[index + 1], b'x' | b'X') {
            index += 1;
            continue;
        }

        let hex_start = index + 2;
        let mut hex_end = hex_start;
        while hex_end < bytes.len() && bytes[hex_end].is_ascii_hexdigit() {
            hex_end += 1;
        }

        let hex_len = hex_end - hex_start;
        if hex_len == 40 {
            let candidate = format!("0x{}", &value[hex_start..hex_end]);
            if let Ok(address) = Address::from_str(&candidate) {
                if address != Address::ZERO && !candidates.contains(&address) {
                    candidates.push(address);
                }
            }
        }

        if candidates.len() >= 8 {
            break;
        }
        index = hex_end.max(index + 1);
    }

    candidates
}

fn extract_first_private_key_candidate(value: &str) -> Option<String> {
    let bytes = value.as_bytes();

    for index in 0..bytes.len().saturating_sub(65) {
        if bytes[index] != b'0' || !matches!(bytes[index + 1], b'x' | b'X') {
            continue;
        }

        let end = index + 66;
        if bytes[index + 2..end]
            .iter()
            .all(|byte| byte.is_ascii_hexdigit())
        {
            return Some(value[index..end].to_string());
        }
    }

    None
}

fn validate_kalshi_key_file(path: &Path) -> Result<(), String> {
    load_and_validate_kalshi_key_file(path).map(|_| ())
}

fn load_and_validate_kalshi_key_file(path: &Path) -> Result<String, String> {
    let material = fs::read_to_string(path).map_err(|_| "kalshi_key_file_missing".to_string())?;
    validate_kalshi_key_material(&material).map_err(str::to_string)?;
    Ok(material)
}

fn validate_kalshi_key_material(material: &str) -> Result<(), &'static str> {
    let normalized = material.trim();

    if normalized.is_empty() {
        return Err("kalshi_key_file_missing");
    }

    if looks_like_seed_phrase(normalized) {
        return Err("seed_phrase_not_allowed");
    }

    if normalized.contains("ENCRYPTED PRIVATE KEY") {
        return Err("kalshi_key_file_encrypted_passphrase_not_supported");
    }

    if !normalized.contains("BEGIN") || !normalized.contains("PRIVATE KEY") {
        return Err("kalshi_key_file_invalid");
    }

    parse_kalshi_private_key(normalized).map_err(|_| "kalshi_key_file_invalid")?;

    Ok(())
}

fn parse_kalshi_private_key(material: &str) -> Result<RsaPrivateKey, ()> {
    if let Ok(private_key) = RsaPrivateKey::from_pkcs8_pem(material) {
        return Ok(private_key);
    }

    RsaPrivateKey::from_pkcs1_pem(material).map_err(|_| ())
}

fn parse_polymarket_local_signer_material(
    material: &str,
) -> Result<impl alloy::signers::Signer, PolymarketError> {
    LocalSigner::from_str(material.trim())
        .map(|signer| signer.with_chain_id(Some(POLYGON)))
        .map_err(|_| PolymarketError::validation("local signer material invalid"))
}

struct PolymarketRuntimeCredentials {
    signer_material: String,
    trading_address: Option<Address>,
    signature_type: PolymarketSignatureType,
}

fn load_polymarket_runtime_credentials() -> PolymarketResult<PolymarketRuntimeCredentials> {
    if let Some(profile) = load_local_secure_provider_profile("polymarket")
        .ok()
        .flatten()
    {
        let signer_material = load_polymarket_signer_material_from_profile(&profile)
            .map_err(PolymarketError::validation)?;
        let signature_type_label = profile
            .polymarket_signature_type
            .as_deref()
            .ok_or_else(|| PolymarketError::validation("polymarket_signature_type_missing"))?;
        let signature_type = parse_polymarket_signature_type(signature_type_label)
            .map_err(PolymarketError::validation)?;
        let trading_address = parse_polymarket_trading_address(
            profile.polymarket_trading_address.as_deref(),
            signature_type,
        )
        .map_err(PolymarketError::validation)?;

        return Ok(PolymarketRuntimeCredentials {
            signer_material,
            trading_address,
            signature_type,
        });
    }

    let signer_material = env::var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR)
        .map_err(|_| PolymarketError::validation("local signer material missing"))?;

    Ok(PolymarketRuntimeCredentials {
        signer_material,
        trading_address: None,
        signature_type: PolymarketSignatureType::Eoa,
    })
}

fn load_polymarket_signer_material_from_profile(
    profile: &LocalSecureProviderProfile,
) -> Result<String, String> {
    if profile.polymarket_signer_storage.as_deref() == Some(APP_MANAGED_SECRET_STORAGE) {
        return load_app_managed_credential_material("polymarket", "local_signer");
    }

    let signer_file_path = profile
        .polymarket_signer_file_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "polymarket_local_signer_file_missing".to_string())?;

    fs::read_to_string(signer_file_path)
        .map_err(|_| "polymarket_local_signer_file_missing".to_string())
}

fn load_kalshi_key_material_from_profile(
    profile: &LocalSecureProviderProfile,
) -> Result<String, String> {
    if profile.kalshi_key_storage.as_deref() == Some(APP_MANAGED_SECRET_STORAGE) {
        return load_app_managed_credential_material("kalshi", "rsa_private_key");
    }

    let key_file_path = profile
        .kalshi_key_file_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "kalshi_key_file_missing".to_string())?;

    fs::read_to_string(key_file_path).map_err(|_| "kalshi_key_file_missing".to_string())
}

fn account_metrics_captured_at_fresh(captured_at: &str) -> bool {
    DateTime::parse_from_rfc3339(captured_at).is_ok_and(|timestamp| {
        let age_ms = Utc::now()
            .signed_duration_since(timestamp.with_timezone(&Utc))
            .num_milliseconds();

        (0..=ACCOUNT_METRICS_STALE_THRESHOLD_MS).contains(&age_ms)
    })
}

fn approval_file_allows_live(provider_id: &str, approval: &LocalApprovalGateFile) -> bool {
    approval.status == "APPROVED"
        && approval.provider_id == provider_id
        && !approval.target_jurisdiction.trim().is_empty()
        && !approval.operator_identity.trim().is_empty()
        && !approval.approver.trim().is_empty()
        && approval.c0_review == "PASS"
        && approval.c1_risk_acceptance == "APPROVED_OR_NOT_REQUIRED"
        && is_positive_decimal(&approval.max_stake_first_order)
        && is_positive_decimal(&approval.max_market_exposure)
        && approval.geoblock_result == "PASS"
        && is_allowed_credential_source(&approval.credential_source)
        && approval.audit_log == "enabled"
        && DateTime::parse_from_rfc3339(&approval.approved_at).is_ok()
}

fn credential_source_ready_for(provider_id: &str) -> bool {
    credential_status_for_provider(provider_id).status == "ready"
}

fn account_metrics_source_ready() -> bool {
    let source = env::var(ACCOUNT_METRICS_SOURCE_VAR).unwrap_or_else(|_| "none".to_string());
    let provider_ready =
        env::var(LOCAL_ACCOUNT_METRICS_PROVIDER_READY_VAR).is_ok_and(|value| value == "true");

    account_metrics_source_ready_from(&source, provider_ready)
}

fn account_metrics_source_ready_for(provider_id: &str) -> bool {
    account_metrics_source_ready()
        || (credential_source_ready_for(provider_id)
            && provider_account_metrics_runtime_configured(provider_id))
}

fn account_metrics_source_ready_from(source: &str, provider_ready: bool) -> bool {
    source == ACCOUNT_METRICS_SOURCE_OFFICIAL && provider_ready
}

fn is_allowed_credential_source(source: &str) -> bool {
    matches!(
        source,
        "local_env_dev_only" | "os_secure_storage" | "explicit_local_provider"
    )
}

fn is_supported_provider(provider_id: &str) -> bool {
    matches!(provider_id, "polymarket" | "kalshi")
}

fn provider_currency(provider_id: &str) -> &'static str {
    match provider_id {
        "kalshi" => "USD",
        "polymarket" => "pUSD",
        _ => "USDC",
    }
}

fn mask_identifier(value: &str) -> String {
    let chars = value.chars().collect::<Vec<_>>();
    if chars.len() <= 8 {
        return "[masked]".to_string();
    }

    let prefix = chars.iter().take(4).collect::<String>();
    let suffix = chars
        .iter()
        .rev()
        .take(4)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<String>();
    format!("{prefix}...{suffix}")
}

fn looks_like_seed_phrase(value: &str) -> bool {
    let words = value
        .split_whitespace()
        .filter(|word| word.chars().all(|char| char.is_ascii_alphabetic()))
        .count();
    words >= 12
}

fn live_provider_runtime_for(provider_id: &str) -> ConfiguredLiveProviderRuntime {
    match live_provider_runtime_kind(
        provider_id,
        env::var(POLYMARKET_LIVE_RUNTIME_MODE_VAR).ok().as_deref(),
    ) {
        LiveProviderRuntimeKind::PolymarketOfficialSdk => {
            ConfiguredLiveProviderRuntime::Polymarket(PolymarketLiveProviderRuntime {
                host: env::var("POLYMARKET_CLOB_API_URL")
                    .unwrap_or_else(|_| POLYMARKET_CLOB_BASE_URL.to_string()),
            })
        }
        LiveProviderRuntimeKind::Unconfigured => {
            ConfiguredLiveProviderRuntime::Unconfigured(UnconfiguredLiveProviderRuntime {
                provider_id: provider_id.to_string(),
            })
        }
    }
}

fn provider_account_metrics_runtime_for(
    provider_id: &str,
) -> ConfiguredProviderAccountMetricsRuntime {
    match provider_id {
        "polymarket" => ConfiguredProviderAccountMetricsRuntime::Polymarket(
            PolymarketProviderAccountMetricsRuntime {
                clob_host: env::var("POLYMARKET_CLOB_API_URL")
                    .unwrap_or_else(|_| POLYMARKET_CLOB_BASE_URL.to_string()),
                data_api_host: env::var("POLYMARKET_DATA_API_URL")
                    .unwrap_or_else(|_| POLYMARKET_DATA_API_BASE_URL.to_string()),
            },
        ),
        "kalshi" => {
            ConfiguredProviderAccountMetricsRuntime::Kalshi(KalshiProviderAccountMetricsRuntime {
                base_urls: kalshi_account_metrics_base_urls(),
            })
        }
        _ => ConfiguredProviderAccountMetricsRuntime::Unconfigured(
            UnconfiguredProviderAccountMetricsRuntime {
                provider_id: provider_id.to_string(),
            },
        ),
    }
}

fn provider_account_metrics_runtime_configured(provider_id: &str) -> bool {
    matches!(provider_id, "polymarket" | "kalshi")
}

fn kalshi_account_metrics_base_urls() -> Vec<String> {
    if let Ok(base_url) = env::var(KALSHI_TRADE_API_BASE_URL_VAR) {
        return vec![normalize_kalshi_trade_api_base_url(&base_url)];
    }

    KALSHI_BASE_URLS
        .iter()
        .map(|base_url| normalize_kalshi_trade_api_base_url(base_url))
        .collect()
}

fn live_provider_runtime_kind(
    provider_id: &str,
    polymarket_mode: Option<&str>,
) -> LiveProviderRuntimeKind {
    match provider_id {
        "polymarket" if polymarket_mode == Some("disabled") => {
            LiveProviderRuntimeKind::Unconfigured
        }
        "polymarket" => LiveProviderRuntimeKind::PolymarketOfficialSdk,
        _ => LiveProviderRuntimeKind::Unconfigured,
    }
}

fn live_provider_label(provider_id: &str) -> &'static str {
    match provider_id {
        "polymarket" => "Polymarket",
        "kalshi" => "Kalshi",
        _ => "Provider",
    }
}

fn is_positive_decimal(value: &str) -> bool {
    value
        .parse::<f64>()
        .is_ok_and(|number| number > 0.0 && number.is_finite())
}

fn parse_positive_provider_decimal(value: &str) -> Option<Decimal> {
    Decimal::from_str(value.trim())
        .ok()
        .filter(|number| *number > Decimal::ZERO)
}

fn parse_non_negative_provider_decimal(value: &str) -> Option<Decimal> {
    Decimal::from_str(value.trim())
        .ok()
        .filter(|number| *number >= Decimal::ZERO)
}

fn compare_decimal_desc(left: &str, right: &str) -> std::cmp::Ordering {
    parse_decimal_or_zero(right).total_cmp(&parse_decimal_or_zero(left))
}

fn compare_decimal_asc(left: &str, right: &str) -> std::cmp::Ordering {
    parse_decimal_or_zero(left).total_cmp(&parse_decimal_or_zero(right))
}

fn parse_decimal_or_zero(value: &str) -> f64 {
    value.parse::<f64>().unwrap_or(0.0)
}

fn trim_decimal(value: f64) -> String {
    let text = format!("{value:.8}");
    text.trim_end_matches('0').trim_end_matches('.').to_string()
}

fn normalize_kalshi_side(value: &str) -> Option<&'static str> {
    match value.trim().to_ascii_lowercase().as_str() {
        "yes" => Some("yes"),
        "no" => Some("no"),
        _ => None,
    }
}

fn encode_path_segment(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| {
            if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
                vec![byte as char]
            } else {
                format!("%{byte:02X}").chars().collect()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    struct MockLiveProviderRuntime {
        place_result: LiveProviderRuntimeResult,
        cancel_result: LiveProviderRuntimeResult,
        place_calls: Cell<u32>,
        cancel_calls: Cell<u32>,
    }

    impl MockLiveProviderRuntime {
        fn new(
            place_result: LiveProviderRuntimeResult,
            cancel_result: LiveProviderRuntimeResult,
        ) -> Self {
            Self {
                place_result,
                cancel_result,
                place_calls: Cell::new(0),
                cancel_calls: Cell::new(0),
            }
        }
    }

    impl LiveProviderRuntime for MockLiveProviderRuntime {
        fn place_limit_order(
            &self,
            _request: &LiveOrderSubmitRequest,
        ) -> LiveProviderRuntimeResult {
            self.place_calls
                .set(self.place_calls.get().saturating_add(1));
            self.place_result.clone()
        }

        fn cancel_order(&self, _request: &CancelOrderRequest) -> LiveProviderRuntimeResult {
            self.cancel_calls
                .set(self.cancel_calls.get().saturating_add(1));
            self.cancel_result.clone()
        }
    }

    struct MockProviderAccountMetricsRuntime {
        result: ProviderAccountMetricsRuntimeResult,
        calls: Cell<u32>,
    }

    impl MockProviderAccountMetricsRuntime {
        fn ready(metrics: TauriOwnedAccountMetrics) -> Self {
            Self {
                result: ProviderAccountMetricsRuntimeResult::Ready(metrics),
                calls: Cell::new(0),
            }
        }
    }

    impl ProviderAccountMetricsRuntime for MockProviderAccountMetricsRuntime {
        fn load_account_metrics(
            &self,
            _request: &LiveOrderSubmitRequest,
        ) -> ProviderAccountMetricsRuntimeResult {
            self.calls.set(self.calls.get().saturating_add(1));
            self.result.clone()
        }
    }

    fn ready_live_gate_evaluation() -> LiveGateEvaluation {
        LiveGateEvaluation {
            ready: true,
            reasons: Vec::new(),
            local_approval_loaded: true,
            credential_source_ready: true,
            account_metrics_source_ready: true,
            live_trading_enabled: true,
            legal_gate_status: "APPROVED".to_string(),
            local_approval_limits: Some(LocalApprovalLimits {
                max_stake_first_order: "5".to_string(),
                max_market_exposure: "25".to_string(),
            }),
        }
    }

    fn ready_test_credential_status(provider_id: &str) -> ProviderCredentialStatus {
        ProviderCredentialStatus {
            status: "ready".to_string(),
            source: "explicit_local_provider".to_string(),
            message: format!(
                "{} local credential profile is ready for test-only Tauri metrics.",
                live_provider_label(provider_id)
            ),
            reasons: Vec::new(),
            masked_identifier: Some("local-provider:configured".to_string()),
            checked_at: now_iso(),
        }
    }

    fn valid_live_order_request() -> LiveOrderSubmitRequest {
        LiveOrderSubmitRequest {
            provider_id: "polymarket".to_string(),
            market_id: "pm-election-2026".to_string(),
            outcome_id: "pm-token-yes".to_string(),
            side: "BUY".to_string(),
            order_type: "limit".to_string(),
            time_in_force: "GTC".to_string(),
            price: "0.5".to_string(),
            stake_amount: "5".to_string(),
            stake_currency: "USDC".to_string(),
            quantity: "10".to_string(),
            marketable: false,
            explicit_live_ack: true,
            audit_log_enabled: true,
            kill_switch_active: false,
            selected_market: true,
            order_book_freshness: "fresh".to_string(),
            max_stake_per_order: "5".to_string(),
            max_market_exposure: "25".to_string(),
            min_order_size: None,
            available_funds: Some("20".to_string()),
            provider_exposure: Some("0".to_string()),
            market_exposure: Some("0".to_string()),
        }
    }

    fn valid_kalshi_live_order_request() -> LiveOrderSubmitRequest {
        LiveOrderSubmitRequest {
            provider_id: "kalshi".to_string(),
            market_id: "KX-FEDCUT-26JUN".to_string(),
            outcome_id: "yes".to_string(),
            stake_currency: "USD".to_string(),
            ..valid_live_order_request()
        }
    }

    fn ready_account_metrics() -> TauriOwnedAccountMetrics {
        account_metrics_with_market_exposure("0")
    }

    fn account_metrics_with_market_exposure(market_exposure: &str) -> TauriOwnedAccountMetrics {
        TauriOwnedAccountMetrics {
            available_funds: "100".to_string(),
            provider_exposure: "0".to_string(),
            market_exposure: market_exposure.to_string(),
            open_order_amount: "0".to_string(),
            position_exposure: "0".to_string(),
        }
    }

    fn ready_account_metrics_loader(
        _request: &LiveOrderSubmitRequest,
    ) -> Result<TauriOwnedAccountMetrics, String> {
        Ok(ready_account_metrics())
    }

    #[test]
    fn polymarket_public_portfolio_value_payload_prefers_requested_profile_address() {
        let payload = serde_json::json!([
            {
                "user": "0x0000000000000000000000000000000000000001",
                "value": 3.25
            },
            {
                "user": "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23",
                "value": "12.75"
            }
        ]);

        let value = polymarket_public_portfolio_value_from_payload(
            &payload,
            "0x1018D0EC7EAE87E5EF0280906105D6FEC143BF23",
        )
        .unwrap();

        assert_eq!(value.to_string(), "12.75");
    }

    #[test]
    fn polymarket_public_portfolio_value_payload_treats_empty_array_as_zero() {
        let value = polymarket_public_portfolio_value_from_payload(
            &serde_json::json!([]),
            &test_polymarket_trading_address(),
        )
        .unwrap();

        assert_eq!(value, Decimal::ZERO);
    }

    #[test]
    fn polymarket_account_candidate_specs_merge_configured_sdk_proxy_without_secrets() {
        let signer =
            parse_polymarket_local_signer_material(test_polymarket_signer_material()).unwrap();
        let signer_address = signer.address();
        let derived_proxy =
            polymarket_client_sdk_v2::derive_proxy_wallet(signer_address, POLYGON).unwrap();

        let candidates = polymarket_account_candidate_specs(
            signer_address,
            Some(derived_proxy),
            PolymarketSignatureType::Proxy,
            &[],
        );
        let serialized = format!("{candidates:?}");
        let configured_proxy = candidates
            .iter()
            .find(|candidate| candidate.configured && candidate.address == derived_proxy)
            .unwrap();

        assert!(configured_proxy.label.contains("configured_funder"));
        assert!(configured_proxy.label.contains("sdk_proxy"));
        assert_eq!(
            configured_proxy.signature_type,
            PolymarketSignatureType::Proxy
        );
        assert!(candidates
            .iter()
            .any(|candidate| candidate.label == "signer_eoa"));
        assert!(candidates
            .iter()
            .any(|candidate| candidate.label == "sdk_safe"));
        assert!(!serialized.contains(test_polymarket_signer_material()));
    }

    #[test]
    fn polymarket_account_candidate_specs_include_uups_deposit_wallet_candidate() {
        let signer =
            parse_polymarket_local_signer_material(test_polymarket_signer_material()).unwrap();
        let candidates = polymarket_account_candidate_specs(
            signer.address(),
            Some(test_polymarket_trading_address().parse().unwrap()),
            PolymarketSignatureType::Proxy,
            &[],
        );

        let deposit_wallet = candidates
            .iter()
            .find(|candidate| candidate.label == "derived_deposit_wallet_uups")
            .unwrap();

        assert_eq!(
            deposit_wallet.signature_type,
            PolymarketSignatureType::Poly1271
        );
        assert!(!deposit_wallet.configured);
    }

    #[test]
    fn polymarket_collateral_balance_is_normalized_from_base_units() {
        assert_eq!(
            normalize_polymarket_collateral_amount(Decimal::from_str("5000000").unwrap())
                .to_string(),
            "5"
        );
    }

    #[test]
    fn polymarket_account_candidate_recommendation_prefers_single_positive_public_value() {
        let mut candidates = vec![
            test_polymarket_account_candidate_status("configured_funder", true, Some("0")),
            test_polymarket_account_candidate_status("sdk_proxy", false, Some("18.25")),
            test_polymarket_account_candidate_status("sdk_safe", false, Some("0")),
        ];

        mark_recommended_polymarket_account_candidate(&mut candidates);

        let recommended = candidates
            .iter()
            .filter(|candidate| candidate.recommended)
            .collect::<Vec<_>>();

        assert_eq!(recommended.len(), 1);
        assert_eq!(recommended[0].label, "sdk_proxy");
        assert_eq!(
            recommended[0].recommendation_reason.as_deref(),
            Some("public_portfolio_value_higher_than_configured")
        );
    }

    #[test]
    fn polymarket_account_candidate_recommendation_prefers_trade_ready_cash() {
        let mut candidates = vec![
            test_polymarket_account_candidate_status_with_cash(
                "configured_funder",
                true,
                Some("0"),
                Some("0"),
            ),
            test_polymarket_account_candidate_status_with_cash(
                "magic_export_deposit_wallet",
                false,
                Some("0"),
                Some("22.50"),
            ),
            test_polymarket_account_candidate_status_with_cash(
                "sdk_proxy",
                false,
                Some("100"),
                None,
            ),
        ];

        mark_recommended_polymarket_account_candidate(&mut candidates);

        let recommended = candidates
            .iter()
            .filter(|candidate| candidate.recommended)
            .collect::<Vec<_>>();

        assert_eq!(recommended.len(), 1);
        assert_eq!(recommended[0].label, "magic_export_deposit_wallet");
        assert_eq!(
            recommended[0].recommendation_reason.as_deref(),
            Some("trade_ready_cash_higher_than_configured")
        );
    }

    #[test]
    fn polymarket_account_candidate_recommendation_skips_ambiguous_public_value_ties() {
        let mut candidates = vec![
            test_polymarket_account_candidate_status("configured_funder", true, Some("0")),
            test_polymarket_account_candidate_status("sdk_proxy", false, Some("18.25")),
            test_polymarket_account_candidate_status("sdk_safe", false, Some("18.25")),
        ];

        mark_recommended_polymarket_account_candidate(&mut candidates);

        assert!(candidates.iter().all(|candidate| !candidate.recommended));
        assert!(candidates
            .iter()
            .all(|candidate| candidate.recommendation_reason.is_none()));
    }

    #[test]
    fn polymarket_account_candidate_recommendation_keeps_configured_positive_account() {
        let mut candidates = vec![
            test_polymarket_account_candidate_status("configured_funder", true, Some("30")),
            test_polymarket_account_candidate_status("sdk_proxy", false, Some("18.25")),
            test_polymarket_account_candidate_status("sdk_safe", false, Some("0")),
        ];

        mark_recommended_polymarket_account_candidate(&mut candidates);

        assert!(candidates.iter().all(|candidate| !candidate.recommended));
    }

    fn account_metrics_file_json(provider_id: &str, market_id: &str, captured_at: &str) -> String {
        format!(
            r#"{{
  "providerId": "{provider_id}",
  "marketId": "{market_id}",
  "availableFunds": "100",
  "providerExposure": "0",
  "marketExposure": "0",
  "capturedAt": "{captured_at}"
}}"#
        )
    }

    fn valid_legal_approval_submit_request(provider_id: &str) -> LegalApprovalSubmitRequest {
        LegalApprovalSubmitRequest {
            provider_id: provider_id.to_string(),
            target_jurisdiction: "approved-smoke-test-jurisdiction".to_string(),
            operator_identity: "authorized operator".to_string(),
            approver: "business owner".to_string(),
            max_stake_first_order: "5".to_string(),
            max_market_exposure: "25".to_string(),
            checks: LegalApprovalSubmitChecks {
                platform_eligible: true,
                real_operator: true,
                real_beneficial_owners: true,
                real_account_owner: true,
                no_geoblock_bypass: true,
                no_vpn_bypass: true,
                no_fake_kyc: true,
                no_sanctions_bypass: true,
                no_custody: true,
                c0_review_pass: true,
                c1_risk_accepted: true,
                audit_enabled: true,
                first_live_smoke_only: true,
                no_deposits_or_withdrawals: true,
                understands_risk: true,
            },
        }
    }

    fn assert_decimal_string_eq(actual: &str, expected: &str) {
        assert_eq!(
            Decimal::from_str(actual).unwrap(),
            Decimal::from_str(expected).unwrap()
        );
    }

    fn valid_cancel_order_request() -> CancelOrderRequest {
        CancelOrderRequest {
            provider_id: "polymarket".to_string(),
            provider_order_id: "pm-live-order-1".to_string(),
            market_id: Some("pm-election-2026".to_string()),
        }
    }

    fn valid_kalshi_cancel_order_request() -> CancelOrderRequest {
        CancelOrderRequest {
            provider_id: "kalshi".to_string(),
            provider_order_id: "ks-live-order-1".to_string(),
            market_id: Some("KX-FEDCUT-26JUN".to_string()),
        }
    }

    fn temp_profile_path(name: &str) -> PathBuf {
        let directory = env::temp_dir().join(format!(
            "prediction-ladder-{name}-{}",
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        std::fs::create_dir_all(&directory).ok();
        directory.join("profile.json")
    }

    fn test_polymarket_signer_material() -> &'static str {
        "0x59c6995e998f97a5a004497e5da7e7f0e03eaa9a2f3838a3b797d66c13f2aaf6"
    }

    fn test_polymarket_trading_address() -> String {
        let signer =
            parse_polymarket_local_signer_material(test_polymarket_signer_material()).unwrap();
        polymarket_client_sdk_v2::derive_proxy_wallet(signer.address(), POLYGON)
            .unwrap()
            .to_string()
    }

    fn test_polymarket_account_candidate_status(
        label: &str,
        configured: bool,
        public_portfolio_value: Option<&str>,
    ) -> ProviderAccountCandidateStatus {
        test_polymarket_account_candidate_status_with_cash(
            label,
            configured,
            public_portfolio_value,
            None,
        )
    }

    fn test_polymarket_account_candidate_status_with_cash(
        label: &str,
        configured: bool,
        public_portfolio_value: Option<&str>,
        trade_ready_cash: Option<&str>,
    ) -> ProviderAccountCandidateStatus {
        ProviderAccountCandidateStatus {
            label: label.to_string(),
            signature_type: POLYMARKET_SIGNATURE_TYPE_PROXY.to_string(),
            configured,
            masked_identifier: "0x10...bf23".to_string(),
            status: "ready".to_string(),
            reasons: Vec::new(),
            public_portfolio_value: public_portfolio_value
                .map(|amount| metric_amount(amount.to_string(), provider_currency("polymarket"))),
            trade_ready_cash: trade_ready_cash
                .map(|amount| metric_amount(amount.to_string(), provider_currency("polymarket"))),
            trade_ready_cash_status: trade_ready_cash.map(|_| "ready".to_string()),
            trade_ready_cash_reasons: Vec::new(),
            recommended: false,
            recommendation_reason: None,
        }
    }

    fn test_kalshi_key_file() -> &'static str {
        "-----BEGIN PRIVATE KEY-----\nMIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwggJdAgEAAoGBAO37tQecM8c/VNec\nPk3EmKF7U0xjjoPonuceKx6bkHBRp0iLHQSNxvMKM8VALJSreCEL13J7M+psgXEr\nLKhFRnjOMnk/OLhjYSME3v0jhxxGUb8n2HbXa5N/Fbegu+nsthZEYJpqwgwBE7So\n55D7BVC0JmSyPRY8GOltbSwTAgyBAgMBAAECgYEAsCR8chyIKnJSnp9TcgYQHn2E\nQubxJer4KgInUik8OBYHpebpXGR/m4Wymc2M8aEUcgksttw/qcQT7qpRDF7x76zu\nv9PaRLkxZwqdsJdr3wUayN7CoVsrHx7iLmee0VWTsGYwfOTaJDvHpBnw/KcXoKAV\nTWgpa1NS636WxKs8V60CQQD5pEUCKTl+I8dl1jv2ue7WT6lePlQsQTmwxUAF9P+p\nLORk8/ibs3tpafZ3Galg6+EqQQ3A3K43z5lUXwt1BcrnAkEA9Atr4IBtgjcynUB1\nXKKVw9lU6kc9Xna18SkgZLu7bFItE3j3ITqQSWhasBSp2TUQu8u8RoFIeq65A36u\nYjooVwJAJoqL9Od0btsLP9exbkgKbZ/i4B/zUtnHFFl/puvKRM4ffM6FxVQSa5Xm\nbUDS+5mvK5zbiLkJVKiCXZpG5Iw+ZQJABxj18DeL98eHL0+amjEYTfPaJl4gCMlH\nDVZ23LchAkt5iCFyfoLng1sHmCthrTF/5RZNyXclFnxSYSmkBLNQTQJBAPUGOy5H\nUiXrRWl8St1eSfACO7O8hoz0r2/JXNwVVozXRIwi7FDY1AeyHXV3fc+vkNdf1y/4\nEb5Rx6k8RS9IIP4=\n-----END PRIVATE KEY-----"
    }

    #[test]
    fn kalshi_endpoint_path_strips_trade_api_prefix_once() {
        assert_eq!(kalshi_endpoint_path("/trade-api/v2/markets"), "/markets");
        assert_eq!(
            kalshi_endpoint_path("/trade-api/v2/markets/KX-FED/orderbook"),
            "/markets/KX-FED/orderbook"
        );
        assert_eq!(kalshi_endpoint_path("/markets"), "/markets");
    }

    #[test]
    fn kalshi_fallback_url_does_not_duplicate_trade_api_prefix() {
        let endpoint = kalshi_endpoint_path("/trade-api/v2/markets");
        let built = format!("{}{}", KALSHI_BASE_URLS[1], endpoint);

        assert_eq!(
            built,
            "https://api.elections.kalshi.com/trade-api/v2/markets"
        );
        assert!(!built.contains("/trade-api/v2/trade-api/v2"));
    }

    #[test]
    fn kalshi_account_metrics_url_and_signature_use_trade_api_path_without_query() {
        let query = vec![
            ("limit".to_string(), "5".to_string()),
            ("cursor".to_string(), "next-page".to_string()),
        ];
        let url = kalshi_account_metrics_url(
            "https://external-api.kalshi.com",
            "/portfolio/orders",
            &query,
        )
        .unwrap();
        let message = kalshi_request_signature_message(
            "1234567890",
            "get",
            "/trade-api/v2/portfolio/orders?limit=5",
        );

        assert_eq!(url.path(), "/trade-api/v2/portfolio/orders");
        assert_eq!(url.query().unwrap(), "limit=5&cursor=next-page");
        assert_eq!(message, "1234567890GET/trade-api/v2/portfolio/orders");
    }

    #[test]
    fn kalshi_key_material_must_be_parseable_rsa_private_key() {
        assert!(validate_kalshi_key_material(test_kalshi_key_file()).is_ok());
        assert_eq!(
            validate_kalshi_key_material(
                "-----BEGIN PRIVATE KEY-----\nTEST-ONLY-KALSHI-KEY\n-----END PRIVATE KEY-----"
            )
            .err(),
            Some("kalshi_key_file_invalid")
        );
        assert_eq!(
            validate_kalshi_key_material(
                "-----BEGIN ENCRYPTED PRIVATE KEY-----\nabc\n-----END ENCRYPTED PRIVATE KEY-----"
            )
            .err(),
            Some("kalshi_key_file_encrypted_passphrase_not_supported")
        );
    }

    #[test]
    fn kalshi_account_metrics_normalize_balance_orders_and_positions_without_secrets() {
        let request = valid_kalshi_live_order_request();
        let balance = serde_json::json!({
            "balance": 12345,
            "portfolio_value": 15000,
            "updated_ts": 1780580000
        });
        let orders = vec![serde_json::json!({
            "orders": [
                {
                    "ticker": "KX-FEDCUT-26JUN",
                    "status": "resting",
                    "remaining_count_fp": "10.00",
                    "yes_price_dollars": "0.4000",
                    "no_price_dollars": "0.6000"
                },
                {
                    "ticker": "KX-OTHER",
                    "status": "resting",
                    "remaining_count_fp": "2.00",
                    "yes_price_dollars": "0.2500",
                    "no_price_dollars": "0.7500"
                },
                {
                    "ticker": "KX-FEDCUT-26JUN",
                    "status": "canceled",
                    "remaining_count_fp": "100.00",
                    "yes_price_dollars": "1.0000"
                }
            ],
            "cursor": ""
        })];
        let positions = vec![serde_json::json!({
            "market_positions": [
                {
                    "ticker": "KX-FEDCUT-26JUN",
                    "market_exposure_dollars": "3.5000"
                },
                {
                    "ticker": "KX-OTHER",
                    "market_exposure_dollars": "4.0000"
                }
            ],
            "event_positions": [],
            "cursor": ""
        })];
        let metrics =
            kalshi_account_metrics_from_payloads(&request, &balance, &orders, &positions).unwrap();
        let secret_free_text = format!(
            "{}{}{}{}{}",
            metrics.available_funds,
            metrics.provider_exposure,
            metrics.market_exposure,
            metrics.open_order_amount,
            metrics.position_exposure
        );

        assert_decimal_string_eq(&metrics.available_funds, "123.45");
        assert_decimal_string_eq(&metrics.open_order_amount, "7.5");
        assert_decimal_string_eq(&metrics.position_exposure, "7.5");
        assert_decimal_string_eq(&metrics.provider_exposure, "15");
        assert_decimal_string_eq(&metrics.market_exposure, "9.5");
        assert!(!secret_free_text.contains("KALSHI-ACCESS"));
        assert!(!secret_free_text.contains("PRIVATE KEY"));
        assert!(!secret_free_text.contains("apiKey"));
    }

    #[test]
    fn kalshi_markets_url_uses_official_cursor_and_ticker_filters() {
        let url = build_kalshi_markets_url(50, Some("next-page"), Some("KX-FEDCUT-26JUN")).unwrap();

        assert_eq!(url.path(), "/trade-api/v2/markets");
        assert_eq!(
            url.query().unwrap(),
            "limit=50&status=open&cursor=next-page&tickers=KX-FEDCUT-26JUN"
        );
        assert!(!url.as_str().contains("/trade-api/v2/trade-api/v2"));
    }

    #[test]
    fn kalshi_query_scan_is_bounded_and_browse_stays_single_page() {
        assert_eq!(kalshi_query_scan_page_budget(""), 1);
        assert_eq!(
            kalshi_query_scan_page_budget("fed"),
            KALSHI_QUERY_SCAN_MAX_PAGES
        );
        assert_eq!(
            kalshi_direct_ticker_filter("kx-fedcut-26jun").as_deref(),
            Some("KX-FEDCUT-26JUN")
        );
        assert_eq!(kalshi_direct_ticker_filter("federal reserve"), None);
    }

    #[test]
    fn market_search_message_surfaces_partial_provider_blockers() {
        let markets = vec![RendererMarketSearchResult {
            provider_id: "polymarket".to_string(),
            market_id: "pm-market-1".to_string(),
            title: "Example market".to_string(),
            status: "open".to_string(),
            outcomes: Vec::new(),
            volume: None,
            liquidity: None,
        }];
        let provider_states = vec![
            VenueCommandState {
                provider_id: "polymarket".to_string(),
                status: "connected".to_string(),
                freshness: "fresh".to_string(),
                connection_mode: "polling_fallback".to_string(),
                message: "Polymarket connected.".to_string(),
                error_reason: None,
                has_more: true,
                next_cursor: None,
            },
            VenueCommandState {
                provider_id: "kalshi".to_string(),
                status: "disconnected".to_string(),
                freshness: "disconnected".to_string(),
                connection_mode: "polling_fallback".to_string(),
                message: "Kalshi TLS failed before a response.".to_string(),
                error_reason: Some("network_error".to_string()),
                has_more: false,
                next_cursor: None,
            },
        ];
        let message = market_search_message(&markets, &provider_states, "connected");

        assert!(message.contains("1 provider-backed market"));
        assert!(message.contains("1/2 connected venues"));
        assert!(message.contains("kalshi disconnected"));
    }

    #[test]
    fn transport_failure_explains_kalshi_tls_or_dns_mismatch() {
        let url =
            Url::parse("https://external-api.kalshi.com/trade-api/v2/markets?limit=1").unwrap();
        let failure = transport_failure(
            &url,
            "error sending request: invalid peer certificate: NotValidForName".to_string(),
        );

        assert_eq!(failure.status, "disconnected");
        assert_eq!(failure.error_reason, "network_error");
        assert!(failure.message.contains("Kalshi provider TLS/certificate"));
        assert!(failure.message.contains("DNS, proxy, or network filtering"));
        assert!(failure.message.contains("Do not disable TLS"));
        assert!(!failure.message.contains("/trade-api/v2/trade-api/v2"));
    }

    #[test]
    fn transport_failure_keeps_generic_message_for_non_kalshi_hosts() {
        let url = Url::parse("https://gamma-api.polymarket.com/markets").unwrap();
        let failure = transport_failure(&url, "connection reset".to_string());

        assert_eq!(failure.status, "disconnected");
        assert_eq!(failure.error_reason, "network_error");
        assert_eq!(
            failure.message,
            "Provider request failed before a response: connection reset."
        );
    }

    #[test]
    fn local_approval_gate_requires_all_runtime_approval_fields() {
        let approval = LocalApprovalGateFile {
            status: "APPROVED".to_string(),
            provider_id: "polymarket".to_string(),
            target_jurisdiction: "approved-smoke-test-jurisdiction".to_string(),
            operator_identity: "approved operator".to_string(),
            approver: "business owner".to_string(),
            c0_review: "PASS".to_string(),
            c1_risk_acceptance: "APPROVED_OR_NOT_REQUIRED".to_string(),
            max_stake_first_order: "5".to_string(),
            max_market_exposure: "25".to_string(),
            geoblock_result: "PASS".to_string(),
            credential_source: "explicit_local_provider".to_string(),
            audit_log: "enabled".to_string(),
            approved_at: "2026-06-04T09:00:00.000Z".to_string(),
        };
        let mut missing_c1 = LocalApprovalGateFile {
            c1_risk_acceptance: "MISSING".to_string(),
            ..approval
        };

        assert!(approval_file_allows_live("polymarket", &missing_c1) == false);
        missing_c1.c1_risk_acceptance = "APPROVED_OR_NOT_REQUIRED".to_string();
        assert!(approval_file_allows_live("polymarket", &missing_c1));
        assert!(!approval_file_allows_live("kalshi", &missing_c1));
    }

    #[test]
    fn legal_approval_submit_rejects_missing_fields_and_checks() {
        let mut request = valid_legal_approval_submit_request("polymarket");
        request.target_jurisdiction = " ".to_string();
        request.max_stake_first_order = "0".to_string();
        request.checks.c0_review_pass = false;
        request.checks.no_fake_kyc = false;

        let response = legal_approval_submit(request);
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(response.command, "legal_approval_status");
        assert_eq!(response.status, "blocked");
        assert!(response.secret_free);
        assert!(response
            .reasons
            .contains(&"legal_target_jurisdiction_missing".to_string()));
        assert!(response
            .reasons
            .contains(&"legal_max_stake_invalid".to_string()));
        assert!(response
            .reasons
            .contains(&"legal_c0_review_not_passed".to_string()));
        assert!(response
            .reasons
            .contains(&"legal_fake_kyc_not_rejected".to_string()));
        assert!(!serialized.contains("PRIVATE KEY"));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("signedPayload"));
    }

    #[test]
    fn legal_approval_submit_writes_tauri_owned_local_approval_without_secrets() {
        let approval_path = temp_profile_path("legal-approval-submit");
        TEST_LOCAL_APPROVAL_GATE_PATH.with(|path| {
            *path.borrow_mut() = Some(approval_path.clone());
        });

        let response = legal_approval_submit(valid_legal_approval_submit_request("polymarket"));
        let status = legal_approval_status(LegalApprovalStatusRequest {
            provider_id: "polymarket".to_string(),
        });
        let contents = std::fs::read_to_string(&approval_path).unwrap();
        TEST_LOCAL_APPROVAL_GATE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        let serialized = format!("{}{}", serde_json::to_string(&response).unwrap(), contents);

        assert!(response.ready);
        assert!(status.ready);
        assert_eq!(response.legal_gate_status, "APPROVED");
        assert!(contents.contains("\"status\": \"APPROVED\""));
        assert!(contents.contains("\"providerId\": \"polymarket\""));
        assert!(!serialized.contains("apiSecret"));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("signedPayload"));
        assert!(!serialized.contains("seedPhrase"));
        assert!(!serialized.contains("PRIVATE KEY"));
    }

    #[test]
    fn local_approval_file_authorizes_legal_gate_without_env_vars() {
        let approval_path = temp_profile_path("legal-approval-runtime");
        let profile_path = temp_profile_path("legal-approval-runtime-missing-profile");
        TEST_LOCAL_APPROVAL_GATE_PATH.with(|path| {
            *path.borrow_mut() = Some(approval_path);
        });
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path);
        });
        let _ = legal_approval_submit(valid_legal_approval_submit_request("polymarket"));

        let evaluation = evaluate_live_gate_status("polymarket", true, true, false);
        TEST_LOCAL_APPROVAL_GATE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });

        assert_eq!(evaluation.legal_gate_status, "APPROVED");
        assert!(evaluation.live_trading_enabled);
        assert!(!evaluation
            .reasons
            .contains(&"legal_gate_not_approved".to_string()));
        assert!(!evaluation
            .reasons
            .contains(&"enable_live_trading_not_true".to_string()));
        assert!(evaluation
            .reasons
            .contains(&"credential_source_missing".to_string()));
    }

    #[test]
    fn account_metrics_source_requires_official_tauri_provider_readiness() {
        assert!(account_metrics_source_ready_from("official_provider", true));
        assert!(!account_metrics_source_ready_from(
            "official_provider",
            false
        ));
        assert!(!account_metrics_source_ready_from(
            "renderer_snapshot",
            true
        ));
        assert!(!account_metrics_source_ready_from("none", true));
    }

    #[test]
    fn kalshi_account_metrics_runtime_is_configured_provider_path() {
        assert!(provider_account_metrics_runtime_configured("polymarket"));
        assert!(provider_account_metrics_runtime_configured("kalshi"));
        assert!(!provider_account_metrics_runtime_configured("unsupported"));
    }

    #[test]
    fn provider_onboarding_status_is_secret_free_when_credentials_are_missing() {
        let previous_profile = env::var(LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR).ok();
        let profile_path = temp_profile_path("missing-profile");
        env::set_var(LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR, &profile_path);

        let response = provider_onboarding_status(ProviderOnboardingStatusRequest {
            provider_id: None,
            market_id: None,
        });
        let serialized = serde_json::to_string(&response).unwrap();

        if let Some(value) = previous_profile {
            env::set_var(LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR, value);
        } else {
            env::remove_var(LOCAL_SECURE_PROVIDER_PROFILE_FILE_VAR);
        }

        assert!(response.secret_free);
        assert_eq!(response.providers.len(), 2);
        assert!(response
            .providers
            .iter()
            .all(|provider| provider.credential.status == "missing"));
        assert!(!serialized.contains("apiSecret"));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("signedPayload"));
        assert!(!serialized.contains("walletAddress"));
        assert!(!serialized.contains("PRIVATE KEY"));
    }

    #[test]
    fn provider_onboarding_rejects_seed_phrases_for_polymarket() {
        let signer_path = temp_profile_path("seed-phrase").with_extension("key");
        std::fs::write(
            &signer_path,
            "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
        )
        .unwrap();

        let response = provider_connect_account(ProviderCredentialConnectRequest {
            provider_id: "polymarket".to_string(),
            credential_source: "explicit_local_provider".to_string(),
            polymarket_signer_file_path: Some(signer_path.to_string_lossy().to_string()),
            polymarket_trading_address: Some(test_polymarket_trading_address()),
            polymarket_signature_type: Some(POLYMARKET_SIGNATURE_TYPE_PROXY.to_string()),
            kalshi_api_key_id: None,
            kalshi_key_file_path: None,
        });
        let serialized = serde_json::to_string(&response).unwrap();

        std::fs::remove_file(&signer_path).ok();

        assert_eq!(response.status, "blocked");
        assert!(response.message.contains("seed_phrase_not_allowed"));
        assert!(!serialized.contains("alpha beta"));
    }

    #[test]
    fn polymarket_signer_normalization_accepts_magic_url_wrapped_key() {
        let wrapped = format!(
            "https://reveal.magic.link/polymarket#exported={}&source=magic",
            test_polymarket_signer_material()
        );
        let normalized = normalize_polymarket_signer_material(
            &wrapped,
            "polymarket_clipboard_signer_missing",
            "polymarket_clipboard_signer_invalid",
        )
        .unwrap();

        assert_eq!(normalized, test_polymarket_signer_material());
        assert!(!normalized.contains("reveal.magic.link"));
    }

    #[test]
    fn polymarket_public_address_candidates_ignore_private_key_prefix() {
        let public_address = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";
        let wrapped = format!(
            "https://reveal.magic.link/polymarket#exported={}&wallet={}&zero=0x0000000000000000000000000000000000000000",
            test_polymarket_signer_material(),
            public_address
        );
        let candidates = extract_polymarket_public_address_candidates(&wrapped);
        let signer_prefix_address = format!("0x{}", &test_polymarket_signer_material()[2..42]);

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0], Address::from_str(public_address).unwrap());
        assert!(!candidates.iter().any(|candidate| candidate
            .to_string()
            .eq_ignore_ascii_case(&signer_prefix_address)));
    }

    #[test]
    fn polymarket_signer_normalization_still_rejects_seed_phrases() {
        let result = normalize_polymarket_signer_material(
            "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
            "polymarket_clipboard_signer_missing",
            "polymarket_clipboard_signer_invalid",
        );

        assert_eq!(result.err().as_deref(), Some("seed_phrase_not_allowed"));
    }

    #[test]
    fn credential_reference_urls_are_allowlisted() {
        assert_eq!(
            allowed_credential_reference_url("polymarket", "polymarket_magic_export"),
            Some(POLYMARKET_MAGIC_EXPORT_URL)
        );
        assert_eq!(
            allowed_credential_reference_url("polymarket", "polymarket_pusd_docs"),
            Some(POLYMARKET_PUSD_DOCS_URL)
        );
        assert_eq!(
            allowed_credential_reference_url("polymarket", "https://evil.example"),
            None
        );
        assert_eq!(
            allowed_credential_reference_url("kalshi", "polymarket_magic_export"),
            None
        );
        assert_eq!(
            allowed_external_url("http://reveal.magic.link/polymarket"),
            None
        );
    }

    #[test]
    fn provider_onboarding_can_import_polymarket_signer_material_without_renderer_secret_payload() {
        let profile_path = temp_profile_path("clipboard-import-profile");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });

        let profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            Some(&test_polymarket_trading_address()),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        save_local_secure_provider_profile(profile).unwrap();
        let status = credential_status_for_provider("polymarket");
        let response = provider_onboarding_status_response(Some("polymarket"), None);
        let serialized = serde_json::to_string(&response).unwrap();
        let test_trading_address = test_polymarket_trading_address();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");
        let store_contents = std::fs::read_to_string(&store_path).unwrap();
        let profile_contents = std::fs::read_to_string(&profile_path).unwrap();

        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });

        assert_eq!(status.status, "ready");
        assert!(response.secret_free);
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains(&test_trading_address));
        assert!(serialized.contains("proxy:"));
        assert!(!profile_contents.contains(test_polymarket_signer_material()));
        assert!(!store_contents.contains(test_polymarket_signer_material()));
        assert!(profile_contents.contains(APP_MANAGED_SECRET_STORAGE));
    }

    #[test]
    fn polymarket_poly1271_profile_requires_trading_address() {
        let profile_path = temp_profile_path("missing-polymarket-deposit-wallet");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });

        let profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            None,
            Some(POLYMARKET_SIGNATURE_TYPE_POLY_1271),
        );

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();

        assert_eq!(
            profile.err(),
            Some("polymarket_trading_address_missing".to_string())
        );
    }

    #[test]
    fn polymarket_proxy_profile_accepts_profile_api_address_as_funder() {
        let profile_path = temp_profile_path("polymarket-profile-address");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        let profile_address = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";

        let profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            Some(profile_address),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert!(profile
            .polymarket_trading_address
            .as_deref()
            .is_some_and(|address| address.eq_ignore_ascii_case(profile_address)));
        assert_eq!(
            profile.polymarket_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY)
        );
    }

    #[test]
    fn polymarket_proxy_profile_can_auto_derive_funder_from_magic_signer() {
        let profile_path = temp_profile_path("polymarket-auto-funder");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });

        let profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            None,
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert_eq!(
            profile.polymarket_trading_address.as_deref(),
            Some(test_polymarket_trading_address().as_str())
        );
        assert_eq!(
            profile.polymarket_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY)
        );
    }

    #[test]
    fn polymarket_clipboard_import_preserves_cached_account_for_same_signer() {
        let profile_path = temp_profile_path("polymarket-import-preserve-cached");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        let deposit_wallet = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";
        let cached_candidate = "0x2222222222222222222222222222222222222222";
        let mut profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            Some(deposit_wallet),
            Some(POLYMARKET_SIGNATURE_TYPE_POLY_1271),
        )
        .unwrap();
        profile.polymarket_imported_address_candidates = vec![cached_candidate.to_string()];
        save_local_secure_provider_profile(profile).unwrap();

        let cached_profile =
            load_cached_polymarket_profile_for_same_signer(test_polymarket_signer_material())
                .unwrap();
        let request = PolymarketSignerClipboardImportRequest {
            polymarket_trading_address: None,
            polymarket_signature_type: Some(POLYMARKET_SIGNATURE_TYPE_PROXY.to_string()),
        };
        let (profile_trading_address, profile_signature_type) =
            polymarket_clipboard_import_profile_inputs(&request, Some(&cached_profile));
        let merged_candidates =
            merge_polymarket_imported_address_candidates(Vec::new(), Some(&cached_profile));
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert!(profile_trading_address
            .as_deref()
            .is_some_and(|address| address.eq_ignore_ascii_case(deposit_wallet)));
        assert_eq!(
            profile_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_POLY_1271)
        );
        assert_eq!(merged_candidates, vec![cached_candidate.to_string()]);
    }

    #[test]
    fn polymarket_account_candidate_apply_updates_profile_without_renderer_address() {
        let profile_path = temp_profile_path("polymarket-apply-candidate");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        let wrong_profile_address = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";
        let profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            Some(wrong_profile_address),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        save_local_secure_provider_profile(profile).unwrap();

        let response =
            provider_apply_polymarket_account_candidate(PolymarketAccountCandidateApplyRequest {
                label: "sdk_proxy".to_string(),
                signature_type: POLYMARKET_SIGNATURE_TYPE_PROXY.to_string(),
            });
        let saved = load_local_secure_provider_profile("polymarket")
            .unwrap()
            .unwrap();
        let serialized = serde_json::to_string(&response).unwrap();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert_eq!(response.providers[0].credential.status, "ready");
        assert_eq!(
            saved.polymarket_trading_address.as_deref(),
            Some(test_polymarket_trading_address().as_str())
        );
        assert_eq!(
            saved.polymarket_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY)
        );
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains(&test_polymarket_trading_address()));
        assert!(!serialized.contains(wrong_profile_address));
    }

    #[test]
    fn polymarket_account_candidate_apply_accepts_magic_export_deposit_wallet_candidate() {
        let profile_path = temp_profile_path("polymarket-apply-imported-candidate");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        let deposit_wallet = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";
        let mut profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            None,
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        profile.polymarket_imported_address_candidates = vec![deposit_wallet.to_string()];
        save_local_secure_provider_profile(profile).unwrap();

        let response =
            provider_apply_polymarket_account_candidate(PolymarketAccountCandidateApplyRequest {
                label: "magic_export_deposit_wallet".to_string(),
                signature_type: POLYMARKET_SIGNATURE_TYPE_POLY_1271.to_string(),
            });
        let saved = load_local_secure_provider_profile("polymarket")
            .unwrap()
            .unwrap();
        let serialized = serde_json::to_string(&response).unwrap();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert_eq!(response.providers[0].credential.status, "ready");
        assert!(saved
            .polymarket_trading_address
            .as_deref()
            .is_some_and(|address| address.eq_ignore_ascii_case(deposit_wallet)));
        assert_eq!(
            saved.polymarket_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_POLY_1271)
        );
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains(deposit_wallet));
    }

    #[test]
    fn polymarket_account_candidate_apply_uses_unique_magic_export_candidate_label() {
        let profile_path = temp_profile_path("polymarket-apply-imported-candidate-2");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        let first_deposit_wallet = "0x1018d0EC7EAe87E5eF0280906105d6feC143Bf23";
        let second_deposit_wallet = "0x2222222222222222222222222222222222222222";
        let mut profile = app_managed_polymarket_profile_from_signer_material(
            test_polymarket_signer_material(),
            None,
            Some(POLYMARKET_SIGNATURE_TYPE_PROXY),
        )
        .unwrap();
        profile.polymarket_imported_address_candidates = vec![
            first_deposit_wallet.to_string(),
            second_deposit_wallet.to_string(),
        ];
        save_local_secure_provider_profile(profile).unwrap();

        let response =
            provider_apply_polymarket_account_candidate(PolymarketAccountCandidateApplyRequest {
                label: "magic_export_deposit_wallet_2".to_string(),
                signature_type: POLYMARKET_SIGNATURE_TYPE_POLY_1271.to_string(),
            });
        let saved = load_local_secure_provider_profile("polymarket")
            .unwrap()
            .unwrap();
        let serialized = serde_json::to_string(&response).unwrap();
        let store_path = app_managed_credential_material_path("polymarket", "local_signer");

        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&store_path).ok();

        assert_eq!(response.providers[0].credential.status, "ready");
        assert!(saved
            .polymarket_trading_address
            .as_deref()
            .is_some_and(|address| address.eq_ignore_ascii_case(second_deposit_wallet)));
        assert_eq!(
            saved.polymarket_signature_type.as_deref(),
            Some(POLYMARKET_SIGNATURE_TYPE_POLY_1271)
        );
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains(first_deposit_wallet));
        assert!(!serialized.contains(second_deposit_wallet));
    }

    #[test]
    fn provider_onboarding_saves_local_profiles_without_returning_paths_or_key_material() {
        let profile_path = temp_profile_path("credential-profile");
        let signer_path = temp_profile_path("polymarket-signer").with_extension("key");
        let kalshi_key_path = temp_profile_path("kalshi").with_extension("key");
        std::fs::write(&signer_path, test_polymarket_signer_material()).unwrap();
        std::fs::write(&kalshi_key_path, test_kalshi_key_file()).unwrap();
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });

        let polymarket = provider_connect_account(ProviderCredentialConnectRequest {
            provider_id: "polymarket".to_string(),
            credential_source: "explicit_local_provider".to_string(),
            polymarket_signer_file_path: Some(signer_path.to_string_lossy().to_string()),
            polymarket_trading_address: Some(test_polymarket_trading_address()),
            polymarket_signature_type: Some(POLYMARKET_SIGNATURE_TYPE_PROXY.to_string()),
            kalshi_api_key_id: None,
            kalshi_key_file_path: None,
        });
        let kalshi = provider_connect_account(ProviderCredentialConnectRequest {
            provider_id: "kalshi".to_string(),
            credential_source: "explicit_local_provider".to_string(),
            polymarket_signer_file_path: None,
            polymarket_trading_address: None,
            polymarket_signature_type: None,
            kalshi_api_key_id: Some("KALSHI-API-KEY-ID-123456".to_string()),
            kalshi_key_file_path: Some(kalshi_key_path.to_string_lossy().to_string()),
        });
        let serialized = serde_json::to_string(&(polymarket, kalshi)).unwrap();
        let profile_contents = std::fs::read_to_string(&profile_path).unwrap();
        let polymarket_store_path =
            app_managed_credential_material_path("polymarket", "local_signer");
        let kalshi_store_path = app_managed_credential_material_path("kalshi", "rsa_private_key");
        let polymarket_store_contents = std::fs::read_to_string(&polymarket_store_path).unwrap();
        let kalshi_store_contents = std::fs::read_to_string(&kalshi_store_path).unwrap();

        std::fs::remove_file(&signer_path).ok();
        std::fs::remove_file(&kalshi_key_path).ok();
        let polymarket_status = credential_status_for_provider("polymarket");
        let kalshi_status = credential_status_for_provider("kalshi");

        std::fs::remove_file(&profile_path).ok();
        std::fs::remove_file(&polymarket_store_path).ok();
        std::fs::remove_file(&kalshi_store_path).ok();
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });

        assert_eq!(polymarket_status.status, "ready");
        assert_eq!(kalshi_status.status, "ready");
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains(&signer_path.to_string_lossy().to_string()));
        assert!(!serialized.contains(&kalshi_key_path.to_string_lossy().to_string()));
        assert!(!serialized.contains("KALSHI-API-KEY-ID-123456"));
        assert!(serialized.contains("KALS...3456"));
        assert!(!profile_contents.contains(test_polymarket_signer_material()));
        assert!(!profile_contents.contains(test_kalshi_key_file()));
        assert!(!profile_contents.contains(&signer_path.to_string_lossy().to_string()));
        assert!(!profile_contents.contains(&kalshi_key_path.to_string_lossy().to_string()));
        assert!(profile_contents.contains(APP_MANAGED_SECRET_STORAGE));
        assert!(!polymarket_store_contents.contains(test_polymarket_signer_material()));
        assert!(!kalshi_store_contents.contains(test_kalshi_key_file()));
    }

    #[test]
    #[ignore = "uses real local Polymarket credentials and provider network; prints secret-free diagnostics only"]
    fn polymarket_local_profile_account_diagnostic() {
        let report =
            tauri::async_runtime::block_on(polymarket_local_profile_account_diagnostic_result());
        println!("{report}");
    }

    async fn polymarket_local_profile_account_diagnostic_result() -> String {
        let mut lines = vec![
            "POLYMARKET_LOCAL_PROFILE_ACCOUNT_DIAGNOSTIC".to_string(),
            "No orders are submitted; signer/API secrets/auth headers are not printed.".to_string(),
        ];

        let profile = match load_local_secure_provider_profile("polymarket") {
            Ok(Some(profile)) => profile,
            Ok(None) => {
                lines.push("profile_status=missing".to_string());
                return lines.join("\n");
            }
            Err(reason) => {
                lines.push(format!("profile_status=invalid reason={reason}"));
                return lines.join("\n");
            }
        };
        let credential_status = credential_status_for_provider("polymarket");
        lines.push(format!(
            "app_credential_status={} reasons={}",
            credential_status.status,
            credential_status.reasons.join(",")
        ));

        let signer_material = match load_polymarket_signer_material_from_profile(&profile) {
            Ok(material) => material,
            Err(reason) => {
                lines.push(format!(
                    "runtime_credentials_status=invalid reason={}",
                    redact_diagnostic_error(&reason)
                ));
                return lines.join("\n");
            }
        };
        let signature_type = match profile
            .polymarket_signature_type
            .as_deref()
            .ok_or_else(|| "polymarket_signature_type_missing".to_string())
            .and_then(parse_polymarket_signature_type)
        {
            Ok(signature_type) => signature_type,
            Err(reason) => {
                lines.push(format!(
                    "runtime_credentials_status=invalid reason={}",
                    redact_diagnostic_error(&reason)
                ));
                return lines.join("\n");
            }
        };
        let configured_funder = match parse_polymarket_trading_address(
            profile.polymarket_trading_address.as_deref(),
            signature_type,
        ) {
            Ok(funder) => funder,
            Err(reason) => {
                lines.push(format!(
                    "runtime_credentials_status=invalid reason={}",
                    redact_diagnostic_error(&reason)
                ));
                return lines.join("\n");
            }
        };

        let signer = match parse_polymarket_local_signer_material(&signer_material) {
            Ok(signer) => signer,
            Err(error) => {
                lines.push(format!(
                    "signer_status=invalid reason={}",
                    redact_diagnostic_error(&error.to_string())
                ));
                return lines.join("\n");
            }
        };

        let signer_address = signer.address();
        let derived_proxy = polymarket_client_sdk_v2::derive_proxy_wallet(signer_address, POLYGON);
        let derived_safe = polymarket_client_sdk_v2::derive_safe_wallet(signer_address, POLYGON);

        lines.push(format!("profile_configured_at={}", profile.configured_at));
        lines.push(format!(
            "profile_signature_type={}",
            profile
                .polymarket_signature_type
                .as_deref()
                .unwrap_or("missing")
        ));
        lines.push(format!(
            "signer_address_masked={}",
            mask_identifier(&signer_address.to_string())
        ));
        lines.push(format!(
            "configured_funder_masked={}",
            configured_funder
                .map(|address| mask_identifier(&address.to_string()))
                .unwrap_or_else(|| "missing".to_string())
        ));
        lines.push(format!(
            "sdk_derived_proxy_masked={}",
            derived_proxy
                .map(|address| mask_identifier(&address.to_string()))
                .unwrap_or_else(|| "unavailable".to_string())
        ));
        lines.push(format!(
            "sdk_derived_safe_masked={}",
            derived_safe
                .map(|address| mask_identifier(&address.to_string()))
                .unwrap_or_else(|| "unavailable".to_string())
        ));
        lines.push(format!(
            "configured_matches_sdk_proxy={}",
            configured_funder
                .zip(derived_proxy)
                .is_some_and(|(a, b)| a == b)
        ));
        lines.push(format!(
            "configured_matches_sdk_safe={}",
            configured_funder
                .zip(derived_safe)
                .is_some_and(|(a, b)| a == b)
        ));

        let data_api_host = env::var("POLYMARKET_DATA_API_URL")
            .unwrap_or_else(|_| POLYMARKET_DATA_API_BASE_URL.to_string());
        let mut candidate_statuses = Vec::new();
        let imported_address_candidates = parse_polymarket_imported_address_candidates(
            &profile.polymarket_imported_address_candidates,
        );
        for candidate in polymarket_account_candidate_specs(
            signer_address,
            configured_funder,
            signature_type,
            &imported_address_candidates,
        ) {
            let public_value = load_polymarket_public_portfolio_value(
                &data_api_host,
                &candidate.address.to_string(),
            )
            .await;
            let (status, reasons, public_portfolio_value) = match public_value {
                Ok(value) => (
                    "ready".to_string(),
                    Vec::new(),
                    Some(metric_amount(
                        value.to_string(),
                        provider_currency("polymarket"),
                    )),
                ),
                Err(reason) => (
                    "unknown".to_string(),
                    vec![redact_diagnostic_error(&reason)],
                    None,
                ),
            };
            let trade_ready_cash = load_polymarket_candidate_trade_ready_cash(
                POLYMARKET_CLOB_V2_BASE_URL,
                signer_material.trim(),
                &candidate,
            )
            .await;
            let (trade_ready_cash_status, trade_ready_cash_reasons, trade_ready_cash) =
                match trade_ready_cash {
                    Ok(value) => (
                        Some("ready".to_string()),
                        Vec::new(),
                        Some(metric_amount(
                            value.to_string(),
                            provider_currency("polymarket"),
                        )),
                    ),
                    Err(error) => (
                        Some("unknown".to_string()),
                        vec![redact_diagnostic_error(&error.to_string())],
                        None,
                    ),
                };

            candidate_statuses.push(ProviderAccountCandidateStatus {
                label: candidate.label,
                signature_type: polymarket_signature_type_label(candidate.signature_type)
                    .to_string(),
                configured: candidate.configured,
                masked_identifier: mask_identifier(&candidate.address.to_string()),
                status,
                reasons,
                public_portfolio_value,
                trade_ready_cash,
                trade_ready_cash_status,
                trade_ready_cash_reasons,
                recommended: false,
                recommendation_reason: None,
            });
        }
        mark_recommended_polymarket_account_candidate(&mut candidate_statuses);
        for candidate in candidate_statuses {
            lines.push(format!(
                "candidate label={} signatureType={} configured={} masked={} status={} publicPortfolioValue={} tradeReadyCash={} tradeReadyCashStatus={} recommended={} reason={}",
                candidate.label,
                candidate.signature_type,
                candidate.configured,
                candidate.masked_identifier,
                candidate.status,
                candidate
                    .public_portfolio_value
                    .as_ref()
                    .map(|value| value.amount.as_str())
                    .unwrap_or("unknown"),
                candidate
                    .trade_ready_cash
                    .as_ref()
                    .map(|value| value.amount.as_str())
                    .unwrap_or("unknown"),
                candidate
                    .trade_ready_cash_status
                    .as_deref()
                    .unwrap_or("unknown"),
                candidate.recommended,
                candidate
                    .recommendation_reason
                    .as_deref()
                    .unwrap_or("none")
            ));
            if !candidate.reasons.is_empty() {
                lines.push(format!(
                    "candidate label={} reasons={}",
                    candidate.label,
                    candidate.reasons.join(",")
                ));
            }
            if !candidate.trade_ready_cash_reasons.is_empty() {
                lines.push(format!(
                    "candidate label={} tradeReadyCashReasons={}",
                    candidate.label,
                    candidate.trade_ready_cash_reasons.join(",")
                ));
            }
        }

        for host in [POLYMARKET_CLOB_V2_BASE_URL, POLYMARKET_CLOB_BASE_URL] {
            lines.push(
                polymarket_balance_diagnostic_line(
                    host,
                    "configured",
                    &signer_material,
                    signature_type,
                    configured_funder,
                )
                .await,
            );
            lines.push(
                polymarket_balance_diagnostic_line(
                    host,
                    "proxy_auto",
                    &signer_material,
                    PolymarketSignatureType::Proxy,
                    None,
                )
                .await,
            );
            lines.push(
                polymarket_balance_diagnostic_line(
                    host,
                    "eoa",
                    &signer_material,
                    PolymarketSignatureType::Eoa,
                    None,
                )
                .await,
            );
        }

        lines.join("\n")
    }

    async fn polymarket_balance_diagnostic_line(
        host: &str,
        label: &str,
        signer_material: &str,
        signature_type: PolymarketSignatureType,
        funder: Option<Address>,
    ) -> String {
        let signer = match parse_polymarket_local_signer_material(signer_material) {
            Ok(signer) => signer,
            Err(error) => {
                return format!(
                    "balance label={label} host={host} status=signer_invalid reason={}",
                    redact_diagnostic_error(&error.to_string())
                );
            }
        };

        let mut auth_builder =
            match PolymarketClobClient::new(host, PolymarketClobConfig::default()) {
                Ok(client) => client
                    .authentication_builder(&signer)
                    .signature_type(signature_type),
                Err(error) => {
                    return format!(
                        "balance label={label} host={host} status=client_invalid reason={}",
                        redact_diagnostic_error(&error.to_string())
                    );
                }
            };
        if let Some(funder) = funder {
            auth_builder = auth_builder.funder(funder);
        }

        let client = match auth_builder.authenticate().await {
            Ok(client) => client,
            Err(error) => {
                return format!(
                    "balance label={label} host={host} signatureType={} funder={} status=auth_failed reason={}",
                    polymarket_signature_type_label(signature_type),
                    funder
                        .map(|address| mask_identifier(&address.to_string()))
                        .unwrap_or_else(|| "none".to_string()),
                    redact_diagnostic_error(&error.to_string())
                );
            }
        };

        let refresh_status =
            refresh_polymarket_collateral_balance_allowance(&client, signature_type)
                .await
                .map(|_| "ok".to_string())
                .unwrap_or_else(|error| redact_diagnostic_error(&error.to_string()));

        match client
            .balance_allowance(
                BalanceAllowanceRequest::builder()
                    .asset_type(PolymarketAssetType::Collateral)
                    .signature_type(signature_type)
                    .build(),
            )
            .await
        {
            Ok(balance) => format!(
                "balance label={label} host={host} signatureType={} funder={} status=ok refresh={} balance={} allowanceContracts={}",
                polymarket_signature_type_label(signature_type),
                funder
                    .map(|address| mask_identifier(&address.to_string()))
                    .unwrap_or_else(|| "none".to_string()),
                refresh_status,
                balance.balance,
                balance.allowances.len()
            ),
            Err(error) => format!(
                "balance label={label} host={host} signatureType={} funder={} status=balance_failed refresh={} reason={}",
                polymarket_signature_type_label(signature_type),
                funder
                    .map(|address| mask_identifier(&address.to_string()))
                    .unwrap_or_else(|| "none".to_string()),
                refresh_status,
                redact_diagnostic_error(&error.to_string())
            ),
        }
    }

    fn redact_diagnostic_error(value: &str) -> String {
        let redaction_pattern = credentials_redaction_pattern();
        let redacted = if redaction_pattern.is_empty() {
            value.to_string()
        } else {
            value.replace(&redaction_pattern, "[redacted]")
        };

        redacted.replace('\n', " ")
    }

    fn credentials_redaction_pattern() -> String {
        load_local_secure_provider_profile("polymarket")
            .ok()
            .flatten()
            .and_then(|profile| load_polymarket_signer_material_from_profile(&profile).ok())
            .unwrap_or_default()
    }

    #[test]
    fn account_metrics_values_file_must_match_provider_market_and_be_fresh() {
        let fresh_path = env::temp_dir().join(format!(
            "prediction-ladder-account-metrics-fresh-{}.json",
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        let stale_path = env::temp_dir().join(format!(
            "prediction-ladder-account-metrics-stale-{}.json",
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ));
        std::fs::write(
            &fresh_path,
            account_metrics_file_json(
                "polymarket",
                "pm-election-2026",
                &Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true),
            ),
        )
        .unwrap();
        std::fs::write(
            &stale_path,
            account_metrics_file_json(
                "polymarket",
                "pm-election-2026",
                &Utc.timestamp_opt(1_700_000_000, 0).unwrap().to_rfc3339(),
            ),
        )
        .unwrap();

        let loaded =
            load_tauri_owned_account_metrics_from_path(&valid_live_order_request(), &fresh_path)
                .unwrap();
        let stale =
            load_tauri_owned_account_metrics_from_path(&valid_live_order_request(), &stale_path);

        let mut wrong_market_request = valid_live_order_request();
        wrong_market_request.market_id = "pm-other-market".to_string();
        let wrong_market =
            load_tauri_owned_account_metrics_from_path(&wrong_market_request, &fresh_path);

        std::fs::remove_file(fresh_path).ok();
        std::fs::remove_file(stale_path).ok();

        assert_eq!(loaded.available_funds, "100");
        assert_eq!(stale.err().as_deref(), Some("account_metrics_values_stale"));
        assert_eq!(
            wrong_market.err().as_deref(),
            Some("account_metrics_market_mismatch")
        );
    }

    #[test]
    fn provider_owned_account_metrics_status_uses_runtime_without_local_file() {
        let runtime = MockProviderAccountMetricsRuntime::ready(TauriOwnedAccountMetrics {
            available_funds: "50".to_string(),
            provider_exposure: "6".to_string(),
            market_exposure: "3".to_string(),
            open_order_amount: "4".to_string(),
            position_exposure: "2".to_string(),
        });
        let credential = ready_test_credential_status("polymarket");
        let status = account_metrics_status_for_provider_with_runtime_and_credential(
            "polymarket",
            Some("pm-election-2026"),
            &runtime,
            &credential,
            false,
        );
        let serialized = serde_json::to_string(&status).unwrap();

        assert_eq!(status.status, "ready");
        assert_eq!(status.source, "provider_owned_account_metrics");
        assert_eq!(runtime.calls.get(), 1);
        assert_eq!(status.available_funds.unwrap().amount, "50");
        assert_eq!(status.open_order_amount.unwrap().amount, "4");
        assert_eq!(status.position_exposure.unwrap().amount, "2");
        assert!(!serialized.contains(test_polymarket_signer_material()));
        assert!(!serialized.contains("local_file_dev_only"));
    }

    #[test]
    fn kalshi_provider_owned_account_metrics_status_uses_usd_without_local_file() {
        let runtime = MockProviderAccountMetricsRuntime::ready(TauriOwnedAccountMetrics {
            available_funds: "75".to_string(),
            provider_exposure: "10".to_string(),
            market_exposure: "4".to_string(),
            open_order_amount: "6".to_string(),
            position_exposure: "4".to_string(),
        });
        let credential = ready_test_credential_status("kalshi");
        let status = account_metrics_status_for_provider_with_runtime_and_credential(
            "kalshi",
            Some("KX-FEDCUT-26JUN"),
            &runtime,
            &credential,
            false,
        );
        let serialized = serde_json::to_string(&status).unwrap();

        assert_eq!(status.status, "ready");
        assert_eq!(status.source, "provider_owned_account_metrics");
        assert_eq!(runtime.calls.get(), 1);
        assert_eq!(status.available_funds.unwrap().currency, "USD");
        assert_eq!(status.open_order_amount.unwrap().amount, "6");
        assert!(!serialized.contains("local_file_dev_only"));
        assert!(!serialized.contains("KALSHI-API-KEY-ID"));
        assert!(!serialized.contains("PRIVATE KEY"));
    }

    #[test]
    fn live_submit_loader_accepts_provider_owned_account_metrics_without_local_file() {
        let metrics_runtime = MockProviderAccountMetricsRuntime::ready(TauriOwnedAccountMetrics {
            available_funds: "100".to_string(),
            provider_exposure: "4".to_string(),
            market_exposure: "1".to_string(),
            open_order_amount: "3".to_string(),
            position_exposure: "1".to_string(),
        });
        let live_runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            valid_live_order_request(),
            ready_live_gate_evaluation(),
            &live_runtime,
            |request| {
                load_tauri_owned_account_metrics_for_request_with_runtime(request, &metrics_runtime)
            },
        );

        assert_eq!(response.status, "submitted");
        assert!(response.submitted_externally);
        assert_eq!(metrics_runtime.calls.get(), 1);
        assert_eq!(live_runtime.place_calls.get(), 1);
    }

    #[test]
    fn live_provider_runtime_kind_configures_polymarket_by_default() {
        assert_eq!(
            live_provider_runtime_kind("polymarket", Some(POLYMARKET_LIVE_RUNTIME_MODE)),
            LiveProviderRuntimeKind::PolymarketOfficialSdk
        );
        assert_eq!(
            live_provider_runtime_kind("polymarket", None),
            LiveProviderRuntimeKind::PolymarketOfficialSdk
        );
        assert_eq!(
            live_provider_runtime_kind("polymarket", Some("disabled")),
            LiveProviderRuntimeKind::Unconfigured
        );
        assert_eq!(
            live_provider_runtime_kind("kalshi", Some(POLYMARKET_LIVE_RUNTIME_MODE)),
            LiveProviderRuntimeKind::Unconfigured
        );
    }

    #[test]
    fn polymarket_live_runtime_uses_official_clob_order_host_by_default() {
        let previous_runtime_mode = env::var(POLYMARKET_LIVE_RUNTIME_MODE_VAR).ok();
        let previous_clob_api_url = env::var("POLYMARKET_CLOB_API_URL").ok();
        env::remove_var(POLYMARKET_LIVE_RUNTIME_MODE_VAR);
        env::remove_var("POLYMARKET_CLOB_API_URL");

        let live_runtime = live_provider_runtime_for("polymarket");
        let metrics_runtime = provider_account_metrics_runtime_for("polymarket");

        if let Some(value) = previous_runtime_mode {
            env::set_var(POLYMARKET_LIVE_RUNTIME_MODE_VAR, value);
        }
        if let Some(value) = previous_clob_api_url {
            env::set_var("POLYMARKET_CLOB_API_URL", value);
        }

        match live_runtime {
            ConfiguredLiveProviderRuntime::Polymarket(runtime) => {
                assert_eq!(runtime.host, POLYMARKET_CLOB_BASE_URL);
            }
            ConfiguredLiveProviderRuntime::Unconfigured(_) => {
                panic!("expected configured polymarket live runtime");
            }
        }
        match metrics_runtime {
            ConfiguredProviderAccountMetricsRuntime::Polymarket(runtime) => {
                assert_eq!(runtime.clob_host, POLYMARKET_CLOB_BASE_URL);
            }
            _ => panic!("expected configured polymarket account metrics runtime"),
        }
    }

    #[test]
    fn configured_polymarket_runtime_rejects_without_local_signer_material() {
        let previous_signer_material = env::var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR).ok();
        env::remove_var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR);
        let empty_profile_path = temp_profile_path("empty-polymarket-profile");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(empty_profile_path.clone());
        });
        let runtime = ConfiguredLiveProviderRuntime::Polymarket(PolymarketLiveProviderRuntime {
            host: POLYMARKET_CLOB_V2_BASE_URL.to_string(),
        });
        let mut request = valid_live_order_request();
        request.outcome_id = "123456789".to_string();
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            request,
            ready_live_gate_evaluation(),
            &runtime,
            ready_account_metrics_loader,
        );

        if let Some(value) = previous_signer_material {
            env::set_var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR, value);
        }
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });
        std::fs::remove_file(&empty_profile_path).ok();

        assert_eq!(response.status, "rejected");
        assert_eq!(response.submitted_externally, false);
        assert_eq!(
            response.reasons,
            vec!["credential_source_missing".to_string()]
        );
        assert_eq!(response.audit_event_type.as_deref(), Some("order_rejected"));
        assert!(response.message.contains("local signer material"));
    }

    #[test]
    fn live_order_request_blocks_marketable_orders_and_missing_account_metrics() {
        let reasons = validate_live_order_request(
            &LiveOrderSubmitRequest {
                provider_id: "polymarket".to_string(),
                market_id: "pm-election-2026".to_string(),
                outcome_id: "pm-token-yes".to_string(),
                side: "BUY".to_string(),
                order_type: "limit".to_string(),
                time_in_force: "GTC".to_string(),
                price: "0.5".to_string(),
                stake_amount: "5".to_string(),
                stake_currency: "USDC".to_string(),
                quantity: "10".to_string(),
                marketable: true,
                explicit_live_ack: true,
                audit_log_enabled: true,
                kill_switch_active: false,
                selected_market: true,
                order_book_freshness: "fresh".to_string(),
                max_stake_per_order: "5".to_string(),
                max_market_exposure: "25".to_string(),
                min_order_size: None,
                available_funds: None,
                provider_exposure: None,
                market_exposure: None,
            },
            None,
            None,
        );

        assert!(reasons.contains(&"marketable_order_blocked".to_string()));
        assert!(reasons.contains(&"account_metrics_values_source_missing".to_string()));
    }

    #[test]
    fn live_order_request_allows_prediction_market_quantity_above_declared_stake_when_cost_matches()
    {
        let request = valid_live_order_request();

        let metrics = ready_account_metrics();
        let reasons = validate_live_order_request(&request, None, Some(&metrics));

        assert!(!reasons.contains(&"estimated_order_cost_exceeds_stake_amount".to_string()));
    }

    #[test]
    fn live_order_request_blocks_estimated_cost_that_exceeds_declared_stake() {
        let mut request = valid_live_order_request();
        request.quantity = "1000000".to_string();

        let metrics = ready_account_metrics();
        let reasons = validate_live_order_request(&request, None, Some(&metrics));

        assert!(reasons.contains(&"estimated_order_cost_exceeds_stake_amount".to_string()));
    }

    #[test]
    fn live_order_request_tolerates_decimal_rounding_at_declared_stake() {
        let mut request = valid_live_order_request();
        request.price = "0.3".to_string();
        request.stake_amount = "5".to_string();
        request.quantity = "16.666666666666666667".to_string();

        let metrics = ready_account_metrics();
        let reasons = validate_live_order_request(&request, None, Some(&metrics));

        assert!(!reasons.contains(&"estimated_order_cost_exceeds_stake_amount".to_string()));
    }

    #[test]
    fn live_order_request_blocks_size_below_market_minimum_before_provider_submission() {
        let mut request = valid_live_order_request();
        request.price = "0.49".to_string();
        request.stake_amount = "1".to_string();
        request.quantity = "2.040816326530612244".to_string();
        request.min_order_size = Some("5".to_string());

        let metrics = ready_account_metrics();
        let reasons = validate_live_order_request(&request, None, Some(&metrics));
        let message = live_order_blocked_message(&request, &reasons);

        assert!(reasons.contains(&"order_size_below_market_minimum".to_string()));
        assert!(message.contains("Order size 2.040816326530612244"));
        assert!(message.contains("minimum size 5"));
    }

    #[test]
    fn polymarket_provider_error_message_surfaces_min_size_without_secrets() {
        let error = PolymarketError::status(
            polymarket_client_sdk_v2::error::StatusCode::BAD_REQUEST,
            polymarket_client_sdk_v2::error::Method::POST,
            "/order".to_string(),
            r#"{"error":"order 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef is invalid. Size (2.040816326530612244) lower than the minimum: 5"}"#,
        );

        let message = polymarket_error_message(&error, Some("side=BUY, price=0.49, size=2.04"));

        assert!(message.contains("order size is below Polymarket's market minimum"));
        assert!(message.contains("Size (2.040816326530612244) lower than the minimum: 5"));
        assert!(message.contains("Context: side=BUY, price=0.49, size=2.04"));
        assert!(!message.contains("1234567890abcdef1234567890abcdef"));
        assert!(message.contains("0x[redacted]"));
    }

    #[test]
    fn polymarket_provider_error_message_surfaces_post_only_crossing() {
        let error = PolymarketError::status(
            polymarket_client_sdk_v2::error::StatusCode::BAD_REQUEST,
            polymarket_client_sdk_v2::error::Method::POST,
            "/order".to_string(),
            "invalid post-only order: order crosses book",
        );

        let message = polymarket_error_message(&error, None);

        assert!(message.contains("post-only order would cross the current book"));
    }

    #[test]
    fn polymarket_provider_error_message_surfaces_empty_status_body_with_context() {
        let mut request = valid_live_order_request();
        request.price = "0.01".to_string();
        request.stake_amount = "0.1".to_string();
        request.quantity = "10".to_string();
        request.min_order_size = Some("5".to_string());
        let error = PolymarketError::status(
            polymarket_client_sdk_v2::error::StatusCode::BAD_REQUEST,
            polymarket_client_sdk_v2::error::Method::POST,
            "/order".to_string(),
            "",
        );

        let response = map_polymarket_order_error(error, &request);
        let LiveProviderRuntimeResult::Rejected { reason, message } = response else {
            panic!("expected rejected polymarket status");
        };

        assert_eq!(reason, "provider_rejected");
        assert!(message.contains("HTTP 400 Bad Request while calling POST /order"));
        assert!(message.contains("price=0.01"));
        assert!(message.contains("size=10"));
        assert!(message.contains("stake=0.1 USDC"));
        assert!(message.contains("marketMinSize=5"));
        assert_ne!(message, "Polymarket rejected the live provider request.");
    }

    #[test]
    fn live_order_request_blocks_projected_tauri_owned_market_exposure_above_limit() {
        let mut request = valid_live_order_request();
        request.stake_amount = "2".to_string();
        request.quantity = "4".to_string();
        request.market_exposure = Some("0".to_string());
        request.max_market_exposure = "25".to_string();
        let metrics = account_metrics_with_market_exposure("24.01");

        let reasons = validate_live_order_request(&request, None, Some(&metrics));

        assert!(reasons.contains(&"exposure_exceeds_limit".to_string()));
    }

    #[test]
    fn live_order_request_enforces_non_committed_local_approval_limits() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let mut evaluation = ready_live_gate_evaluation();
        evaluation.local_approval_limits = Some(LocalApprovalLimits {
            max_stake_first_order: "4".to_string(),
            max_market_exposure: "24".to_string(),
        });
        let request = valid_live_order_request();
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            request,
            evaluation,
            &runtime,
            |_| Ok(account_metrics_with_market_exposure("20")),
        );

        assert_eq!(response.status, "blocked");
        assert_eq!(response.submitted_externally, false);
        assert!(response
            .reasons
            .contains(&"stake_exceeds_local_approval".to_string()));
        assert!(response
            .reasons
            .contains(&"exposure_exceeds_local_approval".to_string()));
        assert_eq!(runtime.place_calls.get(), 0);
    }

    #[test]
    fn live_order_submit_blocks_when_tauri_owned_account_metrics_values_are_missing() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let mut request = valid_live_order_request();
        request.available_funds = Some("1000000".to_string());
        request.provider_exposure = Some("0".to_string());
        request.market_exposure = Some("0".to_string());
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            request,
            ready_live_gate_evaluation(),
            &runtime,
            |_| Err("account_metrics_values_source_missing".to_string()),
        );

        assert_eq!(response.status, "blocked");
        assert_eq!(response.submitted_externally, false);
        assert!(response
            .reasons
            .contains(&"account_metrics_values_source_missing".to_string()));
        assert_eq!(runtime.place_calls.get(), 0);
    }

    #[test]
    fn live_gate_status_response_is_secret_free_and_reason_exact() {
        let response = live_gate_status_response(
            "polymarket",
            LiveGateEvaluation {
                ready: false,
                reasons: vec![
                    "local_approval_missing".to_string(),
                    "credential_source_missing".to_string(),
                ],
                local_approval_loaded: false,
                credential_source_ready: false,
                account_metrics_source_ready: false,
                live_trading_enabled: false,
                legal_gate_status: "NOT_APPROVED".to_string(),
                local_approval_limits: None,
            },
        );
        let serialized = serde_json::to_string(&response).unwrap();

        assert!(response.secret_free);
        assert_eq!(response.status, "blocked");
        assert!(response.message.contains("local_approval_missing"));
        assert!(serialized.contains("credentialSourceReady"));
        assert!(!serialized.contains("authorization"));
        assert!(!serialized.contains("signedPayload"));
    }

    #[test]
    fn live_preflight_status_names_exact_provider_blockers_without_secrets() {
        let response = live_preflight_status(LivePreflightStatusRequest {
            provider_id: Some("polymarket".to_string()),
            market_id: Some("pm-election-2026".to_string()),
            outcome_id: Some("pm-token-yes".to_string()),
            selected_market: true,
            order_book_freshness: Some("stale".to_string()),
            explicit_live_ack: false,
            audit_log_enabled: true,
            kill_switch_active: true,
            stake_amount: Some("5".to_string()),
            max_stake_per_order: Some("5".to_string()),
            max_market_exposure: Some("25".to_string()),
            non_marketable: false,
        });
        let serialized = serde_json::to_string(&response).unwrap();
        let polymarket = response
            .providers
            .iter()
            .find(|provider| provider.provider_id == "polymarket")
            .unwrap();
        let kalshi = response
            .providers
            .iter()
            .find(|provider| provider.provider_id == "kalshi")
            .unwrap();

        assert!(response.secret_free);
        assert!(!response.ready);
        assert!(polymarket
            .reasons
            .contains(&"fresh_official_order_book_missing".to_string()));
        assert!(polymarket
            .reasons
            .contains(&"marketable_order_blocked".to_string()));
        assert!(polymarket
            .reasons
            .contains(&"kill_switch_active".to_string()));
        assert!(kalshi
            .reasons
            .contains(&"selected_market_missing".to_string()));
        assert!(!serialized.contains("apiSecret"));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("signedPayload"));
        assert!(!serialized.contains("PRIVATE KEY"));
    }

    #[test]
    fn live_provider_runtime_is_not_called_when_submit_gate_fails() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let response = order_submit_live_with_runtime(
            valid_live_order_request(),
            LiveGateEvaluation {
                ready: false,
                reasons: vec!["local_approval_missing".to_string()],
                local_approval_loaded: false,
                credential_source_ready: true,
                account_metrics_source_ready: true,
                live_trading_enabled: true,
                legal_gate_status: "APPROVED".to_string(),
                local_approval_limits: None,
            },
            &runtime,
        );

        assert_eq!(response.status, "blocked");
        assert_eq!(response.submitted_externally, false);
        assert_eq!(
            response.audit_event_type.as_deref(),
            Some("validation_failed")
        );
        assert!(response
            .reasons
            .contains(&"local_approval_missing".to_string()));
        assert_eq!(response.provider_order_id, None);
        assert_eq!(runtime.place_calls.get(), 0);
    }

    #[test]
    fn live_provider_runtime_submits_mocked_polymarket_order_after_all_gates_pass() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            valid_live_order_request(),
            ready_live_gate_evaluation(),
            &runtime,
            ready_account_metrics_loader,
        );
        let serialized = serde_json::to_string(&response).unwrap();

        assert_eq!(response.status, "submitted");
        assert!(response.secret_free);
        assert!(response.submitted_externally);
        assert_eq!(response.reasons, Vec::<String>::new());
        assert_eq!(
            response.provider_order_id.as_deref(),
            Some("pm-live-order-1")
        );
        assert_eq!(
            response.audit_event_type.as_deref(),
            Some("order_submitted")
        );
        assert_eq!(runtime.place_calls.get(), 1);
        assert!(!serialized.contains("authorization"));
        assert!(!serialized.contains("signedPayload"));
    }

    #[test]
    fn live_provider_runtime_submits_and_cancels_mocked_kalshi_order_after_all_gates_pass() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "ks-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "ks-live-order-1".to_string(),
            },
        );
        let submitted = order_submit_live_with_runtime_and_account_metrics_loader(
            valid_kalshi_live_order_request(),
            ready_live_gate_evaluation(),
            &runtime,
            ready_account_metrics_loader,
        );
        let cancelled =
            order_cancel_with_runtime(valid_kalshi_cancel_order_request(), true, &runtime);
        let serialized = serde_json::to_string(&(&submitted, &cancelled)).unwrap();

        assert_eq!(submitted.provider_id, "kalshi");
        assert_eq!(submitted.status, "submitted");
        assert!(submitted.submitted_externally);
        assert_eq!(
            submitted.provider_order_id.as_deref(),
            Some("ks-live-order-1")
        );
        assert_eq!(cancelled.provider_id, "kalshi");
        assert_eq!(cancelled.status, "cancelled");
        assert!(cancelled.submitted_externally);
        assert_eq!(runtime.place_calls.get(), 1);
        assert_eq!(runtime.cancel_calls.get(), 1);
        assert!(!serialized.contains("apiSecret"));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("signedPayload"));
    }

    #[test]
    fn live_provider_runtime_maps_provider_rejection_and_network_error() {
        let rejected_runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Rejected {
                reason: "provider_rejected".to_string(),
                message: "Provider rejected the order.".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let rejected = order_submit_live_with_runtime_and_account_metrics_loader(
            valid_live_order_request(),
            ready_live_gate_evaluation(),
            &rejected_runtime,
            ready_account_metrics_loader,
        );

        assert_eq!(rejected.status, "rejected");
        assert_eq!(rejected.submitted_externally, false);
        assert_eq!(rejected.audit_event_type.as_deref(), Some("order_rejected"));
        assert_eq!(rejected.reasons, vec!["provider_rejected".to_string()]);
        assert_eq!(rejected_runtime.place_calls.get(), 1);

        let network_runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::NetworkError {
                message: "Provider request failed before a response.".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let network = order_submit_live_with_runtime_and_account_metrics_loader(
            valid_live_order_request(),
            ready_live_gate_evaluation(),
            &network_runtime,
            ready_account_metrics_loader,
        );

        assert_eq!(network.status, "failed");
        assert_eq!(network.submitted_externally, false);
        assert_eq!(network.audit_event_type.as_deref(), Some("error_occurred"));
        assert_eq!(network.reasons, vec!["network_error".to_string()]);
        assert_eq!(network_runtime.place_calls.get(), 1);
    }

    #[test]
    fn live_cancel_runtime_succeeds_only_after_cancel_gates_pass() {
        let runtime = MockLiveProviderRuntime::new(
            LiveProviderRuntimeResult::Submitted {
                provider_order_id: "pm-live-order-1".to_string(),
            },
            LiveProviderRuntimeResult::Cancelled {
                provider_order_id: "pm-live-order-1".to_string(),
            },
        );
        let blocked = order_cancel_with_runtime(valid_cancel_order_request(), false, &runtime);

        assert_eq!(blocked.status, "blocked");
        assert_eq!(blocked.submitted_externally, false);
        assert!(blocked
            .reasons
            .contains(&"credential_source_missing".to_string()));
        assert_eq!(runtime.cancel_calls.get(), 0);

        let cancelled = order_cancel_with_runtime(valid_cancel_order_request(), true, &runtime);

        assert_eq!(cancelled.status, "cancelled");
        assert!(cancelled.secret_free);
        assert!(cancelled.submitted_externally);
        assert_eq!(cancelled.reasons, Vec::<String>::new());
        assert_eq!(
            cancelled.provider_order_id.as_deref(),
            Some("pm-live-order-1")
        );
        assert_eq!(
            cancelled.audit_event_type.as_deref(),
            Some("order_cancelled")
        );
        assert_eq!(runtime.cancel_calls.get(), 1);
    }

    #[test]
    fn production_polymarket_runtime_rejects_without_local_signer_after_gates_pass() {
        let previous_runtime_mode = env::var(POLYMARKET_LIVE_RUNTIME_MODE_VAR).ok();
        let previous_signer_material = env::var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR).ok();
        let profile_path = temp_profile_path("production-runtime-no-signer");
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = Some(profile_path.clone());
        });
        env::remove_var(POLYMARKET_LIVE_RUNTIME_MODE_VAR);
        env::remove_var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR);

        let runtime = live_provider_runtime_for("polymarket");
        let mut request = valid_live_order_request();
        request.outcome_id = "123456789".to_string();
        let response = order_submit_live_with_runtime_and_account_metrics_loader(
            request,
            ready_live_gate_evaluation(),
            &runtime,
            ready_account_metrics_loader,
        );

        if let Some(value) = previous_runtime_mode {
            env::set_var(POLYMARKET_LIVE_RUNTIME_MODE_VAR, value);
        }
        if let Some(value) = previous_signer_material {
            env::set_var(POLYMARKET_LOCAL_SIGNER_MATERIAL_VAR, value);
        }
        TEST_LOCAL_SECURE_PROVIDER_PROFILE_PATH.with(|path| {
            *path.borrow_mut() = None;
        });

        assert_eq!(response.status, "rejected");
        assert_eq!(response.submitted_externally, false);
        assert_eq!(
            response.reasons,
            vec!["credential_source_missing".to_string()]
        );
        assert_eq!(response.audit_event_type.as_deref(), Some("order_rejected"));
        assert!(response.message.contains("local signer material"));
    }

    #[test]
    #[ignore = "requires external provider network and is intended for local desktop smoke verification"]
    fn provider_backed_market_search_smoke_returns_secret_free_state() {
        let response = tauri::async_runtime::block_on(market_search(MarketSearchRequest {
            query: String::new(),
            provider_id: None,
            limit: Some(10),
            offset: Some(0),
            cursor_by_provider: None,
        }));
        let serialized = serde_json::to_string(&response).unwrap();

        println!(
            "market_search smoke: status={}, markets={}, provider_states={}",
            response.status,
            response.markets.len(),
            response
                .provider_states
                .iter()
                .map(|state| format!("{}:{}", state.provider_id, state.status))
                .collect::<Vec<_>>()
                .join(",")
        );
        assert!(response.secret_free);
        assert_eq!(response.provider_ids, vec!["polymarket", "kalshi"]);
        assert!(
            response.status == "connected",
            "expected at least one provider-backed market path to connect; got status {} with message {}",
            response.status,
            response.message
        );
        assert!(
            !response.markets.is_empty(),
            "expected provider-backed browse to return at least one normalized market"
        );
        assert!(!serialized.contains(&format!("{}{}", "api", "Secret")));
        assert!(!serialized.contains("authHeader"));
        assert!(!serialized.contains("authorization"));
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_get_status,
            market_search,
            market_get_order_book,
            market_subscribe,
            live_gate_status,
            legal_approval_status,
            legal_approval_submit,
            provider_onboarding_status,
            provider_connect_account,
            provider_open_credential_reference,
            provider_import_polymarket_signer_from_clipboard,
            provider_apply_polymarket_account_candidate,
            live_preflight_status,
            order_submit_live,
            order_cancel
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Prediction Ladder desktop shell");
}
