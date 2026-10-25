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
  assert.equal(mapping.images.length, 82, "Bild 75 lieferte Flow nicht; Text liegt auf den Nachbarbildern");
  assert.equal(cast.characters.length, 5);
  assert.equal(mapping.images.filter((x) => x.visualForm === 'map-geography').length, 0);
  assert.equal(new Set(mapping.images.map((x) => x.subjectAction)).size, 82, 'jede Szene individuell');

  const wave = mapping.images.findIndex((x) => /wave of molasses|bursts open|tank collapses/i.test(x.subjectAction));
  const noon = mapping.images.findIndex((x) => x.narrationBeat.startsWith('Gegen halb eins'));
  assert.ok(wave > noon, 'Keine Welle vor 12:30 Uhr zeigen');

  // Bewährte Struktur: eine google-flow-prompt.txt mit dem ganzen Ablauf, Bilder in images/.
  const promptFolder = await readdir(`${dir}/00-bildprompts`);
  assert.ok(promptFolder.includes('google-flow-prompt.txt') && promptFolder.includes('images'));
  assert.ok(!promptFolder.includes('FLOW_PROMPTS'), 'keine Einzeldateien mehr');
  const prompt = await readFile(`${dir}/00-bildprompts/google-flow-prompt.txt`, 'utf8');
  assert.ok(prompt.length < 60000, `Flow-Prompt ist ${prompt.length} Zeichen lang`);
  assert.match(prompt, /SCHRITT 1 — COVER: DREI VARIANTEN[\s\S]*SCHRITT 7 — EIN ORDNER/);
  assert.equal((prompt.match(/^── Schritt 4\.\d+: Bilder /gm) || []).length, 9);
  const blocks = prompt.split(/^Bild \d{2} → speichern als .*$/m).slice(1);
  assert.equal(blocks.length, 82);
  for (const block of blocks) {
    const scenePrompt = block.split('\n\n')[0].replace(/^\s*Prompt:\n/, '');
    assert.ok(scenePrompt.length <= 600, `Szenen-Prompt zu lang: ${scenePrompt.slice(0, 60)}`);
    assert.doesNotMatch(scenePrompt, /\bBILD\b|\bIMAGE \d|\bSCENE \d/);
  }

  const pre = await validatePreproduction(dir);
  assert.equal(pre.passed, true, pre.errors.join('\n'));
  const p1 = await validatePhase1Full(dir);
  assert.equal(p1.passed, true, p1.errors.join('\n'));
});
