import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { projectPaths, readJson, sha256, writeJson } from '../src/lib/pipeline.js';
import { buildFigureDirectionPrompt, matchesSceneStyleAnchor, validateFigureDirection } from '../src/lib/figure-direction.js';
import { compileScenePrompt } from '../src/lib/flow-prompt.js';
import { creativePlanFingerprint, validateCreativeEvidence } from '../src/lib/creative-evidence.js';
import { fingerprint } from '../src/lib/production-integrity.js';
import { buildYoutubeFlowPrompt } from '../src/cli/build-youtube-flow-prompt.js';
import { validatePhase1Full } from '../src/cli/validate-youtube-phase1-full.js';

const styleLock = await readJson('config/flow-style-lock.json');
const scene = {
  imageNumber: 1, viewerTakeaway: 'The officer receives a message.', visualPurpose: 'Make the message handover readable.',
  topicAnchor: 'A historical harbour around 1900', visualForm: 'character-scene',
  visualConcept: 'A messenger offers a folded paper to an officer on a ship deck.',
  dominantSubject: 'the folded paper between two people', actionState: 'it is being handed over',
  composition: 'the paper is clear against a quiet part of the ship rail', camera: 'a medium three-quarter view',
  depthPlan: 'hands and paper in the middle ground, quiet dock behind', lightingMood: 'soft overcast daylight',
  continuityNote: 'Preserve the established deck and clothing.', historicalAccuracyNote: 'Use period-appropriate wool clothing and a plain folded paper.',
  visibleTextPolicy: 'NO_VISIBLE_TEXT', promptQcScore: 9, supportingElements: [],
  peoplePresence: 'prominent',
  figureDirection: {
    identity: 'A slim young messenger with short hair and an older broad-jawed officer with a short beard.',
    expression: 'Both keep small calm eyes and relaxed mouths; the officer shows attention through a slight brow contraction.',
    actionAndGaze: 'The messenger offers the folded paper; the officer looks at its edge rather than toward the viewer.',
    poseAndHands: 'The messenger supports the paper from below while the officer takes the near corner; both stand with weight on the deck.'
  }
};

test('Konkrete Figurenregie erreicht auch den kompakten Promptmodus', () => {
  const prompt = compileScenePrompt(scene, { styleLock, creativeEvidence: true });
  for (const value of Object.values(scene.figureDirection)) assert.ok(prompt.includes(value));
  assert.ok(prompt.includes(styleLock.figureDrawingPrompt));
  assert.equal(prompt.split(styleLock.figureDrawingPrompt).length - 1, 1);
  assert.doesNotMatch(prompt, /Use believable mature editorial human anatomy/);
});

test('Figurenfreie Szenen und Hintergrundpersonen bekommen passende unterschiedliche Prompts', () => {
  const empty = { ...scene, peoplePresence: 'none', figureDirection: null };
  assert.equal(buildFigureDirectionPrompt(empty, styleLock), '');
  const prompt = compileScenePrompt({ ...empty, visualForm: 'object-focus' }, { styleLock });
  assert.ok(!prompt.includes(styleLock.figureDrawingPrompt));
  const background = buildFigureDirectionPrompt({ ...scene, peoplePresence: 'background', figureDirection: null }, styleLock);
  assert.equal(background, styleLock.backgroundFigurePrompt);
  assert.doesNotMatch(background, /Character identity:/);
});

test('Neue Figurenplanung blockiert fehlende Regie statt natürliche Hände nur pauschal zu behaupten', () => {
  const incomplete = { ...scene, figureDirection: { identity: scene.figureDirection.identity } };
  assert.equal(validateFigureDirection(incomplete).length, 3);
  assert.throws(() => compileScenePrompt(incomplete, { styleLock, creativeEvidence: true }), /expression|actionAndGaze|poseAndHands/);
  const missingPresence = { ...scene, peoplePresence: null };
  assert.match(validateCreativeEvidence({ meta: { schemaVersion: 4, figureDirectionVersion: 1 }, mapping: { images: [missingPresence] } }).errors.join(' '), /peoplePresence/);
  assert.deepEqual(validateCreativeEvidence({ meta: { schemaVersion: 4 }, mapping: { images: [missingPresence] } }).errors, []);
});

test('Style-Drift-Risikowörter werden auch in der neuen Figurenregie erkannt', () => {
  const drift = { ...scene, figureDirection: { ...scene.figureDirection, expression: 'An epic face with a cinematic dramatic reaction.' } };
  assert.throws(() => compileScenePrompt(drift, { styleLock }), /Style-Drift-Risikowörter/);
});

test('Alte Stilanker bleiben lesbar, neue Figurenpläne verlangen den vollständigen aktuellen Anker', () => {
  const legacy = styleLock.legacySceneStyleAnchors[0];
  assert.equal(matchesSceneStyleAnchor(legacy, styleLock, {}), true);
  assert.equal(matchesSceneStyleAnchor(legacy, styleLock, { figureDirectionVersion: 1 }), false);
  assert.equal(matchesSceneStyleAnchor(styleLock.sceneStyleAnchor.slice(0, 70), styleLock, { figureDirectionVersion: 1 }), false);
  assert.equal(matchesSceneStyleAnchor(styleLock.sceneStyleAnchor, styleLock, { figureDirectionVersion: 1 }), true);
});

test('Neuer Figurenplan baut einen vollständigen Phase-1-Prompt mit Narration und besteht alle aktivierten Gates', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-figure-plan-'));
  try {
    const source = projectPaths('youtube/2026-KW40_28-09_bis_04-10/hannibal-feuertrick');
    const p = projectPaths(dir);
    const [meta, mapping, worldLock, renderPlan, script] = await Promise.all([
      readJson(source.meta), readJson(source.mapping), readJson(source.flowWorldLock), readJson(source.renderPlan), readFile(source.script, 'utf8')
    ]);
    Object.assign(meta, { schemaVersion: 5, creativeEvidenceVersion: 1, figureDirectionVersion: 1, narrationAlignmentGateVersion: 1,
      chronologyPolicy: { mode: 'strict-chronological', flashbacksAllowed: false, futureEventLeakageForbidden: true } });
    meta.coverPolicy.firstSceneIsCover = false;
    mapping.planningStartedAt = '2026-10-21T10:01:00Z';
    worldLock.entities = [];
    for (const image of mapping.images) Object.assign(image, {
      sequenceId: 'synthetic-test-sequence', beatFunction: 'consequence', knowledgeChange: image.viewerTakeaway,
      visibleEvidence: image.visualConcept, claimIds: ['synthetic-claim'], visualReferenceIds: ['synthetic-reference'],
      focusPoint: { x: 0.5, y: 0.5 }, continuity: [], overlays: [], visibleTextPolicy: 'NO_VISIBLE_TEXT',
      narrationBeat: image.startAnchor, timeContext: 'Synthetic chronological integration test', chronologyStep: image.imageNumber,
      visualAnswer: image.visualConcept, narrationMatchScore: 9, clarityScore: 9,
      peoplePresence: image.visualForm === 'character-scene' ? 'prominent' : 'background',
      figureDirection: image.visualForm === 'character-scene' ? { ...scene.figureDirection } : null
    });
    const research = {
      schemaVersion: 1,
      sources: [{ id: 'synthetic-source', title: 'Synthetic integration test source', url: 'https://example.org/fixture', locator: 'Synthetic fixture, no production research' }],
      claims: [{ id: 'synthetic-claim', statement: 'Synthetic historical statement for testing.', evidence: 'Synthetic fixture evidence for testing.', certainty: 'supported', sourceIds: ['synthetic-source'] }],
      visualReferences: [{ id: 'synthetic-reference', sourceId: 'synthetic-source', description: 'Synthetic reference used only by this test.', mustShow: ['Readable period environment for this fixture'], mustAvoid: ['Modern objects inside this synthetic fixture'] }]
    };
    await mkdir(path.dirname(p.script), { recursive: true });
    await mkdir(path.dirname(p.prompt), { recursive: true });
    await writeFile(p.script, script);
    const scriptSha256 = await sha256(p.script);
    const review = {
      script: { status: 'APPROVED', reviewer: 'Synthetic integration fixture', reviewedAt: '2026-10-21T10:00:00Z', scriptSha256, researchFingerprint: fingerprint(research),
        centralQuestion: 'Synthetic fixture question for this test?', endingAnswer: 'Synthetic fixture answer for this test.', readAloudReviewed: true,
        observations: ['Synthetic fixture only; no actual production approval.'],
        causalLinks: [{ cause: 'Synthetic cause for integration testing.', decision: 'Synthetic decision for integration testing.', consequence: 'Synthetic consequence for integration testing.', scriptEvidence: script.trim() }] },
      sequence: { status: 'APPROVED', reviewer: 'Synthetic integration fixture', reviewedAt: '2026-10-21T10:02:00Z', openingMatchesPromise: true, endingAnswersQuestion: true, continuityReviewed: true,
        observations: ['Synthetic fixture only; no actual production approval.'], planFingerprint: creativePlanFingerprint({ scriptSha256, mapping, research, worldLock }) }
    };
    for (const [file, data] of [[p.meta, meta], [p.mapping, mapping], [p.flowWorldLock, worldLock], [p.renderPlan, renderPlan], [p.researchEvidence, research], [p.creativeReview, review]]) await writeJson(file, data);
    await buildYoutubeFlowPrompt(dir);
    const prompt = await readFile(p.prompt, 'utf8');
    assert.ok(prompt.includes(styleLock.figureDrawingPrompt));
    for (const image of mapping.images) assert.ok(prompt.includes(`the exact spoken beat for this image is: "${image.narrationBeat}"`));
    const result = await validatePhase1Full(dir);
    assert.deepEqual(result.errors, []);
    assert.equal(result.passed, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
