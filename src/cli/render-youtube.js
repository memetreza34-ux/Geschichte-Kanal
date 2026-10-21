#!/usr/bin/env node

import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { arg, exists, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';
import { safeRenderDirectory } from '../lib/production-integrity.js';
import { validatePhase1Full } from './validate-youtube-phase1-full.js';
import { validatePhase2 } from './validate-youtube-phase2.js';
import { validatePhase3 } from './validate-youtube-phase3.js';
import { validatePacing } from './validate-youtube-pacing.js';
import { verifyPhase3ImageLock } from './phase3-image-lock.js';
import { inspectVideo } from '../lib/media-integrity.js';

export async function prepareRender(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [meta, timeline, renderPlan] = await Promise.all([readJson(p.meta), readJson(p.timeline), readJson(p.renderPlan)]);
  const renderRoot = await safeRenderDirectory(meta.videoId);
  for (const validate of [validatePhase1Full, validatePhase2, validatePhase3, validatePacing]) {
    const result = await validate(projectDirectory);
    if (!result.passed) throw new Error(`Render blockiert: ${result.errors.join('\n')}`);
  }
  const lock = await readJson(p.phase3ImageLock);
  await rm(renderRoot, { recursive: true, force: true });
  await mkdir(path.join(renderRoot, 'images'), { recursive: true });
  await mkdir(path.join(renderRoot, 'audio'), { recursive: true });
  await mkdir(path.join(renderRoot, 'sfx'), { recursive: true });

  for (const image of timeline.images) {
    const source = path.join(p.imagesDir, `Bild ${String(image.imageNumber).padStart(2, '0')}.png`);
    if (!(await exists(source))) throw new Error(`Render-Bild fehlt: ${source}`);
    await copyFile(source, path.join(renderRoot, 'images', path.basename(source)));
    const approved = lock.images.find(item => item.imageNumber === image.imageNumber);
    if (!approved || await sha256(path.join(renderRoot, 'images', path.basename(source))) !== approved.sha256) throw new Error(`Render-Kopie entspricht nicht dem Bildlock: ${path.basename(source)}`);
  }
  await copyFile(p.optimizedAudio, path.join(renderRoot, 'audio', 'YOUTUBE_AUDIO_OPTIMIZED.wav'));
  if (await sha256(path.join(renderRoot, 'audio', 'YOUTUBE_AUDIO_OPTIMIZED.wav')) !== timeline.audioFingerprintSha256) throw new Error('Render-Audiokopie stimmt nicht mit der Timeline überein.');

  const sounds = [];
  for (let index = 0; index < (renderPlan.soundEffects ?? []).length; index += 1) {
    const sound = renderPlan.soundEffects[index];
    if (!sound.file) continue;
    const source = path.resolve(sound.file);
    if (!(await exists(source))) throw new Error(`SFX-Datei fehlt: ${sound.file}`);
    const name = `${String(index + 1).padStart(2, '0')}-${path.basename(source)}`;
    await copyFile(source, path.join(renderRoot, 'sfx', name));
    const image = timeline.images.find((item) => Number(item.imageNumber) === Number(sound.imageNumber));
    sounds.push({
      ...sound,
      file: `__render/${meta.videoId}/sfx/${name}`,
      fromSeconds: Math.max(0, Number(image?.startSeconds ?? 0) + Number(sound.offsetSeconds ?? 0))
    });
  }

  const plan = {
    ...timeline,
    audioFile: `__render/${meta.videoId}/audio/YOUTUBE_AUDIO_OPTIMIZED.wav`,
    sounds
  };
  await writeJson(p.renderProps, { plan });
  await verifyPhase3ImageLock(projectDirectory);
  return { p, meta, plan };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run render:youtube -- --dir "youtube/<week>/<slug>" [--output file.mp4]');
  const { p, plan } = await prepareRender(dir);
  await mkdir(p.exportDir, { recursive: true });
  const output = path.resolve(arg('--output') ?? path.join(p.exportDir, 'FINAL_VIDEO.mp4'));
  const crf = arg('--crf') ?? '18';

  const result = spawnSync('npx', [
    'remotion', 'render',
    'src/youtube-renderer/index.jsx',
    'YoutubeVideo',
    output,
    `--props=${p.renderProps}`,
    '--codec=h264',
    `--crf=${crf}`,
    '--overwrite'
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Remotion-Render fehlgeschlagen (Exit ${result.status}).`);
  await verifyPhase3ImageLock(dir);
  const media = await inspectVideo(output, plan);
  if (!media.passed) throw new Error(media.errors.join('\n'));
  console.log(`YouTube Render: ${output}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`YouTube Render: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
