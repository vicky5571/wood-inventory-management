import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Regex detecting Unicode Extended Pictographic and common Emoji dingbats/symbols
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

interface EmojiFinding {
  file: string;
  line: number;
  emoji: string;
  snippet: string;
}

function scanDirectoryForEmojis(dirPath: string, findings: EmojiFinding[] = []): EmojiFinding[] {
  if (!fs.existsSync(dirPath)) return findings;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        scanDirectoryForEmojis(fullPath, findings);
      }
    } else if (/\.(tsx?|jsx?|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const match = line.match(EMOJI_REGEX);
        if (match) {
          findings.push({
            file: path.relative(process.cwd(), fullPath),
            line: idx + 1,
            emoji: match[0],
            snippet: line.trim(),
          });
        }
      });
    }
  }

  return findings;
}

test('UI Emoji Hygiene Suite — Zero AI Slop Emojis in Frontend', async (t) => {
  await t.test('app/ directory contains zero emoji characters', () => {
    const appDir = path.resolve(process.cwd(), 'app');
    const findings = scanDirectoryForEmojis(appDir);
    assert.deepEqual(
      findings,
      [],
      `Found emojis in app/:\n${findings.map((f) => `  ${f.file}:${f.line} [${f.emoji}] -> ${f.snippet}`).join('\n')}`
    );
  });

  await t.test('src/ directory contains zero emoji characters', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const findings = scanDirectoryForEmojis(srcDir);
    assert.deepEqual(
      findings,
      [],
      `Found emojis in src/:\n${findings.map((f) => `  ${f.file}:${f.line} [${f.emoji}] -> ${f.snippet}`).join('\n')}`
    );
  });
});
