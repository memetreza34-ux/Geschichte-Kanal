import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { copyDirectory } from '../src/lib/pipeline.js';

// Regression: create:youtube made the target first, and Node 24 cp with errorOnExist then always failed.
test('copyDirectory legt ein neues Projekt an und überschreibt nie ein bestehendes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'copy dir '));
  try {
    const source = path.join(root, 'template');
    await mkdir(path.join(source, '99-technik'), { recursive: true });
    await writeFile(path.join(source, '99-technik', 'video.json'), '{}', 'utf8');
    const target = path.join(root, 'youtube', '2026-KW44', 'neues-video');
    await copyDirectory(source, target);
    assert.equal(await readFile(path.join(target, '99-technik', 'video.json'), 'utf8'), '{}');
    await assert.rejects(copyDirectory(source, target));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
