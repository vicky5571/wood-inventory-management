import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('AppLayout Optimistic Navigation Suite', async (t) => {
  const layoutFilePath = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');

  await t.test('AppLayout.tsx imports NavigationProvider, useNavigation, and Loading skeleton', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    assert.match(content, /NavigationProvider/);
    assert.match(content, /useNavigation/);
    assert.match(content, /import\s+Loading\s+from\s+['"]@\/app\/loading['"]/);
  });

  await t.test('AppLayout conditionally displays Loading skeleton when targetHref is pending', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    assert.match(content, /targetHref/);
    assert.match(content, /<Loading\s*\/>/);
  });

  await t.test('AppLayout conforms to coordinator complexity budget (< 250 LOC)', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 250, `AppLayout.tsx has ${lineCount} lines, expected < 250`);
  });
});
