import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileAsync } from '../src/lib/pipeline.js';

test('Neue Projekterstellung funktioniert aus der Vorlage und erteilt keine Freigabe', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-new-project-'));
  const cli = path.resolve('src/cli/create-youtube-project.js');
  try {
    await cp('config', path.join(dir, 'config'), { recursive: true });
    await mkdir(path.join(dir, 'youtube', 'templates'), { recursive: true });
    await cp('youtube/templates/video-template', path.join(dir, 'youtube/templates/video-template'), { recursive: true });
    const args = [cli, '--topic', 'Synthetische neue Projektprobe', '--week', '2026-KW43', '--slug', 'synthetic-project'];
    await execFileAsync(process.execPath, args, { cwd: dir });
    const project = path.join(dir, 'youtube', '2026-KW43', 'synthetic-project');
    const meta = JSON.parse(await readFile(path.join(project, '99-technik', 'video.json'), 'utf8'));
    const review = JSON.parse(await readFile(path.join(project, '99-technik', 'CREATIVE_REVIEW.json'), 'utf8'));
    assert.equal(meta.schemaVersion, 5);
    assert.equal(meta.creativeEvidenceVersion, 1);
    assert.equal(meta.phase1Ready, false);
    assert.equal(review.script.status, 'PLANNED');
    assert.equal(review.sequence.status, 'PLANNED');
    await assert.rejects(() => execFileAsync(process.execPath, args, { cwd: dir }), /Projekt existiert bereits|Thema nicht freigegeben/);
    const unsafe = args.map(value => value === '2026-KW43' ? '../../outside' : value);
    await assert.rejects(() => execFileAsync(process.execPath, unsafe, { cwd: dir }), /videoId/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
