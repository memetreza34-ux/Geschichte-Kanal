import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { evaluateTopic } from '../src/cli/check-youtube-topic.js';
import { buildCaption, finalizeYoutubeExport } from '../src/cli/finalize-youtube-export.js';
import { resolveAudioPolicy } from '../src/cli/optimize-youtube-audio.js';
import { createPhase3ImageLock, verifyPhase3ImageLock } from '../src/cli/phase3-image-lock.js';
import { validatePhase1 } from '../src/cli/validate-youtube-phase1.js';
import { findHighRiskPromptWords } from '../src/lib/flow-prompt.js';
import { normalizeText, similarity } from '../src/lib/pipeline.js';

test('Repo besitzt Narration-first History-Bildwelt und Flow Compiler V3', async () => {
  const visual = JSON.parse(await readFile('config/visual-policy.json', 'utf8'));
  const styleLock = JSON.parse(await readFile('config/flow-style-lock.json', 'utf8'));
  const channel = JSON.parse(await readFile('config/channel-policy.json', 'utf8'));
  const registry = JSON.parse(await readFile('config/topic-registry.json', 'utf8'));

  assert.equal(visual.status, 'READY');
  assert.equal(visual.styleId, 'history-stickman-adaptive-v1');
  assert.equal(visual.promptSystemVersion, 3);
  assert.equal(visual.promptSystem, 'flow-compiler-v3');
  assert.equal(visual.scenePlanningSchemaVersion, 2);
  assert.equal(visual.visualDirectorRequired, true);
  assert.equal(visual.flowPromptCompilerRequiredForNewProjects, true);
  assert.equal(visual.flowWorldLockRequired, true);
  assert.equal(visual.storyBeatPlanningRequired, true);
  assert.equal(visual.narrationFirstVisualSelectionRequired, true);
  assert.equal(visual.genericStickmanCloneForbidden, true);
  assert.equal(visual.prominentCharacterIndividualityRequired, true);
  assert.equal(visual.minimumVariationAxesForProminentUnrelatedCharacters, 3);
  assert.equal(visual.multiMomentIllustrationAllowed, true);
  assert.equal(visual.detailInsetAllowed, true);
  assert.equal(visual.cutawaySectionAllowed, true);
  assert.equal(visual.evidenceReconstructionAllowed, true);
  assert.ok(visual.supportedVisualForms.includes('multi-moment-illustration'));
  assert.ok(visual.supportedVisualForms.includes('detail-inset'));
  assert.ok(visual.supportedVisualForms.includes('cutaway-section'));
  assert.ok(visual.supportedVisualForms.includes('evidence-reconstruction'));

  assert.equal(styleLock.status, 'READY');
  assert.equal(styleLock.styleId, visual.styleId);
  assert.equal(styleLock.promptSystem, 'flow-compiler-v3');
  assert.equal(styleLock.characterIndividualityPolicy?.enabled, true);
  assert.equal(styleLock.characterIndividualityPolicy?.genericStickmanCloneForbidden, true);
  assert.ok(styleLock.masterStylePrompt.length > 500);
  assert.match(styleLock.masterStylePrompt, /stylized historical people/i);
  assert.match(styleLock.sceneStyleAnchor, /individualized stylized historical humans/i);
  assert.match(styleLock.globalNegativePrompt, /generic identical stickman/i);

  assert.equal(channel.visualSystem?.status, 'READY');
  assert.equal(channel.visualSystem?.styleId, visual.styleId);
  assert.equal(channel.visualSystem?.narrationFirstVisualSelectionRequired, true);
  assert.equal(channel.visualSystem?.genericStickmanCloneForbidden, true);
  assert.equal(channel.scriptRules?.storyBeforeExplanation, true);
  assert.equal(channel.scriptRules?.contextJustInTime, true);
  assert.equal(channel.scriptRules?.revealInformationWhenItPaysOff, true);
  assert.equal(channel.scriptRules?.endingNeedsPayoffNotSummary, true);
  assert.equal(channel.uploadRules?.captionFileRequired, true);
  assert.equal(channel.uploadRules?.captionFile, '03-export/CAPTION.txt');
  assert.equal(channel.uploadRules?.subtitleFileRequired, true);
  assert.equal(channel.uploadRules?.subtitleFile, '03-export/SUBTITLES.srt');

  assert.ok(Array.isArray(registry.entries));
  for (const entry of registry.entries) {
    assert.ok(entry.id);
    assert.ok(entry.title);
    assert.ok(Array.isArray(entry.aliases));
    assert.ok(entry.status);
  }
});

test('Pipeline V4 erzwingt höhere Story-Beat-Dichte, offene Visual-Formen und Asset-Sperre', async () => {
  const policy = JSON.parse(await readFile('config/pipeline.json', 'utf8'));
  assert.equal(policy.pipelineVersion, 4);
  assert.equal(policy.coverPolicy.firstSceneIsCover, false);
  assert.equal(policy.coverPolicy.thumbnailSourceFile, '00-bildprompts/thumbnail.png');
  assert.equal(policy.coverPolicy.coverCandidateCount, 3);
  assert.equal(policy.coverPolicy.userSelectsCover, true);
  assert.equal(policy.coverPolicy.flowMustStopAfterCoverCandidates, true);
  assert.equal(policy.imagePolicy.fixedImageCountForbidden, true);
  assert.deepEqual(policy.imagePolicy.targetAverageHoldSeconds, [2.5, 4.2]);
  assert.equal(policy.imagePolicy.reviewAboveSeconds, 5.5);
  assert.equal(policy.imagePolicy.preferSplitAboveSeconds, 7);
  assert.equal(policy.imagePolicy.hardMaximumSeconds, 9);
  assert.equal(policy.imagePolicy.storyBeatDrivenPlanning, true);
  assert.equal(policy.imagePolicy.visualMustSupportCurrentNarration, true);
  assert.equal(policy.imagePolicy.figuresMustNotBeDefaultFallback, true);
  assert.equal(policy.imagePolicy.detailInsetAllowed, true);
  assert.equal(policy.imagePolicy.cutawaySectionAllowed, true);
  assert.equal(policy.imagePolicy.evidenceReconstructionAllowed, true);
  assert.deepEqual(policy.imagePolicy.shortVideoVisualGuidance?.approximately60Seconds, [18, 26]);
  assert.deepEqual(policy.imagePolicy.shortVideoVisualGuidance?.approximately90Seconds, [24, 34]);
  assert.deepEqual(policy.imagePolicy.shortVideoVisualGuidance?.approximately120Seconds, [32, 44]);
  assert.equal(policy.exportPolicy.captionRequired, true);
  assert.equal(policy.exportPolicy.captionFile, '03-export/CAPTION.txt');
  assert.equal(policy.audioPolicy.playbackRate, 1.05);
  assert.equal(policy.exportPolicy.subtitleRequired, true);
  assert.equal(policy.exportPolicy.subtitleFile, '03-export/SUBTITLES.srt');

  assert.equal(policy.phase3AssetPolicy.existingImagesOnly, true);
  assert.equal(policy.phase3AssetPolicy.imageGenerationForbidden, true);
  assert.equal(policy.phase3AssetPolicy.imageRegenerationForbidden, true);
  assert.equal(policy.phase3AssetPolicy.imageEditingForbidden, true);
  assert.equal(policy.phase3AssetPolicy.imageReplacementForbidden, true);
  assert.equal(policy.phase3AssetPolicy.abortOnMissingImage, true);
  assert.equal(policy.phase3AssetPolicy.abortOnImageMutation, true);
  assert.equal(policy.phase3AssetPolicy.agentMustReportErrorInsteadOfRepairing, true);
});


test('Projekt-Audiowert überschreibt den globalen Playback-Standard', () => {
  const resolved = resolveAudioPolicy(
    { playbackRate: 1.05, outputSampleRateHz: 48000, loudnessTargetLufs: -16 },
    { playbackRate: 1.0, sampleRateHz: 44100 }
  );
  assert.equal(resolved.playbackRate, 1.0);
  assert.equal(resolved.outputSampleRateHz, 44100);
  assert.equal(resolved.loudnessTargetLufs, -16);
});

test('Phase-3-Bildlock erlaubt vorhandene Bilder und erkennt jede spätere Änderung', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'phase3-image-lock-'));
  try {
    const imageDir = path.join(temp, '00-bildprompts', 'images');
    const techDir = path.join(temp, '99-technik');
    await mkdir(imageDir, { recursive: true });
    await mkdir(techDir, { recursive: true });
    await writeFile(path.join(techDir, 'video.json'), JSON.stringify({ plannedImageCount: 2 }));
    await writeFile(path.join(imageDir, 'Bild 01.png'), 'existing-image-one');
    await writeFile(path.join(imageDir, 'Bild 02.png'), 'existing-image-two');

    const lock = await createPhase3ImageLock(temp);
    assert.equal(lock.status, 'LOCKED');
    assert.equal(lock.images.length, 2);
    assert.equal((await verifyPhase3ImageLock(temp)).passed, true);

    await writeFile(path.join(imageDir, 'Bild 02.png'), 'agent-generated-replacement');
    await assert.rejects(() => verifyPhase3ImageLock(temp), /verändert oder ersetzt/i);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('Export erzeugt FINAL_VIDEO, Thumbnail, CAPTION.txt und YouTube-SRT mit echten Zeitcodes', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'youtube-export-v4-'));
  try {
    const imageDir = path.join(temp, '00-bildprompts', 'images');
    const exportDir = path.join(temp, '03-export');
    const techDir = path.join(temp, '99-technik');
    await mkdir(imageDir, { recursive: true });
    await mkdir(exportDir, { recursive: true });
    await mkdir(techDir, { recursive: true });
    await writeFile(path.join(imageDir, 'Bild 01.png'), 'cover-bytes');
    await writeFile(path.join(exportDir, 'FINAL_VIDEO.mp4'), 'video-bytes');
    await writeFile(path.join(techDir, 'video.json'), JSON.stringify({
      title: 'Testtitel',
      topic: 'ein historischer Test',
      coverPolicy: { coverText: 'TEST COVER' },
      youtubeUpload: {
        title: 'Starker YouTube-Titel',
        description: 'Eine vollständige Beschreibung für den Upload.',
        hashtags: ['#Geschichte', '#Test'],
        keywords: ['Geschichte', 'Test']
      }
    }));
    await writeFile(path.join(techDir, 'BILD_AUDIO_ZUORDNUNG.json'), JSON.stringify({
      images: [
        { imageNumber: 1, narrationBeat: 'Erster gesprochener Satz.', actualStartSeconds: 0, actualEndSeconds: 4.25 },
        { imageNumber: 2, narrationBeat: 'Danach folgt der zweite Satz.', actualStartSeconds: 4.25, actualEndSeconds: 8.7 }
      ]
    }));

    const report = await finalizeYoutubeExport(temp);
    assert.equal(report.captionFile, '03-export/CAPTION.txt');
    assert.equal(report.subtitleFile, '03-export/SUBTITLES.srt');
    assert.equal(report.subtitleCueCount, 2);
    assert.equal(report.thumbnailIdenticalToCover, true);
    const caption = await readFile(path.join(exportDir, 'CAPTION.txt'), 'utf8');
    assert.match(caption, /TITLE:\nStarker YouTube-Titel/);
    assert.match(caption, /DESCRIPTION:\nEine vollständige Beschreibung/);
    assert.match(caption, /#Geschichte #Test/);
    assert.match(caption, /DESCRIPTION:\nEine vollständige Beschreibung für den Upload\.\n\n#Geschichte #Test/);
    assert.doesNotMatch(caption, /KEYWORDS|THUMBNAIL_TEXT|HASHTAGS:/);
    assert.equal(caption.match(/#Geschichte/g)?.length, 1);
    const subtitles = await readFile(path.join(exportDir, 'SUBTITLES.srt'), 'utf8');
    assert.match(subtitles, /00:00:00,000 --> 00:00:04,250/);
    assert.match(subtitles, /Erster gesprochener Satz\./);
    assert.match(subtitles, /00:00:04,250 --> 00:00:08,700/);
    assert.match(subtitles, /Danach folgt der zweite Satz\./);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('Caption enthält Hashtags genau einmal und keine internen Schlüsselwörter oder Coverangaben', () => {
  const text = buildCaption({
    title: 'Historisches Ereignis',
    coverPolicy: { coverText: 'COVER METADATEN' },
    youtubeUpload: {
      description: 'Konkrete Beschreibung.\n\n#Geschichte',
      hashtags: ['#Geschichte', '#London'],
      keywords: ['internes Keyword']
    }
  });
  assert.match(text, /TITLE:\nHistorisches Ereignis/);
  assert.match(text, /#Geschichte\n\n#London/);
  assert.equal(text.match(/#Geschichte/g)?.length, 1);
  assert.doesNotMatch(text, /KEYWORDS|THUMBNAIL_TEXT|HASHTAGS:|COVER METADATEN|internes Keyword/);
});

test('Projekt-Template nutzt Pipeline V4, Upload-Metadaten und neue Bilddichte', async () => {
  const meta = JSON.parse(await readFile('youtube/templates/video-template/99-technik/video.json', 'utf8'));
  const mapping = JSON.parse(await readFile('youtube/templates/video-template/99-technik/BILD_AUDIO_ZUORDNUNG.json', 'utf8'));
  const worldLock = JSON.parse(await readFile('youtube/templates/video-template/99-technik/FLOW_WORLD_LOCK.json', 'utf8'));
  const wholeVideoQc = JSON.parse(await readFile('youtube/templates/video-template/99-technik/WHOLE_VIDEO_QC.json', 'utf8'));
  const prompt = await readFile('youtube/templates/video-template/00-bildprompts/google-flow-prompt.txt', 'utf8');

  assert.equal(meta.schemaVersion, 3);
  assert.equal(meta.pipelineVersion, 4);
  assert.equal(meta.visualStyleId, 'UNSET');
  assert.equal(meta.coverPolicy.firstSceneIsCover, false);
  assert.equal(mapping.images[0].visibleTextPolicy, 'NO_VISIBLE_TEXT');
  assert.equal(meta.promptSystemVersion, 3);
  assert.equal(meta.promptSystem, 'flow-compiler-v3');
  assert.equal(meta.wholeVideoCoherenceGateVersion, 1);
  assert.deepEqual(meta.imageDensityPolicy.targetAverageHoldSeconds, [2.5, 4.2]);
  assert.equal(meta.imageDensityPolicy.figuresMustNotBeDefaultFallback, true);
  assert.ok(Object.hasOwn(meta, 'youtubeUpload'));
  assert.equal(meta.youtubeUpload.title, '');
  assert.equal(meta.youtubeUpload.description, '');
  assert.equal(meta.audioPolicy.playbackRate, 1.05);
  assert.equal(mapping.schemaVersion, 2);
  assert.ok(Object.hasOwn(mapping.images[0], 'viewerTakeaway'));
  assert.ok(Object.hasOwn(mapping.images[0], 'visualConcept'));
  assert.ok(Object.hasOwn(mapping.images[0], 'editorialText'));
  assert.ok(Object.hasOwn(mapping.images[0], 'explanationOnly'));
  assert.equal(worldLock.status, 'PLANNED');
  assert.equal(wholeVideoQc.status, 'PLANNED');
  assert.match(prompt, /PROMPT_SYSTEM:\s*flow-compiler-v3/i);
  assert.match(prompt, /STATUS:\s*NOT_BUILT/i);
});

test('Dokumentation verlangt Script V4, Narration-first Visuals und Whole-Video-Kohärenz', async () => {
  const script = await readFile('channel/03-SCRIPT-BIBLE.md', 'utf8');
  const visualSystem = await readFile('channel/06-VISUAL-SYSTEM.md', 'utf8');
  const grammar = await readFile('channel/07-VISUAL-GRAMMAR.md', 'utf8');
  const style = await readFile('channel/10-STYLE-DNA-V2.md', 'utf8');
  const coherence = await readFile('channel/17-WHOLE-VIDEO-COHERENCE-GATE.md', 'utf8');

  assert.match(script, /Geschichts-Kanal V4/i);
  assert.match(script, /Script-first ist Pflicht/i);
  assert.match(script, /Fließtext statt Stakkato/i);
  assert.match(script, /Read-aloud Gate/i);
  assert.match(visualSystem, /Narration-first Visual Selection/i);
  assert.match(visualSystem, /18–26 Visuals/i);
  assert.match(visualSystem, /Generische identische Figuren-Klone sind verboten/i);
  assert.match(grammar, /bestes visuelles Mittel/i);
  assert.match(grammar, /Detail Inset/i);
  assert.match(grammar, /Cutaway Section/i);
  assert.match(grammar, /Evidence Reconstruction/i);
  assert.match(style, /keine generischen Stickman-Klone/i);
  assert.match(style, /Gleicher Illustrator bedeutet nicht gleiche Aufnahme und nicht gleiche Person/i);
  assert.match(coherence, /explanationOnlyVisualShare/i);
  assert.match(coherence, /EDITORIAL_TEXT/i);
});

test('Risikowortprüfung erkennt ganze Begriffe statt Teilstrings', async () => {
  const styleLock = JSON.parse(await readFile('config/flow-style-lock.json', 'utf8'));
  const neutralScene = {
    viewerTakeaway: 'Explain the defense clearly.',
    visualPurpose: 'Show a temporary camp.',
    topicAnchor: 'Roman camp',
    visualForm: 'architecture-city',
    visualConcept: 'Depict a low earthen rampart without exaggeration.',
    dominantSubject: 'temporary camp',
    actionState: 'the camp is occupied',
    composition: 'the camp fills the frame',
    camera: 'wide elevated view',
    depthPlan: 'foreground earth, midground camp, background hills',
    lightingMood: 'muted evening light',
    continuityNote: 'keep the same layout',
    historicalAccuracyNote: 'depict temporary earth defenses only'
  };
  assert.deepEqual(findHighRiskPromptWords(neutralScene, styleLock), []);
  assert.deepEqual(findHighRiskPromptWords({ ...neutralScene, visualConcept: 'Make it epic.' }, styleLock), ['epic']);
});

test('Marschlager-Legacy-Testprojekt besteht weiterhin Phase 1', async () => {
  const dir = 'youtube/2026-KW40_28-09_bis_04-10/test-roemisches-marschlager-v3';
  const result = await validatePhase1(dir);
  assert.equal(result.passed, true, result.errors.join('\n'));
  const prompt = await readFile(path.join(dir, '00-bildprompts', 'google-flow-prompt.txt'), 'utf8');
  const mapping = JSON.parse(await readFile(path.join(dir, '99-technik', 'BILD_AUDIO_ZUORDNUNG.json'), 'utf8'));
  assert.equal(mapping.images.length, 11);
  assert.match(prompt, /PROMPT_SYSTEM:\s*flow-compiler-v3/i);
  assert.match(prompt, /BILD 11/i);
});

test('Textnormalisierung und Ähnlichkeit funktionieren', () => {
  assert.equal(normalizeText('Über Größe!'), 'uber grosse');
  assert.ok(similarity('Warum gibt es Grenzen?', 'Wieso gibt es Grenzen?') > 0.5);
});

test('Themeneditor arbeitet nur mit Daten des aktuellen Repositories', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'history-youtube-pipeline-'));
  try {
    await mkdir(path.join(temp, 'config'), { recursive: true });
    await mkdir(path.join(temp, 'youtube'), { recursive: true });
    await writeFile(path.join(temp, 'config', 'topic-registry.json'), JSON.stringify({ version: 1, entries: [] }));
    const result = await evaluateTopic('Völlig neues Testthema 987654321', temp);
    assert.equal(result.decision, 'APPROVED_NEW');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('Keine fremde Alt-Bildwelt wurde in die zentrale Konfiguration übernommen', async () => {
  const files = [
    'README.md',
    'config/pipeline.json',
    'config/visual-policy.json',
    'config/flow-style-lock.json',
    'config/topic-registry.json',
    'youtube/WORKFLOW.md',
    'youtube/templates/video-template/00-bildprompts/google-flow-prompt.txt'
  ];
  const text = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n').toLowerCase();
  const forbidden = [
    'serious-minimal-countryball',
    'nationalismus',
    'liberalismus',
    'konservatismus',
    'anarchismus',
    'kaliningrad',
    'zwei koreas'
  ];
  for (const value of forbidden) assert.equal(text.includes(value), false, `Altspur gefunden: ${value}`);
});
