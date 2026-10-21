#!/usr/bin/env node

import path from 'node:path';
import { arg, discoverAudioFiles, exists, probeDuration, projectPaths, readJson, sha256 } from '../lib/pipeline.js';
import { verifyPhase3ImageLock } from './phase3-image-lock.js';
import { usesStandaloneThumbnail, thumbnailSourcePath, validateStandaloneThumbnail } from '../lib/thumbnail-policy.js';
import { alignedMappingErrors, alignmentFingerprint, fingerprint, timelineErrors, validateVideoId } from '../lib/production-integrity.js';
import { inspectVideo } from '../lib/media-integrity.js';
import { timelineImages } from '../lib/timeline.js';

export async function validatePhase3(projectDirectory, { postRender = false } = {}) {
  const p = projectPaths(projectDirectory);
  const errors = [];

  try {
    await verifyPhase3ImageLock(projectDirectory);
  } catch (error) {
    errors.push(`Phase-3-Bildlock verletzt: ${error.message}`);
  }

  const [meta, timeline, pipeline] = await Promise.all([
    readJson(p.meta), readJson(p.timeline), readJson(path.resolve('config/pipeline.json'))
  ]);
  try { validateVideoId(meta.videoId); } catch (error) { errors.push(error.message); }
  errors.push(...timelineErrors(timeline, Number(meta.plannedImageCount)));
  const mapping = await readJson(p.mapping);
  const renderPlan = await readJson(p.renderPlan);
  errors.push(...alignedMappingErrors(mapping.images));

  const phase3Assets = pipeline.phase3AssetPolicy;
  if (usesStandaloneThumbnail(meta)) {
    errors.push(...await validateStandaloneThumbnail(p, meta, await readJson(p.phase2VisualQc, null)));
  }
  if (!phase3Assets || phase3Assets.existingImagesOnly !== true || phase3Assets.imageGenerationForbidden !== true) {
    errors.push('Phase-3-Asset-Policy fehlt oder erlaubt unerwartet Bildgenerierung.');
  }

  const audioReport = await readJson(path.join(p.techDir, 'YOUTUBE_AUDIO_PACING.json'), null);
  const alignment = await readJson(p.alignmentEvidence, null);
  if (audioReport?.passed !== true) errors.push('Audio-Pacing-Report fehlt oder ist nicht bestanden.');
  if (alignment?.passed !== true) errors.push('Whisper-Alignment fehlt oder ist nicht bestanden.');
  if (!(await exists(p.optimizedAudio))) errors.push('Optimiertes internes Audio fehlt.');
  else {
    const audioHash = await sha256(p.optimizedAudio);
    if (audioReport?.optimizedFingerprintSha256 !== audioHash) errors.push('Audio-Pacing-Bericht gehört nicht zum aktuellen Audio.');
    if (alignment?.audioFingerprintSha256 !== audioHash) errors.push('Alignment gehört nicht zum aktuellen Audio.');
    if (timeline.audioFingerprintSha256 !== audioHash) errors.push('Timeline gehört nicht zum aktuellen Audio.');
    const measuredDuration = await probeDuration(p.optimizedAudio);
    if (!Number.isFinite(timeline.audioDurationSeconds) || Math.abs(measuredDuration - timeline.audioDurationSeconds) > 0.002 || Math.abs(mapping.images?.at(-1)?.actualEndSeconds - measuredDuration) > 0.05) errors.push('Audiodauer stimmt nicht mit Alignment/Timeline überein.');
    if (!alignedMappingErrors(mapping.images).length && Number.isFinite(timeline.endHoldSeconds)) {
      const expectedImages = timelineImages({ meta, mapping, audioDuration: measuredDuration, hold: timeline.endHoldSeconds });
      if (fingerprint(timeline.images) !== fingerprint(expectedImages)) errors.push('Timeline-Szenen entsprechen nicht dem geprüften Mapping.');
    }
  }
  const originals = await discoverAudioFiles(p.audioDir);
  if (originals.length !== 1 || audioReport?.sourceFingerprintSha256 !== await sha256(originals[0])) errors.push('Audio-Pacing-Bericht gehört nicht zum aktuellen Nutzeroriginal.');
  for (const [field, expected] of Object.entries({ fps: meta.renderPolicy?.fps ?? pipeline.fps, width: meta.renderPolicy?.width ?? pipeline.resolution.width, height: meta.renderPolicy?.height ?? pipeline.resolution.height })) {
    if (timeline[field] !== Number(expected) || !Number.isInteger(timeline[field]) || timeline[field] <= 0) errors.push(`Timeline-${field} entspricht nicht der Render-Vorgabe.`);
  }
  if (timeline.audioFile !== `__render/${meta.videoId}/audio/YOUTUBE_AUDIO_OPTIMIZED.wav`) errors.push('Timeline verweist auf eine falsche Audiodatei.');
  const mappingHash = fingerprint(mapping);
  if (alignment?.mappingFingerprint !== mappingHash || timeline.mappingFingerprint !== mappingHash) errors.push('Mapping wurde nach Alignment/Timeline verändert.');
  if (timeline.renderPlanFingerprint !== fingerprint(renderPlan)) errors.push('Renderplan wurde nach Timeline-Erstellung verändert.');
  const scriptHash = await sha256(p.script);
  if (alignment?.scriptSha256 !== scriptHash || alignment?.inputFingerprint !== alignmentFingerprint(mapping, { model: alignment?.model, language: meta.language ?? 'de', scriptSha256: scriptHash })) errors.push('Alignment-Eingaben oder Skript sind veraltet.');
  for (const image of timeline.images ?? []) {
    const expected = `__render/${meta.videoId}/images/Bild ${String(image.imageNumber).padStart(2, '0')}.png`;
    if (image.file !== expected) errors.push(`Timeline verweist auf eine falsche Bilddatei bei Bild ${image.imageNumber}.`);
  }
  if (!Array.isArray(timeline.images) || timeline.images.length !== Number(meta.plannedImageCount)) errors.push('Timeline-Bildzahl entspricht nicht plannedImageCount.');
  if (timeline.images?.[0]?.imageNumber !== 1 || Number(timeline.images?.[0]?.startSeconds) !== 0) errors.push('Bild 01 muss bei 0,0 s starten.');

  const hold = Number(timeline.endHoldSeconds);
  if (!Number.isFinite(hold) || hold < Number(pipeline.endHoldPolicy.minimumSeconds) || hold > Number(pipeline.endHoldPolicy.maximumSeconds)) errors.push('Schluss-Hold liegt außerhalb der erlaubten Range.');
  const last = timeline.images?.at(-1);
  if (last && Math.abs(Number(last.endSeconds) - Number(timeline.durationSeconds)) > 0.01) errors.push('Letztes Bild endet nicht exakt mit der Komposition.');

  if (postRender) {
    const video = path.join(p.exportDir, 'FINAL_VIDEO.mp4');
    const thumbnail = path.join(p.exportDir, 'THUMBNAIL.png');
    const cover = usesStandaloneThumbnail(meta) ? thumbnailSourcePath(p) : path.join(p.imagesDir, 'Bild 01.png');
    if (!(await exists(video))) errors.push('FINAL_VIDEO.mp4 fehlt.');
    else errors.push(...(await inspectVideo(video, timeline)).errors);
    if (!(await exists(thumbnail))) errors.push('THUMBNAIL.png fehlt.');
    if (await exists(thumbnail) && await exists(cover) && (await sha256(thumbnail)) !== (await sha256(cover))) errors.push('THUMBNAIL.png entspricht nicht der freigegebenen Thumbnail-Quelldatei.');
  }

  return { passed: errors.length === 0, errors };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-phase3 -- --dir "youtube/<week>/<slug>" [--post-render]');
  const result = await validatePhase3(dir, { postRender: process.argv.includes('--post-render') });
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Phase-3-Regel(n) verletzt.`);
  }
  console.log(`YouTube Phase 3 ${process.argv.includes('--post-render') ? 'Post-Render' : 'Pre-Render'}: BESTANDEN`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`YouTube Phase 3: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
