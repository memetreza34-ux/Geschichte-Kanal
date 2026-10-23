#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, isMainModule, normalizeText, readJson, similarity, walkFiles } from '../lib/pipeline.js';

const SOFT_STATUS_RE = /(test|paused|rejected|archived|cancelled|legacy)/i;

function isSoftStatus(status) {
  return SOFT_STATUS_RE.test(String(status ?? ''));
}

export async function collectKnownTopics(root = process.cwd(), options = {}) {
  const registry = await readJson(path.join(root, 'config', 'topic-registry.json'), { entries: [] });
  const known = [];
  const excludeVideoId = options.excludeVideoId ?? null;
  const excludeProjectDir = options.excludeProjectDir ? path.resolve(options.excludeProjectDir) : null;
  const registryStatusById = new Map();

  for (const entry of registry.entries ?? []) {
    if (entry.id) registryStatusById.set(entry.id, entry.status ?? 'unknown');
    if (excludeVideoId && entry.id === excludeVideoId) continue;
    known.push({
      id: entry.id ?? null,
      source: 'registry',
      title: entry.title ?? '',
      aliases: entry.aliases ?? [],
      status: entry.status ?? 'unknown',
      soft: isSoftStatus(entry.status)
    });
  }

  const youtubeRoot = path.join(root, 'youtube');
  for (const file of await walkFiles(youtubeRoot)) {
    if (!file.endsWith(path.join('99-technik', 'video.json'))) continue;
    if (file.includes(`${path.sep}templates${path.sep}`)) continue;
    const projectDir = path.resolve(file, '..', '..');
    if (excludeProjectDir && projectDir === excludeProjectDir) continue;
    try {
      const meta = JSON.parse(await readFile(file, 'utf8'));
      if (excludeVideoId && meta.videoId === excludeVideoId) continue;
      if (meta.topic || meta.title) {
        const status = registryStatusById.get(meta.videoId) ?? meta.status ?? 'unknown';
        known.push({
          id: meta.videoId ?? null,
          source: file,
          title: meta.topic || meta.title,
          aliases: [meta.title].filter(Boolean),
          status,
          soft: isSoftStatus(status)
        });
      }
    } catch {
      // Ungültige Altdateien werden im eigentlichen Policy-Gate behandelt.
    }
  }
  return known;
}

function closestMatch(candidate, items) {
  const normalized = normalizeText(candidate);
  let best = null;
  for (const item of items) {
    for (const value of [item.title, ...(item.aliases ?? [])].filter(Boolean)) {
      const score = similarity(candidate, value);
      const exact = normalizeText(value) === normalized;
      if (!best || score > best.score || exact) best = { ...item, matched: value, score, exact };
      if (exact) break;
    }
    if (best?.exact) break;
  }
  return best;
}

export async function evaluateTopic(candidate, root = process.cwd(), options = {}) {
  const normalized = normalizeText(candidate);
  if (!normalized) throw new Error('Thema fehlt.');
  const known = await collectKnownTopics(root, options);
  const hard = known.filter((item) => !item.soft);
  const soft = known.filter((item) => item.soft);
  const bestHard = closestMatch(candidate, hard);
  const bestSoft = closestMatch(candidate, soft);

  if (bestHard?.exact || (bestHard?.score ?? 0) >= 0.82) return { decision: 'BLOCKED_DUPLICATE', candidate, best: bestHard, warning: null };
  if ((bestHard?.score ?? 0) >= 0.58) return { decision: 'REVIEW_SIMILAR', candidate, best: bestHard, warning: null };

  const warning = bestSoft && (bestSoft.exact || bestSoft.score >= 0.58)
    ? `Ähnlichkeit nur zu Legacy/Test/Paused-Thema: ${bestSoft.matched} (${bestSoft.status}). Dies blockiert die Produktion nicht.`
    : null;
  return { decision: 'APPROVED_NEW', candidate, best: bestHard ?? bestSoft, warning, legacyMatch: warning ? bestSoft : null };
}

async function main() {
  const topic = arg('--topic') ?? process.argv.slice(2).filter((x) => !x.startsWith('--'))[0];
  if (!topic) throw new Error('Nutzung: npm run topic:youtube -- --topic "THEMA"');
  const result = await evaluateTopic(topic);
  console.log(`DUPLICATE-CHECK: ${result.decision}`);
  if (result.best) console.log(`Ähnlichster Treffer: ${result.best.matched} (${result.best.score.toFixed(2)}, Status: ${result.best.status ?? 'unbekannt'})`);
  if (result.warning) console.log(`WARNUNG: ${result.warning}`);
  console.log('Hinweis: APPROVED_NEW bedeutet nur ausreichend neu. Produktionsfreigabe erfordert zusätzlich TOPIC_SCORECARD.json nach Topic Director V2.');
  if (result.decision !== 'APPROVED_NEW') process.exitCode = 1;
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`DUPLICATE-CHECK: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
