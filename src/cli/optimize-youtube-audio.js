#!/usr/bin/env node

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { arg, discoverAudioFiles, isMainModule, probeDuration, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';

const execFileAsync = promisify(execFile);

function loudnormFilter(policy, print = false) {
  const base = `loudnorm=I=${Number(policy.loudnessTargetLufs)}:TP=${Number(policy.truePeakDbtp)}:LRA=${Number(policy.loudnessRangeLra)}`;
  return print ? `${base}:print_format=json` : base;
}

export function resolveAudioPolicy(pipelinePolicy = {}, projectPolicy = {}) {
  const merged = { ...pipelinePolicy };
  for (const [key, value] of Object.entries(projectPolicy ?? {})) {
    if (value !== undefined && value !== null) merged[key] = value;
  }
  merged.outputSampleRateHz = Number(
    projectPolicy?.sampleRateHz ??
    projectPolicy?.outputSampleRateHz ??
    pipelinePolicy?.outputSampleRateHz
  );
  return merged;
}

function buildFilter(policy) {
  const threshold = Number(policy.silenceThresholdDb);
  const longPause = Number(policy.minimumLongPauseSeconds);
  const keep = Number(policy.retainedPauseSeconds);
  const speed = Number(policy.playbackRate);
  return [
    `silenceremove=start_periods=1:start_duration=0.12:start_threshold=-38dB:start_silence=0.02:stop_periods=-1:stop_duration=${longPause}:stop_threshold=${threshold}dB:stop_silence=${keep}:detection=rms`,
    `atempo=${speed}`,
    'areverse',
    `silenceremove=start_periods=1:start_duration=0.10:start_threshold=${threshold}dB:start_silence=0.05:detection=rms`,
    'areverse',
    loudnormFilter(policy),
    `aresample=${Number(policy.outputSampleRateHz)}`
  ].join(',');
}

function parseLoudness(output) {
  const objects = String(output ?? '').match(/\{[\s\S]*?\}/g) ?? [];
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    try {
      const value = JSON.parse(objects[i]);
      const lufs = Number(value.input_i);
      const peak = Number(value.input_tp);
      if (Number.isFinite(lufs) && Number.isFinite(peak)) return { measured: true, integratedLufs: lufs, truePeakDbtp: peak };
    } catch {}
  }
  return { measured: false, integratedLufs: null, truePeakDbtp: null };
}

export async function optimizeAudio(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [pipeline, meta] = await Promise.all([
    readJson(path.resolve('config/pipeline.json')),
    readJson(p.meta)
  ]);
  const policy = resolveAudioPolicy(pipeline.audioPolicy, meta.audioPolicy);
  const audioFiles = await discoverAudioFiles(p.audioDir);
  if (audioFiles.length !== 1) throw new Error(`Genau eine Nutzer-Voice-over-Datei erwartet; gefunden: ${audioFiles.length}.`);
  const source = audioFiles[0];

  const before = await probeDuration(source);
  const sourceHash = await sha256(source);
  const filter = buildFilter(policy);

  await execFileAsync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', source,
    '-vn',
    '-af', filter,
    '-ar', String(policy.outputSampleRateHz),
    '-ac', '2',
    '-c:a', 'pcm_s16le',
    p.optimizedAudio
  ], { timeout: 1_200_000, maxBuffer: 16 * 1024 * 1024 });

  const after = await probeDuration(p.optimizedAudio);
  const optimizedHash = await sha256(p.optimizedAudio);

  let measurement;
  try {
    const { stderr } = await execFileAsync('ffmpeg', [
      '-hide_banner', '-nostats', '-i', p.optimizedAudio, '-vn',
      '-af', loudnormFilter(policy, true), '-f', 'null', '-'
    ], { timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
    measurement = parseLoudness(stderr);
  } catch (error) {
    measurement = parseLoudness(error?.stderr);
  }

  const loudnessOk = measurement.measured && Math.abs(measurement.integratedLufs - Number(policy.loudnessTargetLufs)) <= 1.2 && measurement.truePeakDbtp <= Number(policy.truePeakDbtp) + 0.25;
  if (!(after < before)) throw new Error(`Audio wurde nicht verkürzt (${before}s → ${after}s).`);
  if (!loudnessOk) throw new Error(`Lautheitsmessung außerhalb des Ziels: ${JSON.stringify(measurement)}`);
  if (await sha256(source) !== sourceHash) throw new Error('Nutzeroriginal wurde verändert.');

  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceFile: path.relative(p.projectDir, source).split(path.sep).join('/'),
    sourceFingerprintSha256: sourceHash,
    optimizedFile: '99-technik/YOUTUBE_AUDIO_OPTIMIZED.wav',
    optimizedFingerprintSha256: optimizedHash,
    beforeSeconds: before,
    afterSeconds: after,
    removedSeconds: Number((before - after).toFixed(3)),
    playbackRate: policy.playbackRate,
    pitchPreserved: true,
    loudnessTargetLufs: policy.loudnessTargetLufs,
    truePeakDbtp: policy.truePeakDbtp,
    sampleRateHz: policy.outputSampleRateHz,
    loudnessMeasurement: { ...measurement, passed: loudnessOk },
    userOriginalModified: false,
    filter,
    passed: true
  };
  await writeJson(path.join(p.techDir, 'YOUTUBE_AUDIO_PACING.json'), report);
  console.log(`Audio optimiert: ${before}s → ${after}s`);
  return report;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run optimize:youtube-audio -- --dir "youtube/<week>/<slug>"');
  await optimizeAudio(dir);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Audio-Optimierung: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
