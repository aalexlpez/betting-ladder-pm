#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const skipDirs = new Set(["node_modules", ".git", "dist", "build", "release", "coverage", ".turbo", ".local"]);

function fail(message) {
  console.error(`QUALITY GATE FAILED: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) return { status: 1, error: result.error };
  return { status: result.status ?? 0 };
}

function walkPackageJson(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walkPackageJson(path, out);
    } else if (entry === "package.json") {
      out.push(path);
    }
  }
}

const pnpmCheck = run("pnpm", ["--version"], { stdio: "ignore" });
if (pnpmCheck.status !== 0) {
  fail("pnpm is not installed or not on PATH. Run Goal 01 bootstrap in an environment with pnpm.");
}

const packageFiles = [];
walkPackageJson(root, packageFiles);

const fakeScripts = [];
for (const file of packageFiles) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const scripts = json.scripts ?? {};
  for (const [name, value] of Object.entries(scripts)) {
    if (/echo\s+['"]?TODO/i.test(value) || /TODO:\s*implement/i.test(value)) {
      fakeScripts.push(`${relative(root, file)} -> ${name}: ${value}`);
    }
  }
}

if (fakeScripts.length > 0) {
  console.error(fakeScripts.join("\n"));
  fail("Found package scripts that can pass while saying TODO. Replace with real commands or failing placeholders.");
}

for (const script of ["typecheck", "lint", "test", "build"]) {
  console.log(`==> pnpm ${script}`);
  const result = run("pnpm", [script]);
  if (result.status !== 0) {
    fail(`pnpm ${script} failed`);
  }
}
