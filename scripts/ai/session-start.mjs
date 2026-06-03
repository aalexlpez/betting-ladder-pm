#!/usr/bin/env node
import { readFileSync } from "node:fs";

function readLines(path) {
  return readFileSync(path, "utf8").split(/\r?\n/);
}

function extractNextActions(lines) {
  const sectionIndex = lines.findIndex((line) => line.trim() === "## Next action");
  if (sectionIndex === -1) return [];

  const actions = [];
  for (const line of lines.slice(sectionIndex + 1)) {
    if (/^##\s+/.test(line)) break;
    const trimmed = line.trim();
    if (/^\d+\.\s+/.test(trimmed)) {
      actions.push(trimmed);
    }
  }

  return actions;
}

function printGoalCatalogFallback() {
  const goals = readLines("docs/ai/CODEX_GOALS.md");
  goals.forEach((line, index) => {
    if (/^## Goal 0/.test(line)) {
      console.log(`${index + 1}: ${line}`);
    }
  });
}

console.log("Codex session start");
console.log("Read first:");
console.log("- AGENTS.md");
console.log("- docs/ai/CONTEXT_INDEX.md");
console.log("- docs/ai/context-handoff.md");
console.log("- docs/product/ASSIGNMENT_TRACEABILITY.md if checking against assignment");
console.log("");
console.log("Current next action from docs/ai/context-handoff.md:");

try {
  const nextActions = extractNextActions(readLines("docs/ai/context-handoff.md"));
  if (nextActions.length === 0) {
    console.log("- Could not find a Next action section; falling back to goal catalog.");
    printGoalCatalogFallback();
  } else {
    nextActions.forEach((action) => {
      console.log(`- ${action.replace(/^\d+\.\s+/, "")}`);
    });
  }
} catch (error) {
  console.error(`Could not read session context: ${error.message}`);
  process.exitCode = 1;
}
