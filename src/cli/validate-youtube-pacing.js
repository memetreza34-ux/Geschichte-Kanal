#!/usr/bin/env node

import path from 'node:path';
import { arg, isMainModule, projectPaths, readJson } from '../lib/pipeline.js';

export async function validatePacing(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [timeline, pipeline, meta] = await Promise.all([
    readJson(p.timeline), readJson(path.resolve('config/pipeline.json')), readJson(p.meta)
  ]);
  const directing = Number(meta.directingGateVersion ?? 0) >= 1
    ? await readJson(path.resolve(meta.directingPolicyFile || 'config/directing-policy.json'))
    : null;
  const policy = pipeline.imagePolicy;
  const semantic = directing?.semanticPacing ?? null;
  const errors = [];
  const warnings = [];
  const images = timeline.images ?? [];
  if (!images.length) errors.push('Timeline enthält keine Bilder.');

  const absoluteMin = Number(semantic?.absoluteMinimumSeconds ?? policy.minimumUsefulHoldSeconds);
  const reviewBelow = Number(semantic?.reviewBelowSeconds ?? policy.minimumUsefulHoldSeconds);
  const reviewAbove = Number(semantic?.reviewAboveSeconds ?? policy.reviewAboveSeconds);
  const hardMax = Number(semantic?.hardMaximumSeconds ?? policy.hardMaximumSeconds);
  const finalHardMax = Number(semantic?.finalImageHardMaximumSeconds ?? hardMax);
  const adjacentRatioMax = Number(semantic?.maximumAdjacentDurationRatio ?? Infinity);

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const duration = Number(image.durationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      errors.push(`Ungültige Dauer bei Bild ${image.imageNumber}.`);
      continue;
    }
    const thisHardMax = index === images.length - 1 ? finalHardMax : hardMax;
    if (duration < absoluteMin) errors.push(`Bild ${image.imageNumber} ist mit ${duration}s zu kurz. Minimum: ${absoluteMin}s.`);
    else if (duration < reviewBelow) warnings.push(`Bild ${image.imageNumber}: ${duration}s — knapp; Lesbarkeit prüfen.`);
    if (duration > thisHardMax) errors.push(`Bild ${image.imageNumber} überschreitet Hard-Max ${thisHardMax}s (${duration}s).`);
    else if (duration > reviewAbove) warnings.push(`Bild ${image.imageNumber}: ${duration}s — langer Hold muss inhaltlich begründet sein.`);
  }

  for (let i = 0; i < images.length - 1; i += 1) {
    const gap = Number(images[i + 1].startSeconds) - Number(images[i].endSeconds);
    if (Math.abs(gap) > 0.002) errors.push(`Timeline-Lücke/Überlappung zwischen Bild ${images[i].imageNumber} und ${images[i + 1].imageNumber}: ${gap}s.`);
    const a = Number(images[i].durationSeconds);
    const b = Number(images[i + 1].durationSeconds);
    if (Number.isFinite(a) && Number.isFinite(b) && Math.min(a, b) > 0) {
      const ratio = Math.max(a, b) / Math.min(a, b);
      if (ratio > adjacentRatioMax) errors.push(`Pacing-Sprung zwischen Bild ${images[i].imageNumber} (${a}s) und ${images[i + 1].imageNumber} (${b}s) ist zu groß: ${ratio.toFixed(2)}x.`);
    }
  }

  const totalHold = images.reduce((sum, image) => sum + Number(image.durationSeconds || 0), 0);
  const avg = images.length ? totalHold / images.length : 0;
  const target = semantic?.normalHoldSeconds ?? policy.targetAverageHoldSeconds;
  const [targetMin, targetMax] = target;
  if (avg < targetMin - 0.7 || avg > targetMax + 0.7) warnings.push(`Durchschnittlicher Hold ${avg.toFixed(2)}s liegt außerhalb des bevorzugten Bereichs ${targetMin}–${targetMax}s.`);

  return { passed: errors.length === 0, errors, warnings, averageHoldSeconds: Number(avg.toFixed(3)) };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-pacing -- --dir "youtube/<week>/<slug>"');
  const result = await validatePacing(dir);
  for (const warning of result.warnings) console.warn(`WARNUNG: ${warning}`);
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Pacing-Regel(n) verletzt.`);
  }
  console.log(`YouTube Pacing: BESTANDEN — Ø ${result.averageHoldSeconds}s/Bild`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`YouTube Pacing: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
