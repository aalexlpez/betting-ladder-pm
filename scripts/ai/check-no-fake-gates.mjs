#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'build', 'release', 'coverage'].includes(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (entry === 'package.json') files.push(path);
  }
}
walk(root);

let failed = false;
for (const file of files) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const scripts = json.scripts ?? {};
  for (const name of ['typecheck', 'lint', 'test', 'build']) {
    const value = scripts[name];
    if (!value) continue;
    if (/echo\s+['\"]?TODO/i.test(value) || /TODO:\s*implement/i.test(value)) {
      console.error(`Fake-positive script detected: ${relative(root, file)} -> ${name}: ${value}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('No fake-positive quality gate scripts detected.');
