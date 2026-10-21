#!/usr/bin/env node

import path from 'node:path';
import { arg, probeDuration, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';
import { timelineImages } from '../lib/timeline.js';
import { alignedMappingErrors, fingerprint, validateVideoId } from '../lib/production-integrity.js';

export async function buildTimeline(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [meta, mapping, renderPlan, pipeline] = await Promise.all([
    readJson(p.meta), readJson(p.mapping), readJson(p.renderPlan), readJson(path.resolve('config/pipeline.json'))
  ]);
  const audioDuration = await probeDuration(p.optimizedAudio);
  validateVideoId(meta.videoId);
  const hold = Number(meta.renderPolicy?.endHoldSeconds ?? pipeline.endHoldPolicy?.targetSeconds ?? 1.3);
  const images = mapping.images ?? [];
  if (!images.length) throw new Error('Mapping enthält keine Bilder.');
  const timingErrors = alignedMappingErrors(images);
  if (timingErrors.length) throw new Error(timingErrors.join('\n'));
  if (!Number.isFinite(hold) || hold < pipeline.endHoldPolicy.minimumSeconds || hold > pipeline.endHoldPolicy.maximumSeconds) throw new Error('Ungültiger Schluss-Hold.');
  if (Math.abs(images.at(-1).actualEndSeconds - audioDuration) > 0.05) throw new Error('Mapping-Ende passt nicht zur aktuellen Audiodauer.');

  const scenes = timelineImages({ meta, mapping, audioDuration, hold });

  const sounds = (renderPlan.soundEffects ?? []).map((sound) => ({ ...sound, file: sound.file ?? null }));
  const timeline = {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    fps: Number(meta.renderPolicy?.fps ?? pipeline.fps ?? 30),
    width: Number(meta.renderPolicy?.width ?? pipeline.resolution.width),
    height: Number(meta.renderPolicy?.height ?? pipeline.resolution.height),
    audioDurationSeconds: audioDuration,
    audioFingerprintSha256: await sha256(p.optimizedAudio),
    mappingFingerprint: fingerprint(mapping),
    renderPlanFingerprint: fingerprint(renderPlan),
    endHoldSeconds: hold,
    durationSeconds: Number((audioDuration + hold).toFixed(3)),
    motionPolicy: renderPlan.motionPolicy ?? 'legacy',
    audioFile: `__render/${meta.videoId}/audio/YOUTUBE_AUDIO_OPTIMIZED.wav`,
    images: scenes,
    sounds
  };
  await writeJson(p.timeline, timeline);
  console.log(`Timeline gebaut: ${scenes.length} Bilder, ${timeline.durationSeconds}s, Motion=${timeline.motionPolicy}`);
  return timeline;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run build:youtube-timeline -- --dir "youtube/<week>/<slug>"');
  await buildTimeline(dir);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Timeline: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
