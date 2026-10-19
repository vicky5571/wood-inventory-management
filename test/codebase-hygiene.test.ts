import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function collectJsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, acc);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(path.relative(process.cwd(), fullPath));
    }
  }
  return acc;
}

test('Codebase TypeScript Hygiene & Dev Quick-Fill Availability Suite', async (t) => {
  await t.test('src/ contains zero legacy .js shadow files', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const jsFiles = collectJsFiles(srcDir);
    assert.deepEqual(
      jsFiles,
      [],
      `Expected 0 .js shadow files in src/, found: ${jsFiles.join(', ')}`
    );
  });

  await t.test('RecordModal and SalesModal keep Isi Cepat (Dev) button unconditionally available in production', () => {
    const recordModal = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ledger/RecordModal.tsx'), 'utf-8');
    const salesModal = fs.readFileSync(path.resolve(process.cwd(), 'src/components/sales/SalesModal.tsx'), 'utf-8');

    assert.match(recordModal, /Isi Cepat \(Dev\)/);
    assert.doesNotMatch(recordModal, /NODE_ENV\s*!==\s*['"]production['"]/);
    assert.match(salesModal, /Isi Cepat \(Dev\)/);
    assert.doesNotMatch(salesModal, /NODE_ENV\s*!==\s*['"]production['"]/);
  });

  await t.test('AGENTS.md and architecture-system-invariants.md accurately document Next.js 15, React 19, and SQLite/Supabase stack', () => {
    const agentsMd = fs.readFileSync(path.resolve(process.cwd(), 'AGENTS.md'), 'utf-8');
    const archMd = fs.readFileSync(path.resolve(process.cwd(), 'docs/architecture-system-invariants.md'), 'utf-8');

    assert.match(agentsMd, /Next\.js 15/);
    assert.match(agentsMd, /React 19/);
    assert.match(archMd, /Next\.js/);
    assert.match(archMd, /node:sqlite/);
  });
});
