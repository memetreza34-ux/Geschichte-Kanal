#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, isMainModule, masterPromptPath, projectPaths, readJson, writeJson } from '../lib/pipeline.js';
import { compileFlowPrompt } from '../lib/flow-prompt.js';
import { injectNarrationAlignmentIntoPrompt, validateNarrationAlignmentProject } from '../lib/narration-alignment.js';
import { injectDirectingIntoPrompt, validateDirectingPlan } from '../lib/directing.js';
import { compileFlowPromptFiles, validateCastBible, validateVisualPlan } from '../lib/visual-plan.js';

const GENERATED_PROMPT_FILE = /^(Bild \d{2,3}|CAST_[a-z0-9-]+)\.txt$/;

// One file per scene: the content never carries a BILD heading that Flow could draw.
export async function writeFlowPromptFiles(p, { meta, mapping }) {
  const visual = await readJson(path.resolve(meta.visualPolicyFile || 'config/visual-policy.json'));
  const policy = visual.visualPlanV4 ?? {};
  if (!(await exists(p.castBible))) throw new Error('Bildplan V4 benötigt 99-technik/CAST_BIBLE.json.');
  const cast = await readJson(p.castBible);
  const errors = [
    ...validateCastBible(cast, policy).errors.map((error) => `Cast: ${error}`),
    ...validateVisualPlan({ mapping, cast, policy }).errors
  ];
  const compiled = compileFlowPromptFiles({ mapping, cast, policy });
  errors.push(...compiled.errors);
  if (errors.length) throw new Error(`Bildplan-V4-Gate blockiert den Prompt-Build:\n${errors.map((error) => `- ${error}`).join('\n')}`);

  await mkdir(p.flowPromptDir, { recursive: true });
  for (const name of await readdir(p.flowPromptDir)) {
    if (GENERATED_PROMPT_FILE.test(name)) await rm(path.join(p.flowPromptDir, name));
  }
  for (const file of compiled.files) await writeFile(path.join(p.flowPromptDir, file.name), file.content, 'utf8');
  return compiled.files.length;
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

  let prompt = compileFlowPrompt({ meta, mapping, styleLock, worldLock });
  if (narrationAlignmentPolicy) prompt = injectNarrationAlignmentIntoPrompt(prompt, mapping);
  if (directingPolicy) prompt = injectDirectingIntoPrompt(prompt, mapping, renderPlan);

  const promptPath = masterPromptPath(p, meta);
  await writeFile(promptPath, prompt, 'utf8');
  if (promptPath !== p.prompt && (await exists(p.prompt))) await rm(p.prompt);
  const promptFiles = Number(meta.visualPlanGateVersion ?? 0) >= 1 ? await writeFlowPromptFiles(p, { meta, mapping }) : 0;

  meta.promptSystemVersion = 3;
  meta.promptSystem = 'flow-compiler-v3';
  meta.flowPromptBuiltAt = new Date().toISOString();
  meta.updatedAt = meta.flowPromptBuiltAt;
  await writeJson(p.meta, meta);

  return { promptPath, imageCount: mapping.images.length, promptFiles };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run build:youtube-flow -- --dir "youtube/<week>/<slug>"');
  const result = await buildYoutubeFlowPrompt(dir);
  console.log(`Google-Flow-Prompt gebaut: ${path.relative(process.cwd(), result.promptPath)} (${result.imageCount} Bilder)`);
  if (result.promptFiles) console.log(`Einzel-Prompts: ${result.promptFiles} Dateien in 00-bildprompts/FLOW_PROMPTS/ — einzeln in Flow einfügen, nie den Master-Prompt.`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(`Flow-Prompt-Build: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
