#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, projectPaths, readJson } from '../lib/pipeline.js';
import { validateNarrationAlignmentProject } from '../lib/narration-alignment.js';
import { validateDirectingPlan } from '../lib/directing.js';
import { findUnreviewedExports } from '../lib/continuous-improvement.js';
import { validatePhase1 } from './validate-youtube-phase1.js';
import { validateCreativeProject } from '../lib/creative-evidence.js';

export async function validatePhase1Full(projectDirectory) {
  const base = await validatePhase1(projectDirectory);
  const errors = [...base.errors];
  const p = projectPaths(projectDirectory);
  const meta = await readJson(p.meta);
  errors.push(...(await validateCreativeProject(projectDirectory)).errors.map(error => `Creative Evidence: ${error}`));

  if (Number(meta.narrationAlignmentGateVersion ?? 0) >= 1) {
    const [mapping, script, policy] = await Promise.all([
      readJson(p.mapping),
      readFile(p.script, 'utf8'),
      readJson(path.resolve(meta.narrationAlignmentPolicyFile || 'config/narration-alignment-policy.json'))
    ]);
    const alignment = validateNarrationAlignmentProject({ meta, mapping, policy, script });
    errors.push(...alignment.errors.map((error) => `Narration Alignment: ${error}`));
  }

  if (Number(meta.postVideoImprovementGateVersion ?? 0) >= 1) {
    const unreviewed = await findUnreviewedExports(process.cwd(), p.projectDir);
    errors.push(...unreviewed.map(x=>`Continuous Improvement: ${x.project} — ${x.reason}`));
  }

  if (Number(meta.directingGateVersion ?? 0) >= 1) {
    const [mapping, renderPlan, policy] = await Promise.all([
      readJson(p.mapping),
      readJson(p.renderPlan),
      readJson(path.resolve(meta.directingPolicyFile || 'config/directing-policy.json'))
    ]);
    const directing = validateDirectingPlan({ meta, mapping, renderPlan, policy });
    errors.push(...directing.errors.map((error) => `Directing: ${error}`));
  }

  return { passed: errors.length === 0, errors };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-phase1 -- --dir "youtube/<week>/<slug>"');
  const result = await validatePhase1Full(dir);
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Phase-1-Regel(n) verletzt.`);
  }
  console.log('YouTube Phase 1: BESTANDEN — inklusive Narration Alignment, Chronologie und Directing Gate.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`YouTube Phase 1: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
