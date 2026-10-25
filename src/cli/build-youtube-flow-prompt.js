#!/usr/bin/env node

import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, isMainModule, projectPaths, readJson, writeJson } from '../lib/pipeline.js';
import { compileFlowPrompt } from '../lib/flow-prompt.js';
import { injectNarrationAlignmentIntoPrompt, validateNarrationAlignmentProject } from '../lib/narration-alignment.js';
import { injectDirectingIntoPrompt, validateDirectingPlan } from '../lib/directing.js';
import { COMPACT_PROMPT_SYSTEM, compileFlowMasterV4, validateCastBible, validateVisualPlan } from '../lib/visual-plan.js';

// V4: one google-flow-prompt.txt with the whole workflow and short scene prompts.
export async function compileCompactFlowPrompt(p, { meta, mapping, worldLock }) {
  const visual = await readJson(path.resolve(meta.visualPolicyFile || 'config/visual-policy.json'));
  const policy = visual.visualPlanV4 ?? {};
  if (!(await exists(p.castBible))) throw new Error('Bildplan V4 benötigt 99-technik/CAST_BIBLE.json.');
  const cast = await readJson(p.castBible);
  const compiled = compileFlowMasterV4({ meta, mapping, cast, policy, worldLock });
  const errors = [
    ...validateCastBible(cast, policy).errors.map((error) => `Cast: ${error}`),
    ...validateVisualPlan({ mapping, cast, policy }).errors,
    ...compiled.errors
  ];
  if (errors.length) throw new Error(`Bildplan-V4-Gate blockiert den Prompt-Build:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  return compiled.prompt;
}

export async function buildYoutubeFlowPrompt(projectDirectory) {
  const p = projectPaths(projectDirectory);
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

  const compact = Number(meta.visualPlanGateVersion ?? 0) >= 1;
  let prompt;
  if (compact) {
    prompt = await compileCompactFlowPrompt(p, { meta, mapping, worldLock });
  } else {
    prompt = compileFlowPrompt({ meta, mapping, styleLock, worldLock });
    if (narrationAlignmentPolicy) prompt = injectNarrationAlignmentIntoPrompt(prompt, mapping);
    if (directingPolicy) prompt = injectDirectingIntoPrompt(prompt, mapping, renderPlan);
  }

  await writeFile(p.prompt, prompt, 'utf8');
  // Leftovers of the short-lived split layout (per-scene files, master in 99-technik).
  for (const stale of [p.flowPromptDir, path.join(p.techDir, 'FLOW_MASTER_PROMPT.txt')]) {
    if (await exists(stale)) await rm(stale, { recursive: true, force: true });
  }

  meta.promptSystemVersion = compact ? 4 : 3;
  meta.promptSystem = compact ? COMPACT_PROMPT_SYSTEM : 'flow-compiler-v3';
  meta.flowPromptBuiltAt = new Date().toISOString();
  meta.updatedAt = meta.flowPromptBuiltAt;
  await writeJson(p.meta, meta);

  return { promptPath: p.prompt, imageCount: mapping.images.length, compact };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"');
  const result = await buildYoutubeFlowPrompt(dir);
  console.log(`Google-Flow-Prompt gebaut: ${path.relative(process.cwd(), result.promptPath)} (${result.imageCount} Bilder)`);
  if (result.compact) console.log('Format V4 kompakt: eine Datei mit Ablauf (3 Cover → Auswahl → Figurenkarten → 10er-Schritte → Umbenennen → Prüfen → Ordner) und kurzen Szenen-Prompts.');
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Flow-Prompt-Build: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
