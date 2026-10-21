#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, execFileAsync, normalizeText, probeDuration, projectPaths, readJson, sha256, tokens, writeJson } from '../lib/pipeline.js';
import { alignedMappingErrors, alignmentFingerprint, fingerprint } from '../lib/production-integrity.js';

function flattenWords(whisperJson) {
  const words = [];
  for (const segment of whisperJson.segments ?? []) {
    if (Array.isArray(segment.words) && segment.words.length) {
      for (const word of segment.words) {
        words.push({ text: String(word.word ?? '').trim(), start: Number(word.start), end: Number(word.end), probability: Number(word.probability ?? 1) });
      }
    } else {
      const text = String(segment.text ?? '').trim();
      const segmentTokens = text.split(/\s+/).filter(Boolean);
      const start = Number(segment.start ?? 0);
      const end = Number(segment.end ?? start);
      const step = segmentTokens.length ? (end - start) / segmentTokens.length : 0;
      segmentTokens.forEach((token, index) => words.push({ text: token, start: start + step * index, end: start + step * (index + 1), probability: 0.7 }));
    }
  }
  return words.filter((word) => Number.isFinite(word.start));
}

function findAnchor(words, anchor, fromIndex = 0) {
  const target = tokens(anchor);
  if (!target.length) return null;
  const normalizedWords = words.map((word) => normalizeText(word.text));
  const minMatch = Math.min(target.length, Math.max(4, Math.ceil(target.length * 0.65)));

  for (let start = Math.max(0, fromIndex); start < normalizedWords.length; start += 1) {
    let matched = 0;
    for (let j = 0; j < target.length && start + j < normalizedWords.length; j += 1) {
      if (normalizedWords[start + j] === target[j]) matched += 1;
      else break;
    }
    if (matched >= minMatch) {
      const slice = words.slice(start, start + matched);
      const confidence = slice.reduce((sum, word) => sum + (Number.isFinite(word.probability) ? word.probability : 0.8), 0) / slice.length;
      return { wordIndex: start, startSeconds: words[start].start, confidence: Number(confidence.toFixed(3)), matchedWords: matched };
    }
  }
  return null;
}

export async function alignProject(projectDirectory, { model = 'small', refresh = false } = {}) {
  const p = projectPaths(projectDirectory);
  const mapping = await readJson(p.mapping);
  const audioHash = await sha256(p.optimizedAudio);
  const language = (await readJson(p.meta)).language ?? 'de';
  const scriptSha256 = await sha256(p.script);
  const inputFingerprint = alignmentFingerprint(mapping, { model, language, scriptSha256 });
  const evidenceExisting = await readJson(p.alignmentEvidence, null);
  if (!refresh && evidenceExisting?.audioFingerprintSha256 === audioHash && evidenceExisting?.passed === true &&
      evidenceExisting.inputFingerprint === inputFingerprint && evidenceExisting.mappingFingerprint === fingerprint(mapping) &&
      alignedMappingErrors(mapping.images).length === 0) {
    return { reused: true, mapping, evidence: evidenceExisting };
  }

  const whisperDir = path.join(p.techDir, 'whisper');
  await mkdir(whisperDir, { recursive: true });

  await execFileAsync('whisper', [
    p.optimizedAudio,
    '--model', model,
    '--language', language,
    '--word_timestamps', 'True',
    '--output_format', 'json',
    '--output_dir', whisperDir
  ], { timeout: 3_600_000, maxBuffer: 64 * 1024 * 1024 });

  const basename = path.basename(p.optimizedAudio, path.extname(p.optimizedAudio));
  const whisperPath = path.join(whisperDir, `${basename}.json`);
  const whisperJson = JSON.parse(await readFile(whisperPath, 'utf8'));
  const words = flattenWords(whisperJson);
  if (!words.length) throw new Error('Whisper lieferte keine Wortzeiten.');

  const images = mapping.images ?? [];
  const misses = [];
  let cursor = 0;
  const aligned = images.map((image, index) => {
    if (index === 0) {
      const first = findAnchor(words, image.startAnchor, 0);
      if (!first) misses.push({ imageNumber: image.imageNumber, startAnchor: image.startAnchor });
      else cursor = first.wordIndex + 1;
      return { ...image, actualStartSeconds: 0, alignmentConfidence: first?.confidence ?? 0 };
    }
    const match = findAnchor(words, image.startAnchor, cursor);
    if (!match) {
      misses.push({ imageNumber: image.imageNumber, startAnchor: image.startAnchor });
      return { ...image, actualStartSeconds: null, alignmentConfidence: 0 };
    }
    cursor = match.wordIndex + 1;
    return { ...image, actualStartSeconds: Number(match.startSeconds.toFixed(3)), alignmentConfidence: match.confidence };
  });

  const duration = await probeDuration(p.optimizedAudio);
  for (let i = 0; i < aligned.length; i += 1) {
    const nextStart = aligned[i + 1]?.actualStartSeconds;
    aligned[i].actualEndSeconds = Number((Number.isFinite(nextStart) ? nextStart : duration).toFixed(3));
  }

  const updated = {
    ...mapping,
    sourceVoiceoverFile: mapping.sourceVoiceoverFile,
    audioMasterFile: '99-technik/YOUTUBE_AUDIO_OPTIMIZED.wav',
    alignmentEvidenceFile: '99-technik/WHISPER_ALIGNMENT.json',
    autoAlignment: { matched: aligned.length - misses.length, total: aligned.length, model, refreshed: refresh },
    images: aligned
  };
  await writeJson(p.mapping, updated);

  const evidence = {
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    model,
    language,
    audioFingerprintSha256: audioHash,
    scriptSha256,
    inputFingerprint,
    mappingFingerprint: fingerprint(updated),
    wordCount: words.length,
    matchedImages: aligned.length - misses.length,
    totalImages: aligned.length,
    misses,
    errors: alignedMappingErrors(aligned),
    passed: misses.length === 0 && alignedMappingErrors(aligned).length === 0
  };
  await writeJson(p.alignmentEvidence, evidence);
  if (misses.length) throw new Error(`Whisper konnte ${misses.length} Bildanker nicht sicher finden.`);
  if (!evidence.passed) throw new Error(evidence.errors.join('\n'));
  return { reused: false, mapping: updated, evidence };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run auto-align:youtube -- --dir "youtube/<week>/<slug>" [--model small] [--refresh]');
  const result = await alignProject(dir, { model: arg('--model') ?? 'small', refresh: process.argv.includes('--refresh') });
  console.log(`Audio-Alignment: BESTANDEN (${result.mapping.autoAlignment?.matched ?? result.mapping.images.length}/${result.mapping.images.length})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Audio-Alignment: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
