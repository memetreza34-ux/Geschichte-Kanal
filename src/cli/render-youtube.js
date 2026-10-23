#!/usr/bin/env node

import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { arg, exists, isMainModule, projectPaths, readJson, writeJson } from '../lib/pipeline.js';

export async function prepareRender(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [meta, timeline, renderPlan] = await Promise.all([readJson(p.meta), readJson(p.timeline), readJson(p.renderPlan)]);
  const renderRoot = path.resolve('public', '__render', meta.videoId);
  await rm(renderRoot, { recursive: true, force: true });
  await mkdir(path.join(renderRoot, 'images'), { recursive: true });
  await mkdir(path.join(renderRoot, 'audio'), { recursive: true });
  await mkdir(path.join(renderRoot, 'sfx'), { recursive: true });

  for (const image of timeline.images) {
    const source = path.join(p.imagesDir, `Bild ${String(image.imageNumber).padStart(2, '0')}.png`);
    if (!(await exists(source))) throw new Error(`Render-Bild fehlt: ${source}`);
    await copyFile(source, path.join(renderRoot, 'images', path.basename(source)));
  }
  await copyFile(p.optimizedAudio, path.join(renderRoot, 'audio', 'YOUTUBE_AUDIO_OPTIMIZED.wav'));

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
  return { p, meta, plan };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run render:youtube -- --dir "youtube/<week>/<slug>" [--output file.mp4]');
  const { p } = await prepareRender(dir);
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
  console.log(`YouTube Render: ${output}`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`YouTube Render: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
