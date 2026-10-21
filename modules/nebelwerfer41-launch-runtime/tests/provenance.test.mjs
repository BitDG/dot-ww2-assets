import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('N4 final visual references and shared PGFCombatFX bytes match the frozen source', async () => {
  const root = new URL('../', import.meta.url), manifest = JSON.parse(await readFile(new URL('source-provenance.json', root)));
  assert.equal(manifest.sourceVersion, '0.4.2-runtime');
  for (const entry of [...manifest.files, ...manifest.sharedRuntime]) {
    const bytes = await readFile(new URL(entry.path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.path);
  }
});
