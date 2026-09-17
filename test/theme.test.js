import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.resolve(__dirname, '../lib/client.js');

test('theme guard: client.js contains zero hardcoded hex colors or rgba literals', () => {
  const content = fs.readFileSync(clientPath, 'utf8');
  const colorPattern = /#[\da-fA-F]{3,8}\b|rgba?\(/g;
  const matches = content.match(colorPattern);
  assert.equal(matches, null, `Found hardcoded color or rgba in lib/client.js: ${matches ? matches.join(', ') : ''}`);
  assert.doesNotMatch(content, /#[\da-f]{3,8}\b|rgba?\(/i, 'lib/client.js must not contain hardcoded hex or rgba');
});
