import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { lintScript, validateStoryBlueprint } from '../src/lib/story-engine.js';
import { compileFlowPromptFiles, compileScenePromptV4, validateCastBible, validateVisualPlan } from '../src/lib/visual-plan.js';
import { compileScenePrompt } from '../src/lib/flow-prompt.js';
import { writeFlowPromptFiles } from '../src/cli/build-youtube-flow-prompt.js';
import { projectPaths } from '../src/lib/pipeline.js';

const storyPolicy = JSON.parse(await readFile('config/story-engine-policy.json', 'utf8'));
const visualPolicy = JSON.parse(await readFile('config/visual-policy.json', 'utf8')).visualPlanV4;
const styleLock = JSON.parse(await readFile('config/flow-style-lock.json', 'utf8'));

const GOOD_SCRIPT = `Es ist kurz nach ein Uhr nachts, als Thomas Farriner von beißendem Rauch geweckt wird. Unten in seiner Backstube schlagen Flammen aus dem Ofen, und ein einzelner Funke springt auf das Holz. Samuel Pepys schläft zu dieser Zeit noch. Was er nicht ahnt: Zwei Tage später wird er in seinem Garten eine Grube ausheben. Warum konnte niemand dieses Feuer stoppen?

London ist eng gebaut, und die oberen Stockwerke berühren sich fast. Der Lord Mayor zögert, aber das Feuer wartet nicht. Samuel Pepys fährt mit dem Boot über die Themse und sieht Menschen, die Möbel in Kähne werfen. Er schreibt in sein Tagebuch, dass die Flammen wie ein Bogen über der Stadt stehen. Deshalb eilt er zum König. Mehr als 13.000 Häuser werden am Ende zerstört sein.

Am Dienstag kommt das Feuer näher an sein Viertel. Samuel Pepys hebt im Garten eine Grube aus und vergräbt seinen Wein und seinen Parmesan. Erst als Soldaten Häuser mit Schießpulver sprengen, findet das Feuer keine Nahrung mehr. Rund 100.000 Menschen sind obdachlos.

Samuel Pepys gräbt seinen Parmesan wieder aus. Die Stadt riecht noch wochenlang nach Rauch. Ein einzelner Funke hatte gereicht.`;

const GOOD_BLUEPRINT = {
  status: 'APPROVED',
  coldOpen: { firstWords: 'Es ist kurz nach ein Uhr nachts', scene: 'Farriner wacht in der brennenden Bäckerei auf und muss fliehen.' },
  centralQuestion: 'Warum konnte niemand dieses Feuer stoppen?',
  guideCharacter: { name: 'Samuel Pepys' },
  openLoops: [
    { setupQuote: 'Zwei Tage später wird er in seinem Garten eine Grube ausheben', payoffQuote: 'hebt im Garten eine Grube aus' },
    { setupQuote: 'Der Lord Mayor zögert, aber das Feuer wartet nicht', payoffQuote: 'Soldaten Häuser mit Schießpulver sprengen' },
    { setupQuote: 'Deshalb eilt er zum König', payoffQuote: 'findet das Feuer keine Nahrung mehr' }
  ],
  vividDetails: [
    { quote: 'Möbel in Kähne werfen', source: 'Pepys, Tagebuch, 2.9.1666' },
    { quote: 'Mehr als 13.000 Häuser', source: 'Museum of London' },
    { quote: 'seinen Wein und seinen Parmesan', source: 'Pepys, Tagebuch, 4.9.1666' },
    { quote: 'Rund 100.000 Menschen sind obdachlos', source: 'Museum of London' },
    { quote: 'die oberen Stockwerke berühren sich fast', source: 'Tinniswood, By Permission of Heaven' }
  ],
  eyewitness: { quote: 'wie ein Bogen über der Stadt', source: 'Pepys, Tagebuch, 2.9.1666' },
  endingCallback: { quote: 'Ein einzelner Funke' }
};

test('Story Engine: die echten Skripte von London und Ostsee fallen durch den Lint', async () => {
  const london = await readFile('youtube/2026-KW41_05-10_bis_11-10/great-fire-london-1666/01-voice-script/voice-script.txt', 'utf8');
  const baltic = await readFile('youtube/2026-KW42_12-10_bis_18-10/baltische-flotte-1905/01-voice-script/voice-script.txt', 'utf8');
  const londonLint = lintScript(london, storyPolicy);
  const balticLint = lintScript(baltic, storyPolicy);
  assert.equal(londonLint.passed, false);
  assert.ok(londonLint.errors.some((error) => error.includes('Datum')), 'London beginnt mit „2. September“');
  assert.ok(londonLint.errors.some((error) => error.includes('das ist entscheidend')));
  assert.equal(balticLint.passed, false);
  assert.ok(balticLint.errors.some((error) => error.includes('Datum')), 'Ostsee beginnt mit „Oktober 1904“');
  assert.ok(balticLint.errors.some((error) => error.includes('etwas grundsätzliches')));
});

test('Story Engine: ein Skript mit Szene, Schleifen, Details und Rückgriff besteht', () => {
  const result = validateStoryBlueprint(GOOD_BLUEPRINT, GOOD_SCRIPT, storyPolicy);
  assert.deepEqual(result.errors, []);
});

test('Story Engine: Blueprint-Behauptungen ohne Beleg im Skript werden blockiert', () => {
  const fake = structuredClone(GOOD_BLUEPRINT);
  fake.vividDetails[0].quote = 'Pepys rettet eine Katze';
  fake.openLoops[0] = { setupQuote: 'hebt im Garten eine Grube aus', payoffQuote: 'Zwei Tage später wird er in seinem Garten eine Grube ausheben' };
  fake.guideCharacter.name = 'Thomas Farriner';
  const result = validateStoryBlueprint(fake, GOOD_SCRIPT, storyPolicy);
  assert.ok(result.errors.some((error) => error.includes('Pepys rettet eine Katze')));
  assert.ok(result.errors.some((error) => error.includes('Auflösung muss nach dem Aufbau')));
  assert.ok(result.errors.some((error) => error.includes('Führungsfigur')));
});

test('Story Engine: Aufzählungs-Ende und späte Frage werden erkannt', () => {
  const script = `${GOOD_SCRIPT}\n\nEs lag an Holz, Wind, Hitze, Lagern, Enge, Zögern und fehlender Feuerwehr.`;
  const result = validateStoryBlueprint(GOOD_BLUEPRINT, script, storyPolicy);
  assert.ok(result.errors.some((error) => error.includes('Aufzählung')));
  assert.ok(result.errors.some((error) => error.includes('letzten Absatz')));
  const late = validateStoryBlueprint(GOOD_BLUEPRINT, GOOD_SCRIPT, { ...storyPolicy, hookWindowWords: 20 });
  assert.ok(late.errors.some((error) => error.includes('centralQuestion kommt erst')));
});

const CAST = {
  status: 'READY',
  eraWardrobe: ['1660s falling band collars', 'shoulder-length periwigs', 'wide-brimmed felt hats'],
  eraForbidden: ['tricorn hats', '18th-century powdered wigs'],
  characters: [{
    id: 'pepys',
    name: 'Samuel Pepys',
    identity: '33-year-old English naval official, shoulder-length dark brown periwig, clean-shaven round face, dark wool coat with white linen falling band collar',
    referenceImage: '00-bildprompts/cast/pepys.png'
  }]
};

function scene(n, overrides = {}) {
  return {
    imageNumber: n,
    locationKey: `ort-${n}`,
    shotScale: 'wide',
    visualForm: 'environment-only',
    visualConcept: `Burning timber houses along a narrow lane, view ${n}`,
    actionState: `Flames move west, view ${n}`,
    viewerTakeaway: `The fire spreads, view ${n}`,
    composition: `Composition ${n}`,
    timeContext: 'London, 2 September 1666, night',
    camera: 'Wide shot from a rooftop',
    lightingMood: 'Orange firelight against a dark blue sky',
    narrationBeat: 'Das Feuer breitet sich aus.',
    ...overrides
  };
}

test('Bildplan V4: Ortswiederholung, Karten, Split-Screen und Schablonen werden blockiert', () => {
  const images = Array.from({ length: 10 }, (_, i) => scene(i + 1));
  for (const n of [0, 1, 2]) Object.assign(images[n], { locationKey: 'pudding-lane', shotScale: 'medium' });
  for (const n of [3, 4]) images[n].visualForm = 'map-geography';
  images[5].composition = 'Left half: before. Right half: after, side by side';
  images[6].visualConcept = images[6].actionState = images[6].viewerTakeaway = 'Gleicher Satz';
  images[7].visualConcept = 'Samuel Pepys watches from a boat';
  const errors = validateVisualPlan({ mapping: { images }, cast: CAST, policy: visualPolicy }).errors.join('\n');
  assert.match(errors, /Bild 3: 3× derselbe Ort/);
  assert.match(errors, /pudding-lane.*3 von 10/);
  assert.match(errors, /2 von 10 Bildern sind Karten/);
  assert.match(errors, /Bild 6: Split-Screen/);
  assert.match(errors, /Bild 7: .*Schablonen-Card/);
  assert.match(errors, /Bild 8: Samuel Pepys wird genannt/);
});

test('Bildplan V4: Figurenbibel verlangt feste Identität, Referenzbild und Epochenkleidung', () => {
  assert.equal(validateCastBible(CAST, visualPolicy).passed, true);
  const bad = { status: 'READY', eraWardrobe: [], characters: [{ id: 'Pepys', name: 'Pepys', identity: 'man with wig' }] };
  const errors = validateCastBible(bad, visualPolicy).errors.join('\n');
  assert.match(errors, /id nur aus/);
  assert.match(errors, /identity braucht/);
  assert.match(errors, /referenceImage/);
  assert.match(errors, /eraWardrobe/);
});

test('Prompt V4: kurz, ohne Bildnummer, mit wortgleicher Figur und Ausschlüssen', () => {
  const card = scene(35, { castIds: ['pepys'], visualForm: 'character-scene', subjectAction: 'Samuel Pepys writes in a small notebook on the Thames bank while the city burns' });
  const prompt = compileScenePromptV4(card, { cast: CAST, policy: visualPolicy });
  assert.ok(prompt.length >= visualPolicy.minPromptChars && prompt.length <= visualPolicy.maxPromptChars, `Länge ${prompt.length}`);
  assert.doesNotMatch(prompt, /BILD|IMAGE \d|SCENE \d|35/);
  assert.ok(prompt.includes(CAST.characters[0].identity));
  assert.match(prompt, /Exclude: .*split screen.*tricorn hats/);
  assert.doesNotMatch(prompt, /Period clothing/, 'Figurenbeschreibung reicht, keine doppelte Kleidung');
  const crowd = compileScenePromptV4({ ...card, castIds: [], subjectAction: 'Londoners carry furniture to the river' }, { cast: CAST, policy: visualPolicy });
  assert.match(crowd, /Period clothing: 1660s falling band collars/);
  const today = compileScenePromptV4({ ...card, castIds: [], modernScene: true }, { cast: CAST, policy: visualPolicy });
  assert.doesNotMatch(today, /tricorn hats|Period clothing/);
  const { files, passed } = compileFlowPromptFiles({ mapping: { images: [card] }, cast: CAST, policy: visualPolicy });
  assert.equal(passed, true);
  assert.deepEqual(files.map((file) => file.name), ['Bild 35.txt', 'CAST_pepys.txt']);
});

test('Flow Compiler V3: Vergleichsbilder bekommen die Single-Frame-Sperre und keine doppelten Sätze', () => {
  const card = {
    imageNumber: 7, viewerTakeaway: 'x', visualPurpose: 'x', topicAnchor: 'x', visualForm: 'comparison',
    visualConcept: 'Narrow timber lane beside a firebreak', dominantSubject: 'the firebreak', actionState: 'Narrow timber lane beside a firebreak',
    composition: 'Foreground lane, background gap', camera: 'wide shot', depthPlan: 'near lane, far gap', lightingMood: 'dawn',
    continuityNote: 'same lane', historicalAccuracyNote: '1666 London', promptQcScore: 9, visibleTextPolicy: 'NO_VISIBLE_TEXT'
  };
  const prompt = compileScenePrompt(card, { styleLock });
  assert.match(prompt, /no split screen, no side-by-side halves, no panels/);
  assert.equal(prompt.split('Narrow timber lane beside a firebreak.').length - 1, 1);
});

test('Flow-Build V4 schreibt Einzel-Prompts und ersetzt nur generierte Dateien', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'flow v4 '));
  try {
    const p = projectPaths(root);
    await mkdir(p.techDir, { recursive: true });
    await mkdir(p.flowPromptDir, { recursive: true });
    await writeFile(p.castBible, JSON.stringify(CAST), 'utf8');
    await writeFile(path.join(p.flowPromptDir, 'Bild 99.txt'), 'alt', 'utf8');
    await writeFile(path.join(p.flowPromptDir, 'NOTIZEN.md'), 'eigene Notiz', 'utf8');
    const mapping = { images: [scene(1), scene(2, { castIds: ['pepys'], visualForm: 'character-scene' })] };
    assert.equal(await writeFlowPromptFiles(p, { meta: {}, mapping }), 3);
    assert.deepEqual((await readdir(p.flowPromptDir)).sort(), ['Bild 01.txt', 'Bild 02.txt', 'CAST_pepys.txt', 'NOTIZEN.md']);
    assert.ok((await readFile(path.join(p.flowPromptDir, 'Bild 02.txt'), 'utf8')).includes('@SamuelPepys'));
    mapping.images[1].locationKey = 'Kein Kebab';
    await assert.rejects(writeFlowPromptFiles(p, { meta: {}, mapping }), /locationKey fehlt/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
