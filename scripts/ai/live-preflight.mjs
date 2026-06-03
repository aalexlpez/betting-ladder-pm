#!/usr/bin/env node
import { existsSync } from "node:fs";

function fail(message) {
  console.error(`LIVE ENVIRONMENT PREFLIGHT FAILED: ${message}`);
  process.exit(1);
}

function env(name, fallback = "") {
  return process.env[name] ?? fallback;
}

if (env("LEGAL_GATE_STATUS", "NOT_APPROVED") !== "APPROVED") {
  fail("LEGAL_GATE_STATUS must be APPROVED");
}
if (env("ENABLE_LIVE_TRADING", "false") !== "true") {
  fail("ENABLE_LIVE_TRADING must be true");
}
if (!env("TARGET_JURISDICTION")) fail("TARGET_JURISDICTION must be set");
if (!env("MAX_STAKE_PER_ORDER")) fail("MAX_STAKE_PER_ORDER must be set");
if (!env("MAX_MARKET_EXPOSURE")) fail("MAX_MARKET_EXPOSURE must be set");
if (!env("AUDIT_LOG_DIR")) fail("AUDIT_LOG_DIR must be set");

const approvalFile = env("LEGAL_APPROVAL_FILE");
if (!approvalFile) {
  fail("LEGAL_APPROVAL_FILE must be set to a non-committed local approval file");
}
if (!existsSync(approvalFile)) {
  fail("LEGAL_APPROVAL_FILE does not exist. Keep approval state outside committed repo files.");
}

const providerId = env("PROVIDER_ID");
if (!providerId) fail("PROVIDER_ID must be set to polymarket or kalshi");
if (!["polymarket", "kalshi"].includes(providerId)) {
  fail("PROVIDER_ID must be polymarket or kalshi");
}

const credentialSource = env("CREDENTIAL_SOURCE", "none");
if (credentialSource === "none") {
  fail("CREDENTIAL_SOURCE must be set to an approved local provider");
}
if (!["local_env_dev_only", "os_secure_storage", "explicit_local_provider"].includes(credentialSource)) {
  fail("CREDENTIAL_SOURCE must be local_env_dev_only, os_secure_storage, or explicit_local_provider");
}

if (credentialSource === "local_env_dev_only") {
  if (!env("LOCAL_DEV_PROVIDER_SECRET_LOCAL_DEV_ONLY")) {
    fail("LOCAL_DEV_PROVIDER_SECRET_LOCAL_DEV_ONLY required for local env smoke-test mode");
  }
  console.error("WARNING: local_env_dev_only is dev/smoke-test only; product builds need OS/local CredentialProvider.");
}

console.log(
  `Live environment preflight variables passed for ${providerId}. Application-level geo, credential, C0/C1, market, risk, kill-switch, acknowledgement, and audit checks must still pass at runtime.`,
);
