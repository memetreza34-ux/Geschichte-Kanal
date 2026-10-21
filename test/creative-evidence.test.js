import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { creativePlanFingerprint, validateCreativeEvidence, validateCreativeImageReview, validateOverlays } from '../src/lib/creative-evidence.js';
import { fingerprint } from '../src/lib/production-integrity.js';
import { safeImageTransform } from '../src/lib/render-math.js';
import { compileFlowPrompt } from '../src/lib/flow-prompt.js';
import { execFileAsync, projectPaths, sha256, writeJson } from '../src/lib/pipeline.js';
import { previewYoutubePlan } from '../src/cli/preview-youtube-plan.js';
import { optimizeAudio } from '../src/cli/optimize-youtube-audio.js';

function fixture() {
  const script = 'Der Wagen wartet vor dem Tor. Weil die Straße gesperrt ist, erreicht die Lieferung das Tor nicht.';
  const scene = {
    imageNumber: 1, imageFile: 'Bild 01.png', startAnchor: 'Der Wagen wartet vor dem Tor',
    narrationBeat: script, sequenceId: 'supply-road', beatFunction: 'consequence',
    knowledgeChange: 'Die Sperre verhindert die Lieferung.', visibleEvidence: 'Ein beladener Wagen wartet direkt vor der geschlossenen Holzbarriere.',
    claimIds: ['road-blocked'], visualReferenceIds: ['gate-shape'], focusPoint: { x: 0.35, y: 0.6 },
    continuity: [{ entityId: 'road', fromState: 'Die Zufahrtsstraße ist frei befahrbar.', toState: 'Eine Holzbarriere sperrt die Zufahrtsstraße.' }], overlays: [], visibleTextPolicy: 'NO_VISIBLE_TEXT',
    viewerTakeaway: 'The delivery cannot reach the gate.', visualPurpose: 'Show the stopped supply cart.', topicAnchor: 'Historic gate', visualForm: 'object-focus',
    visualConcept: 'A loaded cart stops before a closed timber barrier.', dominantSubject: 'the loaded wooden cart', actionState: 'it stands at the barrier',
    composition: 'cart left and gate right, with barrier physically between them', camera: 'a road-level medium view', depthPlan: 'cart foreground, barrier midground, gate behind',
    lightingMood: 'overcast daylight', continuityNote: 'Keep the same rectangular gate and road.', historicalAccuracyNote: 'Use the documented gate silhouette.',
    colorIntent: 'Cool gray rain against warm timber', worldLifeDetail: 'Mud beneath the cart wheels', promptQcScore: 9
  };
  const research = { schemaVersion: 1,
    sources: [{ id: 'record', title: 'Test record of the historical gate', url: 'https://example.org/gate', locator: 'Page 12, section on the road blockade' }],
    claims: [{ id: 'road-blocked', statement: 'The barrier stopped the delivery.', evidence: 'The record describes a barrier across the road.', certainty: 'supported', sourceIds: ['record'] }],
    visualReferences: [{ id: 'gate-shape', sourceId: 'record', description: 'The historical gate had a rectangular opening.', mustShow: ['The rectangular stone gate opening'], mustAvoid: ['Modern concrete and rounded fantasy towers'] }]
  };
  const input = { meta: { schemaVersion: 5, creativeEvidenceVersion: 1, plannedImageCount: 1, title: 'Test gate', coverPolicy: { firstSceneIsCover: false, coverText: 'DAS GESPERRTE TOR' } },
    script, scriptSha256: 'test-script-fingerprint', research,
    mapping: { planningStartedAt: '2026-10-21T10:01:00Z', images: [scene] },
    worldLock: { status: 'READY', settingName: 'The rectangular historical gate', settingDescription: 'A gray stone gate with one rectangular opening.', entities: [{ id: 'road', identity: 'The same muddy road approaching the gate.', initialState: 'Die Zufahrtsstraße ist frei befahrbar.' }] },
    review: { script: { status: 'APPROVED', reviewer: 'Synthetic test fixture', reviewedAt: '2026-10-21T10:00:00Z', scriptSha256: 'test-script-fingerprint', researchFingerprint: fingerprint(research), centralQuestion: 'Warum erreicht die Lieferung das Tor nicht?', endingAnswer: 'Die gesperrte Straße verhindert die Lieferung.', readAloudReviewed: true, observations: ['Testbeleg für den zusammenhängenden Skriptfluss.'], causalLinks: [{ cause: 'Die Straße wird vollständig gesperrt.', decision: 'Der Wagen muss vor der Barriere warten.', consequence: 'Die Lieferung erreicht das Stadttor nicht.', scriptEvidence: script }] },
      sequence: { status: 'APPROVED', reviewer: 'Synthetic test fixture', reviewedAt: '2026-10-21T10:02:00Z', openingMatchesPromise: true, endingAnswersQuestion: true, continuityReviewed: true, observations: ['Der Wagen und die Sperre bilden einen räumlich lesbaren Zusammenhang.'] } }
  };
  input.review.sequence.planFingerprint = creativePlanFingerprint(input);
  return input;
}

test('Kreativ-Gate verlangt echte Belege und bindet Freigaben an den aktuellen Inhalt', () => {
  const input = fixture();
  assert.deepEqual(validateCreativeEvidence(input).errors, []);
  input.mapping.images[0].visibleEvidence = 'A different scene with no visible road.';
  assert.match(validateCreativeEvidence(input).errors.join(' '), /Sequenzprüfung.*veraltet/);
  input.review.sequence.planFingerprint = creativePlanFingerprint(input);
  input.research.claims[0].certainty = 'uncertain';
  assert.match(validateCreativeEvidence(input).errors.join(' '), /Unsicherheit/);
  assert.match(validateCreativeEvidence(input).errors.join(' '), /Skriptprüfung gehört nicht/);
  input.review.script.status = 'PLANNED';
  assert.match(validateCreativeEvidence(input).errors.join(' '), /echte Prüfung/);
  assert.equal(validateCreativeEvidence({ meta: { schemaVersion: 4 } }).passed, true);
  assert.equal(validateCreativeEvidence({ meta: { schemaVersion: 5 } }).passed, false);
});

test('Kontinuitätszustände dürfen nach einem Szenenwechsel nicht zurückspringen', () => {
  const input = fixture();
  input.mapping.images.push({ ...structuredClone(input.mapping.images[0]), imageNumber: 2, imageFile: 'Bild 02.png' });
  input.review.sequence.planFingerprint = creativePlanFingerprint(input);
  assert.match(validateCreativeEvidence(input).errors.join(' '), /Zustand von road springt zurück/);
  input.mapping.images[1].continuity[0].fromState = 'Eine Holzbarriere sperrt die Zufahrtsstraße.';
  input.review.sequence.planFingerprint = creativePlanFingerprint(input);
  assert.equal(validateCreativeEvidence(input).passed, true);
  input.mapping.planningStartedAt = '2026-10-21T09:59:00Z';
  assert.match(validateCreativeEvidence(input).errors.join(' '), /Szenenplanung muss nach/);
});

test('Gemessene Alignment-Zeiten ändern die Planfreigabe nicht; neue Bildinhalte schon', () => {
  const input = fixture();
  const before = creativePlanFingerprint(input);
  Object.assign(input.mapping.images[0], { actualStartSeconds: 0, actualEndSeconds: 4, alignmentConfidence: 0.98 });
  input.mapping.autoAlignment = { matched: 1 };
  assert.equal(creativePlanFingerprint(input), before);
  input.mapping.images[0].overlays = [{ type: 'label', text: 'Stadttor', x: 0.8, y: 0.2, purpose: 'Das Ziel der blockierten Zufahrt benennen.' }];
  assert.notEqual(creativePlanFingerprint(input), before);
  assert.deepEqual(validateOverlays(input.mapping.images[0].overlays), []);
  assert.ok(validateOverlays([{ type: 'label', text: 'BILD 01', x: 0.8, y: 0.2, purpose: 'Ein unerwünschtes internes Label.' }]).length);
  assert.ok(validateOverlays([{ type: 'route', points: [{ x: 0.4, y: 0.4 }, { x: NaN, y: 1 }], purpose: 'Eine nachvollziehbare Reiseroute zeigen.' }]).length);
});

test('Kompakter Prompt nennt konkrete historische Muss-/Ausschlussmerkmale und hält Labels aus dem Bild', () => {
  const input = fixture();
  input.mapping.images[0].overlays = [{ type: 'label', text: 'Stadttor', x: 0.8, y: 0.2, purpose: 'Das Ziel der blockierten Zufahrt benennen.' }];
  const styleLock = { status: 'READY', styleId: 'test', masterStylePrompt: 'A restrained drawn history illustration.', sceneStyleAnchor: 'Flat drawn history style.', globalNegativePrompt: 'No photorealism or pseudo-writing.' };
  const prompt = compileFlowPrompt({ ...input, styleLock });
  assert.match(prompt, /Must show: The rectangular stone gate opening/);
  assert.match(prompt, /Must avoid: Modern concrete/);
  assert.match(prompt, /Visible evidence that must be legible/);
  assert.ok(prompt.includes(`Narration context, never draw these words: ${input.mapping.images[0].narrationBeat}`));
  assert.match(prompt, /STOP for explicit user selection/);
  assert.match(prompt, /ZERO visible text/);
  const block = prompt.split('\n\nBILD 01\n')[1];
  assert.doesNotMatch(block, /DAS GESPERRTE TOR|"Stadttor"/);
});

test('Kamerafokus wirkt und Bewegung bleibt auch bei Randfokus innerhalb des Bildes', () => {
  for (const focusPoint of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.35, y: 0.6 }]) {
    const transform = safeImageTransform({ scale: 1.01, x: 30, y: -30, width: 1920, height: 1080, focusPoint });
    assert.ok(Math.abs(transform.x) <= 9.600001);
    assert.ok(Math.abs(transform.y) <= 5.400001);
  }
  const left = safeImageTransform({ scale: 1.05, x: 0, y: 0, width: 1920, height: 1080, focusPoint: { x: 0.2, y: 0.5 } });
  assert.ok(left.x > 0);
});

test('Storyboard und Bild-QC bewahren den tatsächlichen Prüfstatus und verlangen konkrete Sichtbefunde', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-creative-review-'));
  try {
    const input = fixture();
    const p = projectPaths(dir);
    await mkdir(path.dirname(p.script), { recursive: true });
    await writeFile(p.script, input.script);
    input.scriptSha256 = await sha256(p.script);
    input.review.script.scriptSha256 = input.scriptSha256;
    input.review.sequence.planFingerprint = creativePlanFingerprint(input);
    for (const [file, data] of [[p.meta, input.meta], [p.mapping, input.mapping], [p.researchEvidence, input.research], [p.creativeReview, input.review], [p.flowWorldLock, input.worldLock]]) await writeJson(file, data);
    const qc = { status: 'APPROVED', reviewer: 'Synthetic fixture', reviewedAt: '2026-10-21T10:03:00Z', planFingerprint: creativePlanFingerprint(input), images: [{ imageNumber: 1 }] };
    assert.match((await validateCreativeImageReview(dir, qc)).errors.join(' '), /Sichtbefund narrationEvidence/);
    Object.assign(qc.images[0], { narrationEvidence: 'Der Wagen steht sichtbar an der Barriere.', continuityEvidence: 'Straßenverlauf und Tor bleiben erkennbar gleich.', historicalEvidence: 'Die rechteckige Toröffnung entspricht der Referenz.', textEvidence: 'Im erzeugten Bild ist keinerlei Schrift erkennbar.' });
    assert.equal((await validateCreativeImageReview(dir, qc)).passed, true);
    input.meta.title = '<script>alert(1)</script>';
    await writeJson(p.meta, input.meta);
    const before = await readFile(p.creativeReview, 'utf8');
    const preview = await previewYoutubePlan(dir);
    const html = await readFile(preview.output, 'utf8');
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    assert.equal(await readFile(p.creativeReview, 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Neue Audioverarbeitung erhält eine innere Denkpause und verändert das Original nicht', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-natural-pauses-'));
  try {
    const p = projectPaths(dir);
    await mkdir(p.audioDir, { recursive: true });
    const source = path.join(p.audioDir, 'voice.wav');
    await execFileAsync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono:d=0.8', '-filter_complex', '[0:a][1:a][0:a]concat=n=3:v=0:a=1[out]', '-map', '[out]', source]);
    const hash = await sha256(source);
    await writeJson(p.meta, { audioPolicy: { playbackRate: 1, preserveInternalPauses: true } });
    const report = await optimizeAudio(dir);
    assert.equal(report.passed, true);
    assert.equal(await sha256(source), hash);
    assert.ok(report.afterSeconds > 2.7 && report.afterSeconds < 2.9);
    const { stderr } = await execFileAsync('ffmpeg', ['-hide_banner', '-i', p.optimizedAudio, '-af', 'silencedetect=noise=-40dB:d=0.5', '-f', 'null', '-']);
    assert.match(stderr, /silence_duration: 0\.[78]/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
