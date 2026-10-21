import assert from 'node:assert/strict';
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { alignedMappingErrors, alignmentFingerprint, fingerprint, safeRenderDirectory, timelineErrors } from '../src/lib/production-integrity.js';
import { sceneFrames } from '../src/lib/render-math.js';
import { inspectVideo } from '../src/lib/media-integrity.js';
import { execFileAsync, projectPaths, sha256, writeJson } from '../src/lib/pipeline.js';
import { alignProject } from '../src/cli/auto-align-youtube.js';
import { prepareRender } from '../src/cli/render-youtube.js';
import { buildTimeline } from '../src/cli/build-youtube-timeline.js';
import { validatePhase3 } from '../src/cli/validate-youtube-phase3.js';
import { createPhase3ImageLock } from '../src/cli/phase3-image-lock.js';

test('Render-Vorbereitung verwirft Pfadtraversal vor dem Löschen bestehender Dateien', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-render-path-'));
  try {
    const p = projectPaths(dir);
    const sentinel = path.join(dir, 'keep.txt');
    await writeFile(sentinel, 'keep');
    await writeJson(p.meta, { videoId: `../../${path.basename(dir)}` });
    await writeJson(p.timeline, {});
    await writeJson(p.renderPlan, {});
    await assert.rejects(() => prepareRender(dir), /videoId/);
    assert.equal(await readFile(sentinel, 'utf8'), 'keep');
    const root = path.join(dir, 'public', '__render');
    await mkdir(root, { recursive: true });
    await symlink(dir, path.join(root, 'linked'));
    await assert.rejects(() => safeRenderDirectory('linked', root), /Symlink/);
    for (const id of ['', '..', '../outside', '/absolute', 'a/b', 'a\\b']) {
      await assert.rejects(() => safeRenderDirectory(id, root), /videoId/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Alignment-Cache wird bei Anker-, Modell-, Sprach- und Skriptänderungen ungültig', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-alignment-cache-'));
  const previousPath = process.env.PATH;
  try {
    const p = projectPaths(dir);
    await mkdir(path.dirname(p.script), { recursive: true });
    await writeFile(p.script, 'Erste Szene. Zweite Szene.');
    await writeJson(p.meta, { language: 'de' });
    await mkdir(p.techDir, { recursive: true });
    await execFileAsync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '4', p.optimizedAudio]);
    const mapping = { images: [
      { imageNumber: 1, imageFile: 'Bild 01.png', startAnchor: 'Erste Szene', narrationBeat: 'Erste Szene.', actualStartSeconds: 0, actualEndSeconds: 2 },
      { imageNumber: 2, imageFile: 'Bild 02.png', startAnchor: 'Zweite Szene', narrationBeat: 'Zweite Szene.', actualStartSeconds: 2, actualEndSeconds: 4 }
    ] };
    await writeJson(p.mapping, mapping);
    const inputs = { model: 'small', language: 'de', scriptSha256: await sha256(p.script) };
    const original = alignmentFingerprint(mapping, inputs);
    for (const change of [{ model: 'medium' }, { language: 'en' }, { scriptSha256: 'changed' }]) {
      assert.notEqual(alignmentFingerprint(mapping, { ...inputs, ...change }), original);
    }
    await writeJson(p.alignmentEvidence, { passed: true, audioFingerprintSha256: await sha256(p.optimizedAudio), inputFingerprint: original, mappingFingerprint: fingerprint(mapping) });
    assert.equal((await alignProject(dir)).reused, true);
    const fakeBin = path.join(dir, 'bin');
    await mkdir(fakeBin);
    const whisper = path.join(fakeBin, 'whisper');
    await writeFile(whisper, '#!/bin/sh\nexit 73\n');
    await chmod(whisper, 0o755);
    process.env.PATH = fakeBin + path.delimiter + previousPath;
    mapping.images[1].startAnchor = 'Neuer Anker';
    await writeJson(p.mapping, mapping);
    await assert.rejects(() => alignProject(dir), error => error.code === 73);
    mapping.images[1].startAnchor = 'Zweite Szene';
    mapping.images[1].actualStartSeconds = null;
    await writeJson(p.mapping, mapping);
    await writeJson(p.renderPlan, {});
    await writeJson(p.meta, { videoId: 'test-alignment' });
    await assert.rejects(() => buildTimeline(dir), /Start-\/Endzeiten/);
    assert.ok(alignedMappingErrors(mapping.images).length);
  } finally {
    process.env.PATH = previousPath;
    await rm(dir, { recursive: true, force: true });
  }
});

test('Timeline verwirft Lücken und der letzte Frame bleibt vollständig belegt', () => {
  const images = [
    { imageNumber: 1, startSeconds: 0, endSeconds: 1, durationSeconds: 1 },
    { imageNumber: 2, startSeconds: 1, endSeconds: 2.001, durationSeconds: 1.001 }
  ];
  assert.deepEqual(timelineErrors({ images, durationSeconds: 2.001 }, 2), []);
  const totalFrames = Math.ceil(2.001 * 30);
  const last = sceneFrames(images[1], 1, 2, 30, totalFrames);
  assert.equal(last.from + last.durationInFrames, totalFrames);
  assert.equal(totalFrames, 61);
  assert.ok(timelineErrors({ images: [images[0], { ...images[1], startSeconds: 1.5 }], durationSeconds: 2.001 }, 2).length);
});

test('MP4-Prüfung decodiert reale Medien und verwirft große Attrappen oder fehlendes Audio', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-mp4-integrity-'));
  const timeline = { width: 320, height: 180, fps: 30, durationSeconds: 1 };
  try {
    const fake = path.join(dir, 'fake.mp4');
    await writeFile(fake, Buffer.alloc(100001, 65));
    assert.equal((await inspectVideo(fake, timeline)).passed, false);
    const video = path.join(dir, 'real.mp4');
    await execFileAsync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=30', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', video]);
    assert.deepEqual(await inspectVideo(video, timeline), { passed: true, errors: [] });
    const silent = path.join(dir, 'no-audio.mp4');
    await execFileAsync('ffmpeg', ['-v', 'error', '-i', video, '-an', '-c:v', 'copy', silent]);
    assert.match((await inspectVideo(silent, timeline)).errors.join(' '), /Audiospur/);
    assert.match((await inspectVideo(video, { ...timeline, durationSeconds: 5 })).errors.join(' '), /Dauer/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Phase 3 bindet bestandene Berichte an Audio, Skript, Mapping, Renderplan und tatsächliche Timeline', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-phase3-inputs-'));
  try {
    const p = projectPaths(dir);
    await mkdir(p.audioDir, { recursive: true });
    await mkdir(p.imagesDir, { recursive: true });
    await mkdir(path.dirname(p.script), { recursive: true });
    await mkdir(p.techDir, { recursive: true });
    await writeFile(p.script, 'Eine Straße wird gesperrt.');
    const source = path.join(p.audioDir, 'voice.wav');
    await execFileAsync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', source]);
    await copyFile(source, p.optimizedAudio);
    await execFileAsync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=1280x720', '-frames:v', '1', path.join(p.imagesDir, 'Bild 01.png')]);
    const meta = { videoId: 'phase3-inputs', language: 'de', plannedImageCount: 1, imageIntegrityGateVersion: 1, renderPolicy: { width: 320, height: 180, fps: 30, endHoldSeconds: 1.3 } };
    const mapping = { images: [{ imageNumber: 1, imageFile: 'Bild 01.png', startAnchor: 'Eine Straße', narrationBeat: 'Eine Straße wird gesperrt.', actualStartSeconds: 0, actualEndSeconds: 1 }] };
    const renderPlan = { soundEffects: [] };
    await writeJson(p.meta, meta);
    await writeJson(p.mapping, mapping);
    await writeJson(p.renderPlan, renderPlan);
    const scriptSha256 = await sha256(p.script);
    const audioHash = await sha256(p.optimizedAudio);
    await writeJson(p.alignmentEvidence, { passed: true, model: 'small', scriptSha256, audioFingerprintSha256: audioHash, mappingFingerprint: fingerprint(mapping), inputFingerprint: alignmentFingerprint(mapping, { model: 'small', language: 'de', scriptSha256 }) });
    await writeJson(path.join(p.techDir, 'YOUTUBE_AUDIO_PACING.json'), { passed: true, optimizedFingerprintSha256: audioHash, sourceFingerprintSha256: await sha256(source) });
    await createPhase3ImageLock(dir);
    const timeline = await buildTimeline(dir);
    assert.deepEqual((await validatePhase3(dir)).errors, []);
    await writeFile(p.script, 'Ein neuer Skripttext.');
    assert.match((await validatePhase3(dir)).errors.join(' '), /Skript sind veraltet/);
    await writeFile(p.script, 'Eine Straße wird gesperrt.');
    await writeJson(p.renderPlan, { soundEffects: [{ file: 'another.wav' }] });
    assert.match((await validatePhase3(dir)).errors.join(' '), /Renderplan wurde/);
    await writeJson(p.renderPlan, renderPlan);
    const changed = structuredClone(timeline);
    changed.images[0].motion.scaleTo = 3;
    await writeJson(p.timeline, changed);
    assert.match((await validatePhase3(dir)).errors.join(' '), /Timeline-Szenen entsprechen nicht/);
    await writeJson(p.timeline, timeline);
    await writeFile(source, 'replaced voice');
    assert.match((await validatePhase3(dir)).errors.join(' '), /Nutzeroriginal/);
    await copyFile(p.optimizedAudio, source);
    await writeFile(p.optimizedAudio, 'broken internal audio');
    await assert.rejects(() => validatePhase3(dir), /ffprobe/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Direkter Render kann fehlende Bildfreigaben nicht umgehen und leert kein Staging', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-render-gate-'));
  const staging = path.resolve('public', '__render', path.basename(dir));
  try {
    await cp('youtube/2026-KW40_28-09_bis_04-10/hannibal-feuertrick', dir, { recursive: true });
    const p = projectPaths(dir);
    const meta = JSON.parse(await readFile(p.meta, 'utf8'));
    meta.videoId = path.basename(dir);
    await writeJson(p.meta, meta);
    await writeJson(p.timeline, {});
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, 'keep.txt'), 'review first');
    await assert.rejects(() => prepareRender(dir), /Render blockiert/);
    assert.equal(await readFile(path.join(staging, 'keep.txt'), 'utf8'), 'review first');
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(dir, { recursive: true, force: true });
  }
});
