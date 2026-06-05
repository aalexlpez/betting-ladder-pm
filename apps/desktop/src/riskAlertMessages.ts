import type { OrderRejectionReason } from "@prediction-ladder/core";
import type { AppMessages } from "@prediction-ladder/i18n";

type TerminalMessages = AppMessages["desktop"]["terminal"];

export function getOrderRejectionReasonMessage(
  messages: TerminalMessages,
  reason: OrderRejectionReason,
): string {
  return messages.riskAlerts.reasons[reason] ?? formatMachineValue(reason);
}

export function formatOrderRejectionReasonCode(reason: OrderRejectionReason): string {
  return formatMachineValue(reason);
}

function formatMachineValue(value: string): string {
  return value.replace(/_/g, " ");
}
