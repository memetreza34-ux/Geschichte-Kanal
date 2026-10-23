#!/usr/bin/env node

import path from 'node:path';
import { arg, isMainModule, probeDuration, projectPaths, readJson, writeJson } from '../lib/pipeline.js';
import { motionFromScene } from '../lib/directing.js';

export async function buildTimeline(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [meta, mapping, renderPlan, pipeline] = await Promise.all([
    readJson(p.meta), readJson(p.mapping), readJson(p.renderPlan), readJson(path.resolve('config/pipeline.json'))
  ]);
  const audioDuration = await probeDuration(p.optimizedAudio);
  const hold = Number(meta.renderPolicy?.endHoldSeconds ?? pipeline.endHoldPolicy?.targetSeconds ?? 1.3);
  const images = mapping.images ?? [];
  if (!images.length) throw new Error('Mapping enthält keine Bilder.');
  if (images.some((image) => !Number.isFinite(Number(image.actualStartSeconds)))) throw new Error('Nicht alle Bilder besitzen gemessene Startzeiten.');

  const timelineImages = images.map((image, index) => {
    const start = index === 0 ? 0 : Number(image.actualStartSeconds);
    const next = images[index + 1];
    const end = next ? Number(next.actualStartSeconds) : audioDuration + hold;
    if (!(end > start)) throw new Error(`Ungültige Dauer bei Bild ${image.imageNumber}: ${start} → ${end}`);
    const durationSeconds = Number((end - start).toFixed(3));
    const motion = Number(meta.directingGateVersion ?? 0) >= 1
      ? motionFromScene(image, durationSeconds)
      : { scaleFrom: 1.01, scaleTo: 1.025, xFrom: 0, xTo: 0, yFrom: 0, yTo: 0 };
    return {
      imageNumber: image.imageNumber,
      file: `__render/${meta.videoId}/images/${image.imageFile}`,
      startSeconds: Number(start.toFixed(3)),
      endSeconds: Number(end.toFixed(3)),
      durationSeconds,
      visualPurpose: image.visualPurpose ?? '',
      topicAnchor: image.topicAnchor ?? '',
      visualForm: image.visualForm ?? '',
      colorPhase: image.colorPhase ?? '',
      motion
    };
  });

  const sounds = (renderPlan.soundEffects ?? []).map((sound) => ({ ...sound, file: sound.file ?? null }));
  const timeline = {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    fps: Number(meta.renderPolicy?.fps ?? pipeline.fps ?? 30),
    width: Number(meta.renderPolicy?.width ?? pipeline.resolution.width),
    height: Number(meta.renderPolicy?.height ?? pipeline.resolution.height),
    audioDurationSeconds: audioDuration,
    endHoldSeconds: hold,
    durationSeconds: Number((audioDuration + hold).toFixed(3)),
    motionPolicy: renderPlan.motionPolicy ?? 'legacy',
    audioFile: `__render/${meta.videoId}/audio/YOUTUBE_AUDIO_OPTIMIZED.wav`,
    images: timelineImages,
    sounds
  };
  await writeJson(p.timeline, timeline);
  console.log(`Timeline gebaut: ${timelineImages.length} Bilder, ${timeline.durationSeconds}s, Motion=${timeline.motionPolicy}`);
  return timeline;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run build:youtube-timeline -- --dir "youtube/<week>/<slug>"');
  await buildTimeline(dir);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Timeline: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
