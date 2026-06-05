import type { OrderRejectionReason } from "@prediction-ladder/core";
import { getMessages, supportedLocales } from "@prediction-ladder/i18n";
import { describe, expect, it } from "vitest";

import { getOrderRejectionReasonMessage } from "./riskAlertMessages";

const orderRejectionReasons = [
  "market_not_selected",
  "order_book_not_fresh",
  "price_not_aligned_to_tick",
  "stake_not_configured",
  "execution_disabled",
  "kill_switch_active_for_risk_increasing_action",
  "legal_gate_not_approved",
  "c1_approval_missing",
  "geo_blocked",
  "geo_unknown",
  "credentials_missing",
  "local_approval_missing",
  "one_click_not_armed",
  "first_live_ack_missing",
  "stake_exceeds_limit",
  "exposure_exceeds_limit",
  "available_funds_unknown",
  "insufficient_available_funds",
  "provider_exposure_unknown",
  "market_exposure_unknown",
  "marketable_order_not_approved",
  "position_unknown",
  "c0_risk_detected",
  "fee_disclosure_missing",
  "order_intent_missing",
  "audit_log_not_enabled",
  "invalid_price",
  "invalid_stake",
  "invalid_exposure",
  "invalid_available_funds",
  "invalid_risk_limit",
] satisfies readonly OrderRejectionReason[];

describe("risk alert messages", () => {
  it("localizes every core order rejection reason used by ladder validation", () => {
    for (const locale of supportedLocales) {
      const terminalMessages = getMessages(locale).desktop.terminal;

      for (const reason of orderRejectionReasons) {
        expect(getOrderRejectionReasonMessage(terminalMessages, reason)).toBeTruthy();
        expect(getOrderRejectionReasonMessage(terminalMessages, reason)).not.toBe(
          reason,
        );
      }
    }
  });

  it("shows the Spanish insufficient-funds blocker as user-facing copy", () => {
    expect(
      getOrderRejectionReasonMessage(
        getMessages("es").desktop.terminal,
        "insufficient_available_funds",
      ),
    ).toBe("Fondos disponibles insuficientes para esta orden.");
  });

  it("localizes secret-free account diagnostics for the blocked-order dialog", () => {
    for (const locale of supportedLocales) {
      const riskAlerts = getMessages(locale).desktop.terminal.riskAlerts;

      expect(riskAlerts.diagnosticsTitle).toBeTruthy();
      expect(riskAlerts.fundsDiagnosticNote).toBeTruthy();
      expect(riskAlerts.diagnostics.availableFundsRead).toBeTruthy();
      expect(riskAlerts.diagnostics.metricsSource).toBeTruthy();
    }
  });
});
