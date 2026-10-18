/**
 * test/loading-skeleton.test.ts
 *
 * Unit and structural verification suite for the root Next.js App Router
 * loading skeleton (app/loading.tsx). Ensures immediate transition feedback,
 * accessibility compliance, and visual design token alignment.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('App Loading Skeleton Architecture & Accessibility Suite', async (t) => {
  const loadingFilePath = path.resolve(process.cwd(), 'app/loading.tsx');

  await t.test('app/loading.tsx exists in root app directory for automatic Suspense integration', () => {
    assert.ok(fs.existsSync(loadingFilePath), 'app/loading.tsx must exist');
  });

  await t.test('app/loading.tsx exports a default React functional component', async () => {
    const content = fs.readFileSync(loadingFilePath, 'utf-8');
    assert.match(
      content,
      /export\s+default\s+function\s+(Loading|RootLoading|PageLoading)\b/,
      'app/loading.tsx must export a default function component'
    );
  });

  await t.test('app/loading.tsx implements ARIA live and status accessibility attributes', () => {
    const content = fs.readFileSync(loadingFilePath, 'utf-8');
    assert.match(content, /role="status"/, 'Must include role="status" for screen reader announcements');
    assert.match(content, /aria-busy="true"/, 'Must mark container as aria-busy="true" during loading');
    assert.match(content, /aria-label=/i, 'Must provide descriptive aria-label');
  });

  await t.test('app/loading.tsx renders header, KPI cards, and content table skeletons with pulse animation', () => {
    const content = fs.readFileSync(loadingFilePath, 'utf-8');
    // Must utilize animate-pulse for shimmer feedback
    assert.match(content, /animate-pulse/, 'Must include Tailwind animate-pulse class');

    // Must render metric KPI cards grid (e.g. 4 cards)
    assert.match(content, /grid-cols-1|grid-cols-2|grid-cols-4/, 'Must structure KPI cards with responsive grid');

    // Must include visually hidden text for accessibility
    assert.match(content, /sr-only/, 'Must provide sr-only text for assistive technologies');
  });

  await t.test('app/loading.tsx conforms to architectural complexity rules (< 250 LOC)', () => {
    const content = fs.readFileSync(loadingFilePath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 250, `app/loading.tsx has ${lineCount} lines, expected < 250`);
  });
});
