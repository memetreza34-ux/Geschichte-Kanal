#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, projectPaths, readJson, writeJson } from '../lib/pipeline.js';
import { compileFlowPrompt } from '../lib/flow-prompt.js';
import { injectNarrationAlignmentIntoPrompt, validateNarrationAlignmentProject } from '../lib/narration-alignment.js';
import { injectDirectingIntoPrompt, validateDirectingPlan } from '../lib/directing.js';
import { usesCreativeEvidence, validateCreativeProject } from '../lib/creative-evidence.js';

export async function buildYoutubeFlowPrompt(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const creative = await validateCreativeProject(projectDirectory);
  if (!creative.passed) throw new Error(`Creative-Evidence-Gate blockiert den Prompt-Build:\n${creative.errors.join('\n')}`);
  const [meta, mapping, styleLock, worldLock, script, renderPlan] = await Promise.all([
    readJson(p.meta),
    readJson(p.mapping),
    readJson(path.resolve('config/flow-style-lock.json')),
    readJson(p.flowWorldLock),
    readFile(p.script, 'utf8'),
    readJson(p.renderPlan)
  ]);

  let narrationAlignmentPolicy = null;
  if (Number(meta.narrationAlignmentGateVersion ?? 0) >= 1) {
    narrationAlignmentPolicy = await readJson(path.resolve(meta.narrationAlignmentPolicyFile || 'config/narration-alignment-policy.json'));
    const result = validateNarrationAlignmentProject({ meta, mapping, policy: narrationAlignmentPolicy, script });
    if (!result.passed) {
      throw new Error(`Narration-Alignment-Gate blockiert den Prompt-Build:\n${result.errors.map((error) => `- ${error}`).join('\n')}`);
    }
  }

  let directingPolicy = null;
  if (Number(meta.directingGateVersion ?? 0) >= 1) {
    directingPolicy = await readJson(path.resolve(meta.directingPolicyFile || 'config/directing-policy.json'));
    const directing = validateDirectingPlan({ meta, mapping, renderPlan, policy: directingPolicy });
    if (!directing.passed) {
      throw new Error(`Directing-Gate blockiert den Prompt-Build:\n${directing.errors.map((error) => `- ${error}`).join('\n')}`);
    }
  }

  const research = usesCreativeEvidence(meta) ? await readJson(p.researchEvidence) : null;
  let prompt = compileFlowPrompt({ meta, mapping, styleLock, worldLock, research });
  if (narrationAlignmentPolicy) prompt = injectNarrationAlignmentIntoPrompt(prompt, mapping);
  if (directingPolicy && !usesCreativeEvidence(meta)) prompt = injectDirectingIntoPrompt(prompt, mapping, renderPlan);

  await writeFile(p.prompt, prompt, 'utf8');

  meta.promptSystemVersion = 3;
  meta.promptSystem = 'flow-compiler-v3';
  meta.flowPromptBuiltAt = new Date().toISOString();
  meta.updatedAt = meta.flowPromptBuiltAt;
  await writeJson(p.meta, meta);

  return { promptPath: p.prompt, imageCount: mapping.images.length };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"');
  const result = await buildYoutubeFlowPrompt(dir);
  console.log(`Google-Flow-Prompt gebaut: ${path.relative(process.cwd(), result.promptPath)} (${result.imageCount} Bilder)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Flow-Prompt-Build: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
