import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('NavigationContext Architecture & Contract Suite', async (t) => {
  const contextFilePath = path.resolve(process.cwd(), 'src/context/NavigationContext.tsx');

  await t.test('src/context/NavigationContext.tsx exists and conforms to complexity budget (< 150 LOC)', () => {
    assert.ok(fs.existsSync(contextFilePath), 'NavigationContext.tsx must exist');
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 150, `NavigationContext.tsx has ${lineCount} lines, expected < 150`);
  });

  await t.test('exports NavigationProvider and useNavigation hook', () => {
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    assert.match(content, /export\s+function\s+NavigationProvider\b/);
    assert.match(content, /export\s+function\s+useNavigation\b/);
    assert.match(content, /export\s+interface\s+NavigationContextValue\b/);
  });

  await t.test('implements targetHref, isNavigating, navigateTo, and safety timeout', () => {
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    assert.match(content, /targetHref/);
    assert.match(content, /isNavigating/);
    assert.match(content, /navigateTo/);
    assert.match(content, /router\.push/);
    assert.match(content, /6000|SAFETY_TIMEOUT_MS/);
  });

  await t.test('delegates to navigation-state and tracks targetHrefRef for preemptive navigation and cancellation', () => {
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    assert.match(content, /targetHrefRef/);
    assert.match(content, /resolveNavigationIntent/);
    assert.match(content, /resolvePathnameChange/);
    assert.match(content, /intent\.type\s*===\s*['"]CANCEL['"]/);
  });
});
