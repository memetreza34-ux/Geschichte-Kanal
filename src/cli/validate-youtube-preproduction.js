#!/usr/bin/env node

import path from 'node:path';
import { arg, exists, isMainModule, normalizeText, projectPaths, readJson } from '../lib/pipeline.js';
import { validateTopicScorecard } from '../lib/topic-quality.js';
import { validateStoryQc } from '../lib/story-quality.js';
import { evaluateTopic } from './check-youtube-topic.js';

export async function validatePreproduction(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const errors = [];
  if (!(await exists(p.meta))) return { passed: false, errors: ['video.json fehlt.'] };
  const meta = await readJson(p.meta);

  if (Number(meta.preproductionQualityGateVersion ?? 0) < 1) {
    return { passed: true, errors: [], legacy: true };
  }

  const [topicPolicy, channelPolicy] = await Promise.all([
    readJson(path.resolve('config/topic-policy.json')),
    readJson(path.resolve('config/channel-policy.json'))
  ]);

  if (!(await exists(p.topicScorecard))) errors.push('Neue Produktion benötigt 99-technik/TOPIC_SCORECARD.json.');
  if (!(await exists(p.storyQc))) errors.push('Neue Produktion benötigt 99-technik/STORY_QC.json.');
  if (errors.length) return { passed: false, errors };

  const [topicScorecard, storyQc] = await Promise.all([
    readJson(p.topicScorecard),
    readJson(p.storyQc)
  ]);

  const duplicate = await evaluateTopic(meta.topic || meta.title, process.cwd(), {
    excludeVideoId: meta.videoId,
    excludeProjectDir: p.projectDir
  });
  if (duplicate.decision !== 'APPROVED_NEW') {
    errors.push(`Aktueller Duplicate-Check ist ${duplicate.decision}${duplicate.best ? ` (${duplicate.best.matched})` : ''}.`);
  }
  if (topicScorecard.duplicateCheckDecision !== duplicate.decision) {
    errors.push(`TOPIC_SCORECARD.duplicateCheckDecision ist veraltet: ${topicScorecard.duplicateCheckDecision || 'leer'} statt ${duplicate.decision}.`);
  }
  if (normalizeText(topicScorecard.candidate) !== normalizeText(meta.topic || meta.title)) {
    errors.push('TOPIC_SCORECARD.candidate entspricht nicht dem aktuellen video.json-Thema.');
  }
  if (normalizeText(topicScorecard.proposedTitle) !== normalizeText(meta.title)) {
    errors.push('TOPIC_SCORECARD.proposedTitle entspricht nicht dem aktuellen video.json-Titel.');
  }
  if (Number(topicScorecard.schemaVersion ?? 0) >= 3 && topicScorecard.storyMode !== meta.storyMode) {
    errors.push(`TOPIC_SCORECARD.storyMode (${topicScorecard.storyMode || 'leer'}) entspricht nicht video.json.storyMode (${meta.storyMode || 'leer'}).`);
  }

  const topicResult = validateTopicScorecard(topicScorecard, topicPolicy);
  errors.push(...topicResult.errors.map((error) => `Topic Gate: ${error}`));

  const storyResult = validateStoryQc(storyQc, channelPolicy);
  errors.push(...storyResult.errors.map((error) => `Story Gate: ${error}`));

  return {
    passed: errors.length === 0,
    errors,
    legacy: false,
    topicScore: topicResult.weightedScore,
    topicBand: topicResult.qualityBand,
    duplicateWarning: duplicate.warning ?? null
  };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-preproduction -- --dir "youtube/<week>/<slug>"');
  const result = await validatePreproduction(dir);
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Preproduction-Regel(n) verletzt.`);
  }
  if (result.legacy) console.log('YouTube Preproduction: LEGACY — kein neues Quality Gate erforderlich.');
  else console.log(`YouTube Preproduction: BESTANDEN — Topic ${result.topicScore}/10 (${result.topicBand}).`);
  if (result.duplicateWarning) console.log(`WARNUNG: ${result.duplicateWarning}`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`YouTube Preproduction: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
