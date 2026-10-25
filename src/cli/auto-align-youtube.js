#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, execFileAsync, isMainModule, normalizeText, probeDuration, projectPaths, readJson, sha256, tokens, writeJson } from '../lib/pipeline.js';

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

const GERMAN_NUMBERS = new Map(Object.entries({
  eins: '1', zwei: '2', drei: '3', vier: '4', funf: '5', sechs: '6', sieben: '7', acht: '8', neun: '9', zehn: '10',
  elf: '11', zwolf: '12', funfzehn: '15', zwanzig: '20', einundzwanzig: '21', siebenundzwanzig: '27',
  dreissig: '30', hundert: '100', tausend: '1000', dreitausend: '3000', siebentausend: '7000', funfzig: '50'
}));

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// Whisper writes names and numbers its own way ("Gonzales", "Gell", "21", "Lex"); exact
// token equality missed 25 of 82 anchors on the first real voice-over.
export function similarToken(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const na = GERMAN_NUMBERS.get(a) ?? a;
  const nb = GERMAN_NUMBERS.get(b) ?? b;
  if (na === nb) return true;
  const longest = Math.max(a.length, b.length);
  if (longest < 3) return false;
  return editDistance(a, b) <= (longest >= 6 ? 2 : 1);
}

function matchAt(words, target, start) {
  // The first one to three anchor words may be merged or garbled ("Eisekonzales arbeitet ...").
  for (let k = 0; k < Math.min(3, target.length); k += 1) {
    if (!similarToken(words[start], target[k])) continue;
    let matched = 1;
    let w = start + 1;
    for (let t = k + 1; t < target.length && w < words.length; t += 1) {
      if (similarToken(words[w], target[t])) { matched += 1; w += 1; }
      else if (similarToken(words[w + 1], target[t])) { matched += 1; w += 2; }
      else if (similarToken(words[w], target[t + 1])) { t += 1; matched += 1; w += 1; }
    }
    return { matched, end: w, skippedLead: k };
  }
  return null;
}

// Anchors follow the voice-over in order, so search close to the previous one first and only
// then further away with a stricter threshold.
export function findAnchor(words, anchor, fromIndex = 0, { nearWindow = 90, farWindow = 400 } = {}) {
  const target = tokens(anchor).slice(0, 8);
  if (!target.length) return null;
  const normalizedWords = words.map((word) => normalizeText(word.text));
  const passes = [
    { end: fromIndex + nearWindow, need: Math.min(target.length, Math.max(3, Math.ceil(target.length * 0.6))) },
    { end: fromIndex + farWindow, need: Math.min(target.length, Math.max(4, Math.ceil(target.length * 0.8))) }
  ];
  for (const pass of passes) {
    for (let start = Math.max(0, fromIndex); start < Math.min(normalizedWords.length, pass.end); start += 1) {
      const hit = matchAt(normalizedWords, target, start);
      if (!hit || hit.matched < pass.need) continue;
      const at = hit.skippedLead && start - 1 >= fromIndex ? start - 1 : start;
      const slice = words.slice(at, hit.end);
      const probability = slice.reduce((sum, word) => sum + (Number.isFinite(word.probability) ? word.probability : 0.8), 0) / Math.max(1, slice.length);
      return { wordIndex: at, startSeconds: words[at].start, confidence: Number((probability * hit.matched / target.length).toFixed(3)), matchedWords: hit.matched };
    }
  }
  return null;
}

export async function alignProject(projectDirectory, { model = 'small', refresh = false } = {}) {
  const p = projectPaths(projectDirectory);
  const mapping = await readJson(p.mapping);
  const audioHash = await sha256(p.optimizedAudio);
  const evidenceExisting = await readJson(p.alignmentEvidence, null);
  if (!refresh && evidenceExisting?.audioFingerprintSha256 === audioHash && evidenceExisting?.passed === true) {
    return { reused: true, mapping, evidence: evidenceExisting };
  }

  const whisperDir = path.join(p.techDir, 'whisper');
  await mkdir(whisperDir, { recursive: true });
  const language = (await readJson(p.meta)).language ?? 'de';

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
      else cursor = first.wordIndex;
      return { ...image, actualStartSeconds: 0, alignmentConfidence: first?.confidence ?? 0 };
    }
    const match = findAnchor(words, image.startAnchor, cursor);
    if (!match) {
      misses.push({ imageNumber: image.imageNumber, startAnchor: image.startAnchor });
      return { ...image, actualStartSeconds: null, alignmentConfidence: 0 };
    }
    cursor = match.wordIndex;
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
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    model,
    language,
    audioFingerprintSha256: audioHash,
    wordCount: words.length,
    matchedImages: aligned.length - misses.length,
    totalImages: aligned.length,
    misses,
    passed: misses.length === 0
  };
  await writeJson(p.alignmentEvidence, evidence);
  if (misses.length) throw new Error(`Whisper konnte ${misses.length} Bildanker nicht sicher finden.`);
  return { reused: false, mapping: updated, evidence };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run auto-align:youtube -- --dir "youtube/<week>/<slug>" [--model small] [--refresh]');
  const result = await alignProject(dir, { model: arg('--model') ?? 'small', refresh: process.argv.includes('--refresh') });
  console.log(`Audio-Alignment: BESTANDEN (${result.mapping.autoAlignment?.matched ?? result.mapping.images.length}/${result.mapping.images.length})`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Audio-Alignment: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
