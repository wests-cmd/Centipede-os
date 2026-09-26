#!/usr/bin/env bun
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const rootDir = process.cwd();
const srcDir = join(rootDir, 'src');
const scriptsDir = join(rootDir, 'scripts');

// REALITY-LINT-ALLOW: reason = "Linter pattern definition"
const SUSPICIOUS_PATTERNS = [
  { pattern: /\b(fake|mock|demo)\b/i, name: 'Fake / Mock Identifier' }, // REALITY-LINT-ALLOW: reason = "Linter regex pattern"
  { pattern: /setTimeout\s*\(\s*[^,]+,\s*(1000|1200|1500|2000)\s*\)/, name: 'Timer-based Success Simulation' },
];

let totalFilesChecked = 0;
let violationsFound = 0;
const allowedExceptions: string[] = [];

function scanDirectory(dir: string) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.py'))) {
      totalFilesChecked++;
      const content = readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('REALITY-LINT-ALLOW:')) {
          allowedExceptions.push(`${fullPath.replace(rootDir, '')}:${index + 1} -> ${line.trim()}`);
          return;
        }

        for (const rule of SUSPICIOUS_PATTERNS) {
          if (rule.pattern.test(line)) {
            // Ignore type definitions, interface definitions, imports, comments, or standard JSX attributes
            if (line.includes('type ') || line.includes('interface ') || line.includes('import ') || line.includes('//') || line.includes('#') || line.includes('placeholder=')) {
              continue;
            }
            console.error(`[REALITY LINT VIOLATION] ${rule.name} found in ${fullPath.replace(rootDir, '')}:${index + 1}`);
            console.error(`   Line: ${line.trim()}`);
            violationsFound++;
          }
        }
      });
    }
  }
}

console.log(`===========================================================`);
console.log(` CENTIPEDE OS STATIC REALITY LINTER`);
console.log(`===========================================================`);

scanDirectory(srcDir);
scanDirectory(scriptsDir);

console.log(`\nFiles Checked: ${totalFilesChecked}`);
console.log(`Allowed Exemptions: ${allowedExceptions.length}`);
if (allowedExceptions.length > 0) {
  console.log(`Exemptions List:`);
  allowedExceptions.forEach((e) => console.log(` - ${e}`));
}

if (violationsFound > 0) {
  console.error(`\n[FAIL] Reality Lint Failed with ${violationsFound} violation(s)!`);
  process.exit(1);
} else {
  console.log(`\n[PASS] Production Reality Lint Completed Successfully (0 violations).`);
  process.exit(0);
}
