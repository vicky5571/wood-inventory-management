#!/usr/bin/env node
/**
 * scripts/drift-check.ts
 *
 * Executable architectural invariant verifier.
 * Blocks test/build pipeline when codebase drifts from established invariants.
 *
 * Run manually:  npm run drift:check
 * Run via gate:  npm test (wired via "pretest" hook)
 *
 * Exit codes:
 *   0 — No drift detected
 *   1 — One or more violations found
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();

// ============================================================================
// Configuration
// ============================================================================

const MAX_COORDINATOR_LOC = 250;

/** Component file suffixes considered "coordinator" (page-level orchestrators). */
const COORDINATOR_SUFFIXES = ['View.tsx', 'page.tsx'];

/** Paths excluded from scanning (dependencies, generated, caches). */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  '.next-check',
  '.git',
  '.serena',
  '.superpowers',
  'dist',
  'build',
  'coverage',
]);

/** SSOT exemption: interfaces matching these suffixes may be defined outside src/types. */
const SSOT_EXEMPT_SUFFIXES = [
  'Props',           // React component props
  'State',           // Local component state
  'Config',          // Local configuration shapes
  'Options',         // Local option bags
  'Option',          // Combobox or select item options
  'Context',         // React context types
  'Params',          // Function parameter bags
  'Result',          // Local function result shapes (if clearly local)
  'Input',           // Function input bags
  'Row',             // Database row shapes in persistence adapters
  'Adapter',         // Adapter pattern interfaces
  'ChartData',       // Chart.js data payload shapes
  'Shape',           // Type shape documentation
  'Value',           // Context value types
  'Action',          // Reducer action types
  'Field',           // Table or form field union types
  'Direction',       // Sort or layout direction union types
];

// ============================================================================
// Violation Collector
// ============================================================================

interface Violation {
  rule: string;
  file: string;
  message: string;
}

const violations: Violation[] = [];

function violate(rule: string, file: string, message: string): void {
  violations.push({ rule, file, message });
}

// ============================================================================
// File System Helpers
// ============================================================================

function walkDir(dir: string, fileHandler: (fullPath: string) => void): void {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkDir(fullPath, fileHandler);
    } else {
      fileHandler(fullPath);
    }
  }
}

function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

function readSafe(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// ============================================================================
// Rule 1: God File Prevention (<250 LOC for coordinators)
// ============================================================================

function checkCoordinatorLineLimit(): void {
  const componentsRoot = join(ROOT, 'src', 'components');
  const appRoot = join(ROOT, 'app');

  const scan = (fullPath: string) => {
    if (!COORDINATOR_SUFFIXES.some((s) => fullPath.endsWith(s))) return;
    // Skip test files and type declaration files
    if (fullPath.endsWith('.test.tsx') || fullPath.endsWith('.d.ts')) return;

    const lines = countLines(fullPath);
    if (lines > MAX_COORDINATOR_LOC) {
      violate(
        'GOD_FILE',
        relative(ROOT, fullPath),
        `${lines} LOC exceeds ${MAX_COORDINATOR_LOC} LOC Strangler Pattern limit`
      );
    }
  };

  walkDir(componentsRoot, scan);
  walkDir(appRoot, scan);
}

// ============================================================================
// Rule 2: SSOT Enforcement (no domain interfaces outside src/types/)
// ============================================================================

function checkSsotCompliance(): void {
  const srcRoot = join(ROOT, 'src');

  walkDir(srcRoot, (fullPath) => {
    const rel = relative(ROOT, fullPath);

    // Only scan .ts and .tsx files
    const ext = extname(fullPath);
    if (ext !== '.ts' && ext !== '.tsx') return;

    // SSOT itself is allowed
    if (rel.startsWith('src/types/')) return;

    // Test files are allowed inline types for fixtures
    if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx')) return;

    const content = readSafe(fullPath);
    // Match: `export interface Xxx` or `export type Xxx =`
    const matches = Array.from(
      content.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)
    );
    if (matches.length === 0) return;

    for (const match of matches) {
      const name = match[1];
      const isExempt = SSOT_EXEMPT_SUFFIXES.some((suffix) => name.endsWith(suffix));
      if (isExempt) continue;

      violate(
        'SSOT_VIOLATION',
        rel,
        `Domain-like type "${name}" defined outside src/types/index.ts (use SSOT or rename with Props/State/Config/Options/Context/Params/Result suffix if truly local)`
      );
    }
  });
}

// ============================================================================
// Rule 3: Spec-Plan Pairing (every plan has a matching spec)
// ============================================================================

function checkSpecPlanPairing(): void {
  const plansDir = join(ROOT, 'docs', 'superpowers', 'plans');
  const specsDir = join(ROOT, 'docs', 'superpowers', 'specs');

  if (!existsSync(plansDir) || !existsSync(specsDir)) return;

  const plans = readdirSync(plansDir).filter(
    (f) => f.endsWith('.md') && f !== 'README.md'
  );
  const specs = readdirSync(specsDir).filter(
    (f) => f.endsWith('.md') && f !== 'README.md'
  );

  const specSet = new Set(specs);

  for (const plan of plans) {
    const base = plan.replace(/\.md$/, '');

    // Exemption: plans whose topic begins with "refactor-", "cleanup-", or "chore-"
    // are single-file hygiene work with no new design decisions.
    // Example: 2026-10-21-refactor-login-page-god-file.md
    const topic = base.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (/^(refactor|cleanup|chore)-/.test(topic)) {
      continue;
    }

    const expectedSpec = `${base}-design.md`;
    if (!specSet.has(expectedSpec)) {
      violate(
        'MISSING_SPEC',
        `docs/superpowers/plans/${plan}`,
        `No matching spec found. Expected: docs/superpowers/specs/${expectedSpec}`
      );
    }
  }
}

// ============================================================================
// Rule 4: Required Documentation Files Exist
// ============================================================================

function checkRequiredDocs(): void {
  const required = [
    'AGENTS.md',
    'docs/SESSION_STATE.md',
    'docs/architecture-system-invariants.md',
    'docs/superpowers/specs/README.md',
    'docs/superpowers/plans/README.md',
  ];

  for (const path of required) {
    if (!existsSync(join(ROOT, path))) {
      violate('MISSING_DOC', path, 'Required documentation artifact missing');
    }
  }
}

// ============================================================================
// Rule 5: No `any` without justification
// ============================================================================

function checkNoUnjustifiedAny(): void {
  const srcRoot = join(ROOT, 'src');

  walkDir(srcRoot, (fullPath) => {
    const ext = extname(fullPath);
    if (ext !== '.ts' && ext !== '.tsx') return;
    if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx')) return;

    const rel = relative(ROOT, fullPath);
    const content = readSafe(fullPath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match standalone `any` type (not inside strings or comments)
      // Simple heuristic: look for `: any` or `as any` or `<any>` or `any[]`
      const anyMatch = /(?:[:,]\s*any\b|as\s+any\b|<any>|any\[\])/.exec(line);
      if (!anyMatch) continue;

      // Allow if preceding line has @ts-expect-error justification
      const prevLine = lines[i - 1] || '';
      const sameLineComment = line.includes('// @ts-expect-error') || line.includes('// eslint-disable');
      const prevLineJustified = /@ts-expect-error|@ts-ignore|eslint-disable/.test(prevLine);

      if (!sameLineComment && !prevLineJustified) {
        violate(
          'UNJUSTIFIED_ANY',
          rel,
          `Line ${i + 1}: "any" type used without @ts-expect-error justification`
        );
      }
    }
  });
}

// ============================================================================
// Baseline Mode: Pre-existing violations are grandfathered.
// Only NEW violations fail the gate.
// Regenerate baseline: `node scripts/drift-check.ts --write-baseline`
// ============================================================================

const BASELINE_PATH = join(ROOT, 'scripts', 'drift-baseline.json');

interface Baseline {
  generatedAt: string;
  totalCount: number;
  byRule: Record<string, number>;
  /** Fingerprint of each violation for exact matching (file + rule + message) */
  fingerprints: string[];
}

function fingerprint(v: Violation): string {
  return `${v.rule}::${v.file}::${v.message}`;
}

function loadBaseline(): Baseline | null {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeBaseline(): void {
  const byRule: Record<string, number> = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] || 0) + 1;
  }
  const baseline: Baseline = {
    generatedAt: new Date().toISOString(),
    totalCount: violations.length,
    byRule,
    fingerprints: violations.map(fingerprint).sort(),
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✍️  Baseline written to ${relative(ROOT, BASELINE_PATH)}`);
  console.log(`   Total violations grandfathered: ${baseline.totalCount}`);
  for (const [rule, count] of Object.entries(baseline.byRule)) {
    console.log(`     [${rule}]: ${count}`);
  }
}

// ============================================================================
// Report & Exit
// ============================================================================

function report(): void {
  const writeBaselineMode = process.argv.includes('--write-baseline');

  if (writeBaselineMode) {
    writeBaseline();
    process.exit(0);
  }

  const baseline = loadBaseline();
  const baselineSet = new Set(baseline?.fingerprints ?? []);
  const newViolations = violations.filter((v) => !baselineSet.has(fingerprint(v)));

  if (newViolations.length === 0) {
    if (violations.length === 0) {
      console.log('✅ No drift detected');
    } else {
      console.log(`✅ No new drift (${violations.length} pre-existing violations grandfathered)`);
    }
    console.log(`   Rules checked: GOD_FILE, SSOT_VIOLATION, MISSING_SPEC, MISSING_DOC, UNJUSTIFIED_ANY`);
    process.exit(0);
  }

  console.error(`\n❌ ${newViolations.length} NEW drift violation(s) detected:\n`);

  const byRule = new Map<string, Violation[]>();
  for (const v of newViolations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule)!.push(v);
  }

  for (const [rule, items] of byRule.entries()) {
    console.error(`\n[${rule}] (${items.length})`);
    for (const item of items) {
      console.error(`  ${item.file}`);
      console.error(`    → ${item.message}`);
    }
  }

  console.error(`\nTotal NEW: ${newViolations.length} violation(s). Fix before proceeding.`);
  console.error(`Pre-existing (grandfathered): ${baseline?.totalCount ?? 0}`);
  console.error(`See AGENTS.md "NON-NEGOTIABLE VERIFICATION GATES" section.\n`);
  console.error(`To regenerate baseline (if intentionally accepting new violations):`);
  console.error(`  node scripts/drift-check.ts --write-baseline\n`);
  process.exit(1);
}

// ============================================================================
// Main
// ============================================================================

console.log('🔍 Running drift check...\n');

checkRequiredDocs();
checkSpecPlanPairing();
checkCoordinatorLineLimit();
checkSsotCompliance();
checkNoUnjustifiedAny();

report();
