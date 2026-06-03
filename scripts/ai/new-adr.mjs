#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv.slice(2).join("-").trim();
if (!name) {
  console.error("Usage: pnpm ai:new-adr <short-name>");
  process.exit(1);
}

const adrDir = join("docs", "adr");
if (!existsSync(adrDir)) mkdirSync(adrDir, { recursive: true });

const existing = readdirSync(adrDir).filter((entry) => /^ADR-\d{4}-.*\.md$/.test(entry));
const max = existing.reduce((current, entry) => {
  const match = /^ADR-(\d{4})-/.exec(entry);
  return match ? Math.max(current, Number(match[1])) : current;
}, 0);

const next = String(max + 1).padStart(4, "0");
const safeName = name
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "");
const file = join(adrDir, `ADR-${next}-${safeName}.md`);
const date = new Date().toISOString().slice(0, 10);

const content = `# ADR-${next} - ${safeName}

Date: ${date}

## Status

Proposed

## Context

## Decision

## Consequences

## Rejected alternatives

`;

writeFileSync(file, content, { flag: "wx" });
console.log(`Created ${file}`);
