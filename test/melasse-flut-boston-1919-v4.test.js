import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { validatePhase1Full } from '../src/cli/validate-youtube-phase1-full.js';
import { validatePreproduction } from '../src/cli/validate-youtube-preproduction.js';

const dir = 'youtube/2026-KW44_26-10_bis_01-11/melasse-flut-boston-1919';
const json = async (file) => JSON.parse(await readFile(`${dir}/${file}`, 'utf8'));

test('Melasse-Flut 1919: erstes V4-Video besteht Story Engine, Bildplan und Phase 1', async () => {
  const [meta, mapping, cast] = await Promise.all([
    json('99-technik/video.json'), json('99-technik/BILD_AUDIO_ZUORDNUNG.json'), json('99-technik/CAST_BIBLE.json')
  ]);
  assert.equal(meta.storyEngineGateVersion, 1);
  assert.equal(meta.visualPlanGateVersion, 1);
  assert.equal(mapping.images.length, 83);
  assert.equal(cast.characters.length, 5);
  assert.equal(mapping.images.filter((x) => x.visualForm === 'map-geography').length, 0);
  assert.equal(new Set(mapping.images.map((x) => x.subjectAction)).size, 83, 'jede Szene individuell');

  const wave = mapping.images.findIndex((x) => /wave of molasses|bursts open|tank collapses/i.test(x.subjectAction));
  const noon = mapping.images.findIndex((x) => x.narrationBeat.startsWith('Gegen halb eins'));
  assert.ok(wave > noon, 'Keine Welle vor 12:30 Uhr zeigen');

  const prompts = (await readdir(`${dir}/00-bildprompts/FLOW_PROMPTS`)).filter((name) => /^Bild \d+\.txt$/.test(name));
  assert.equal(prompts.length, 83);
  for (const name of prompts) {
    const prompt = await readFile(`${dir}/00-bildprompts/FLOW_PROMPTS/${name}`, 'utf8');
    assert.doesNotMatch(prompt, /\bBILD\b|\bIMAGE \d|\bSCENE \d/, name);
    assert.ok(prompt.length <= 1200, `${name} ist zu lang`);
  }

  const pre = await validatePreproduction(dir);
  assert.equal(pre.passed, true, pre.errors.join('\n'));
  const p1 = await validatePhase1Full(dir);
  assert.equal(p1.passed, true, p1.errors.join('\n'));
});
