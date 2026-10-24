#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, copyDirectory, exists, readJson, slugify, writeJson } from '../lib/pipeline.js';
import { evaluateTopic } from './check-youtube-topic.js';
import { assertImprovementLoopReady } from '../lib/continuous-improvement.js';

async function main() {
  const topic = arg('--topic');
  const title = arg('--title') ?? topic;
  const week = arg('--week');
  const slug = arg('--slug') ?? slugify(title ?? topic);

  if (!topic || !title || !week || !slug) {
    throw new Error('Nutzung: npm run create:youtube -- --topic "THEMA" --title "TITEL" --week "YYYY-KWNN_DD-MM_bis_DD-MM" [--slug "slug"]');
  }

  // Finished, review-enabled videos are reviewed and improved BEFORE the next project starts.
  await assertImprovementLoopReady();

  const topicCheck = await evaluateTopic(topic);
  if (topicCheck.decision !== 'APPROVED_NEW') {
    throw new Error(`Thema nicht freigegeben: ${topicCheck.decision}${topicCheck.best ? ` (${topicCheck.best.matched})` : ''}`);
  }

  const templateDir = path.resolve('youtube/templates/video-template');
  const destination = path.resolve('youtube', week, slug);
  if (await exists(destination)) throw new Error(`Projekt existiert bereits: ${destination}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyDirectory(templateDir, destination);

  const [visual, pipeline] = await Promise.all([
    readJson(path.resolve('config/visual-policy.json')),
    readJson(path.resolve('config/pipeline.json'))
  ]);

  const activeStyleId = visual.styleId ?? 'UNSET';
  const promptSystemVersion = Number(visual.promptSystemVersion ?? 1);
  const promptSystem = visual.promptSystem ?? (promptSystemVersion >= 3 ? 'flow-compiler-v3' : 'visual-director-v2');
  const scenePlanningSchemaVersion = Number(visual.scenePlanningSchemaVersion ?? 1);
  const promptQcMinimumScore = Number(visual.promptQcMinimumScore ?? 8);
  const flowStyleLockFile = visual.flowStyleLockFile ?? 'config/flow-style-lock.json';
  const now = new Date().toISOString();
  const metaPath = path.join(destination, '99-technik', 'video.json');
  const meta = await readJson(metaPath);

  Object.assign(meta, {
    pipelineVersion: Number(pipeline.pipelineVersion ?? meta.pipelineVersion ?? 1),
    videoId: `${week}_${slug}`,
    weekFolder: week,
    topicSlug: slug,
    title,
    topic,
    status: Number(meta.preproductionQualityGateVersion ?? 0) >= 1 ? 'preproduction-review' : meta.status,
    visualStyleId: activeStyleId,
    promptSystemVersion,
    promptSystem,
    scenePlanningSchemaVersion,
    promptQcMinimumScore,
    flowStyleLockFile,
    imageDensityPolicy: {
      ...(meta.imageDensityPolicy ?? {}),
      ...(pipeline.imagePolicy ?? {})
    },
    youtubeUpload: {
      ...(meta.youtubeUpload ?? {}),
      title
    },
    createdAt: now,
    updatedAt: now
  });
  await writeJson(metaPath, meta);

  const topicScorecardPath = path.join(destination, '99-technik', 'TOPIC_SCORECARD.json');
  if (await exists(topicScorecardPath)) {
    const scorecard = await readJson(topicScorecardPath);
    Object.assign(scorecard, {
      candidate: topic,
      proposedTitle: title,
      duplicateCheckDecision: topicCheck.decision
    });
    await writeJson(topicScorecardPath, scorecard);
  }

  const promptPath = path.join(destination, '00-bildprompts', 'google-flow-prompt.txt');
  const promptTemplate = await readFile(promptPath, 'utf8');
  const prompt = promptTemplate
    .replace('[VIDEO-TITEL]', title)
    .replace(/^ACTIVE_STYLE_ID:\s*.*$/m, `ACTIVE_STYLE_ID: ${activeStyleId}`);
  await writeFile(promptPath, prompt, 'utf8');

  const registryPath = path.resolve('config/topic-registry.json');
  const registry = await readJson(registryPath, { version: 1, entries: [] });
  registry.entries.push({ id: meta.videoId, title, aliases: [topic], status: 'reserved' });
  await writeJson(registryPath, registry);

  console.log(`Projekt erstellt: ${path.relative(process.cwd(), destination)}`);
  if (topicCheck.warning) console.log(`Hinweis: ${topicCheck.warning}`);
  if (Number(meta.preproductionQualityGateVersion ?? 0) >= 1) {
    console.log('PREPRODUCTION: TOPIC_SCORECARD.json und STORY_QC.json vollständig prüfen und auf APPROVED setzen. Phase 1 bleibt bis dahin gesperrt.');
    console.log('Prüfen mit: npm run validate:youtube-preproduction -- --dir "youtube/<week>/<slug>"');
  }
  if (visual.status !== 'READY' || !visual.styleId || visual.styleId === 'UNSET') {
    console.log('Hinweis: Die Bildwelt ist noch UNSET. Phase 1 bleibt bis zur Definition in config/visual-policy.json blockiert.');
  }
  if (promptSystemVersion >= 3) {
    console.log('Hinweis: FLOW_WORLD_LOCK.json und Scene Cards vollständig ausfüllen, dann npm run build:youtube-flow ausführen.');
  }
  console.log('Hinweis: youtubeUpload.description und hashtags in video.json vor Finalisierung pflegen; daraus entsteht 03-export/CAPTION.txt.');
  console.log('HÖCHSTE PRIORITÄT: Nach jedem fertigen Video Review, konkrete Verbesserungen, Regressionstest und Lerntransfer dokumentieren.');
}

main().catch((error) => {
  console.error(`Projekt-Erstellung: FEHLER — ${error.message}`);
  process.exitCode = 1;
});
