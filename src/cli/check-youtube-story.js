#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, isMainModule, projectPaths, readJson } from '../lib/pipeline.js';
import { lintScript, validateStoryBlueprint } from '../lib/story-engine.js';

export async function checkYoutubeStory(projectDirectory, { lintOnly = false } = {}) {
  const p = projectPaths(projectDirectory);
  if (!(await exists(p.script))) throw new Error('01-voice-script/voice-script.txt fehlt.');
  const [script, policy] = await Promise.all([
    readFile(p.script, 'utf8'),
    readJson(path.resolve('config/story-engine-policy.json'))
  ]);
  if (lintOnly) return lintScript(script, policy);
  if (!(await exists(p.storyBlueprint))) throw new Error('99-technik/STORY_BLUEPRINT.json fehlt. Mit --lint nur das Skript prüfen.');
  return validateStoryBlueprint(await readJson(p.storyBlueprint), script, policy);
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run story:youtube -- --dir "youtube/<week>/<slug>" [--lint]');
  const result = await checkYoutubeStory(dir, { lintOnly: process.argv.includes('--lint') });
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Story-Regel(n) verletzt. Siehe channel/24-STORY-ENGINE-V4.md.`);
  }
  console.log('Story Engine: BESTANDEN');
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Story Engine: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
