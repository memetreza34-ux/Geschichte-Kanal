#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, projectPaths, readJson } from '../lib/pipeline.js';
import { findHighRiskPromptWords } from '../lib/flow-prompt.js';
import { matchesSceneStyleAnchor } from '../lib/figure-direction.js';
import { validateVisualInterestScene, validateVisualInterestSequence } from '../lib/visual-interest.js';
import { validateWholeVideoQc } from '../lib/whole-video-quality.js';
import { validatePreproduction } from './validate-youtube-preproduction.js';
import { validateYoutubeUpload } from '../lib/upload-metadata.js';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function imageMarkerRegex(imageNumber) {
  const padded = String(imageNumber).padStart(2, '0');
  return new RegExp(`BILD\\s+0*${Number(padded)}(?:\\s|$)`, 'i');
}

function extractImagePrompt(prompt, imageNumber, totalImages) {
  const current = imageMarkerRegex(imageNumber);
  const match = current.exec(prompt);
  if (!match) return '';
  const start = match.index + match[0].length;
  const remaining = prompt.slice(start);
  const boundaries = [];

  if (imageNumber < totalImages) {
    const nextMatch = imageMarkerRegex(imageNumber + 1).exec(remaining);
    if (nextMatch) boundaries.push(nextMatch.index);
  }

  const sectionMatch = /\n(?:GLOBAL(?:\s+NEGATIVE\s+STYLE)?\s+RULES?|GLOBAL\s+COMPOSITION\s+RULES?|TEXT\s+RULE|VISUAL-FORM\s+FIDELITY|PROMPT\s+QUALITY|GENERATION\s+WORKFLOW)\s*[:—-]/i.exec(remaining);
  if (sectionMatch) boundaries.push(sectionMatch.index);

  const end = boundaries.length ? Math.min(...boundaries) : remaining.length;
  return remaining.slice(0, end).trim();
}

function hasCompositionLanguage(text) {
  return /(foreground|midground|middle ground|background|wide view|medium-wide|medium shot|close view|close-up|low angle|high angle|elevated angle|over-the-shoulder|from behind|in frame|compose|composition|perspective|negative space|leading line|left side|right side|centered|off-center|organize depth)/i.test(text);
}

function hasComparisonLanguage(text) {
  return /(both|two sides|two opposing|opposite|contrast|compared|versus|vs\.?|on one side|on the other side|while|whereas|left side|right side|comparison poles|before[- ]after|before and after|months apart)/i.test(text);
}

function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function containsPlaceholderString(value) {
  return typeof value === 'string' && /\[[^\]]+\]|TODO|TBD|PLACEHOLDER|UNSET/i.test(value);
}

function objectContainsPlaceholder(value) {
  if (typeof value === 'string') return containsPlaceholderString(value);
  if (Array.isArray(value)) return value.some((item) => objectContainsPlaceholder(item));
  if (value && typeof value === 'object') return Object.values(value).some((item) => objectContainsPlaceholder(item));
  return false;
}

export async function validatePhase1(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const errors = [];

  for (const required of [p.meta, p.mapping, p.prompt, p.script, p.renderPlan]) {
    if (!(await exists(required))) errors.push(`Pflichtdatei fehlt: ${path.relative(p.projectDir, required)}`);
  }
  if (errors.length) return { passed: false, errors };

  const [meta, mapping, visual, pipeline, prompt, script] = await Promise.all([
    readJson(p.meta),
    readJson(p.mapping),
    readJson(path.resolve('config/visual-policy.json')),
    readJson(path.resolve('config/pipeline.json')),
    readFile(p.prompt, 'utf8'),
    readFile(p.script, 'utf8')
  ]);

  if (Number(meta.preproductionQualityGateVersion ?? 0) >= 1) {
    const preproduction = await validatePreproduction(projectDirectory);
    errors.push(...preproduction.errors.map((error) => `Preproduction: ${error}`));
  }

  if (Number(meta.wholeVideoCoherenceGateVersion ?? 0) >= 1) {
    if (!(await exists(p.wholeVideoQc))) {
      errors.push('Whole-Video-Coherence-Gate benötigt 99-technik/WHOLE_VIDEO_QC.json.');
    } else {
      const wholeVideoQc = await readJson(p.wholeVideoQc);
      const wholeVideoResult = validateWholeVideoQc(wholeVideoQc, visual);
      errors.push(...wholeVideoResult.errors.map((error) => `Whole Video: ${error}`));
    }
  }

  if (Number(meta.youtubeUpload?.captionPolicyVersion ?? 0) >= 2) {
    const channel = await readJson(path.resolve('config/channel-policy.json'));
    errors.push(...validateYoutubeUpload(meta, channel).errors);
  }

  const compilerV3 = Number(meta.promptSystemVersion) >= 3 || meta.promptSystem === 'flow-compiler-v3';
  const pipelineV4 = Number(meta.pipelineVersion) >= 4;
  const visualInterestGate = Number(meta.visualInterestGateVersion) >= 1;
  const interestPolicy = visual.visualInterestGate ?? {};
  const textUsagePolicy = visual.textUsagePolicy ?? {};
  let styleLock = null;
  let worldLock = null;

  if (compilerV3) {
    const styleLockPath = path.resolve(meta.flowStyleLockFile || 'config/flow-style-lock.json');
    if (!(await exists(styleLockPath))) errors.push('Flow Compiler V3 benötigt config/flow-style-lock.json.');
    else styleLock = await readJson(styleLockPath);

    if (!(await exists(p.flowWorldLock))) errors.push('Flow Compiler V3 benötigt 99-technik/FLOW_WORLD_LOCK.json.');
    else worldLock = await readJson(p.flowWorldLock);
  }

  if (visual.status !== 'READY') errors.push('config/visual-policy.json ist noch nicht READY. Neue Bildwelt zuerst definieren.');
  if (!visual.styleId || visual.styleId === 'UNSET') errors.push('visual-policy.styleId ist UNSET.');
  if (meta.visualStyleId !== visual.styleId) errors.push('video.json.visualStyleId entspricht nicht der aktiven neuen Bildwelt.');
  if (!meta.title || !meta.topic || !meta.topicSlug) errors.push('Titel, Thema oder Slug fehlen in video.json.');
  if (!Number.isInteger(meta.plannedImageCount) || meta.plannedImageCount < 1) errors.push('plannedImageCount muss in Phase 1 auf eine inhaltsgetriebene Bildzahl gesetzt werden.');
  if (!Number.isFinite(Number(meta.targetDurationSeconds)) || Number(meta.targetDurationSeconds) <= 0) errors.push('targetDurationSeconds fehlt.');
  if (meta.imageDensityPolicy?.fixedImageCountForbidden !== true) errors.push('Adaptive Bilddichte muss aktiv sein.');

  if (pipelineV4) {
    if (!nonEmpty(meta.youtubeUpload?.title)) errors.push('Pipeline V4 benötigt youtubeUpload.title für CAPTION.txt.');
    if (!nonEmpty(meta.youtubeUpload?.description)) errors.push('Pipeline V4 benötigt youtubeUpload.description für CAPTION.txt.');
    if (meta.imageDensityPolicy?.visualMustSupportCurrentNarration !== true) errors.push('Pipeline V4 benötigt narration-first Visual Planning: visualMustSupportCurrentNarration=true.');
    if (meta.imageDensityPolicy?.figuresMustNotBeDefaultFallback !== true) errors.push('Pipeline V4 verlangt: Figuren dürfen kein automatischer Visual-Fallback sein.');
  }

  if (visualInterestGate) {
    if (meta.phase2VisualQcRequired !== true) errors.push('Visual-Interest-Gate benötigt phase2VisualQcRequired=true.');
    if (Number(interestPolicy.version ?? 0) < 1) errors.push('config/visual-policy.json enthält kein aktives Visual-Interest-Gate.');
  }

  const coverText = String(meta.coverPolicy?.coverText ?? '').trim();
  if (meta.coverPolicy?.firstSceneIsCover === false && !prompt.includes('STAGE 1 — SEPARATE THUMBNAIL ONLY')) errors.push('Der separate Thumbnail-Workflow fehlt im generierten Flow-Prompt.');
  if (!coverText) errors.push('coverPolicy.coverText fehlt.');
  else {
    const [minWords, maxWords] = Array.isArray(visual.coverTextWordRange) ? visual.coverTextWordRange : [2, 5];
    const words = wordCount(coverText);
    if (words < minWords || words > maxWords) errors.push(`Cover-Text muss ${minWords}–${maxWords} Wörter haben; aktuell ${words}.`);
  }

  const hold = Number(meta.renderPolicy?.endHoldSeconds);
  const minHold = Number(pipeline.endHoldPolicy?.minimumSeconds ?? 1.2);
  const maxHold = Number(pipeline.endHoldPolicy?.maximumSeconds ?? 1.5);
  if (!Number.isFinite(hold) || hold < minHold || hold > maxHold) errors.push(`endHoldSeconds muss zwischen ${minHold} und ${maxHold} liegen.`);

  const cleanScript = script.trim();
  if (!cleanScript || /VOICE-OVER-SKRIPT HIER EINFÜGEN/i.test(cleanScript)) errors.push('Voice-over-Skript ist noch Platzhalter.');
  if (!prompt.includes(`ACTIVE_STYLE_ID: ${visual.styleId}`)) errors.push('Flow-Prompt nennt nicht die aktive styleId.');
  if (/ACTIVE_STYLE_ID:\s*UNSET/i.test(prompt)) errors.push('Flow-Prompt enthält noch UNSET.');
  if (/\[[^\]]+\]/.test(prompt)) errors.push('Flow-Prompt enthält noch Platzhalter in eckigen Klammern.');

  if (compilerV3) {
    if (meta.promptSystem !== 'flow-compiler-v3') errors.push('video.json.promptSystem muss flow-compiler-v3 sein.');
    if (!meta.flowPromptBuiltAt) errors.push('Flow Compiler V3 wurde noch nicht ausgeführt: flowPromptBuiltAt fehlt.');
    if (!prompt.includes('PROMPT_SYSTEM: flow-compiler-v3')) errors.push('Finaler Flow-Prompt wurde nicht mit flow-compiler-v3 gebaut.');
    if (!/CHANNEL STYLE\s+—\s+IMMUTABLE:/i.test(prompt)) errors.push('Finaler Flow-Prompt enthält keinen unveränderlichen CHANNEL STYLE Lock.');
    if (!/VIDEO WORLD LOCK\s+—\s+IMMUTABLE WITHIN THIS VIDEO:/i.test(prompt)) errors.push('Finaler Flow-Prompt enthält keinen unveränderlichen VIDEO WORLD LOCK.');
    if (visualInterestGate && !/VISUAL INTEREST RULE\s+—\s+HARD:/i.test(prompt)) errors.push('Finaler Flow-Prompt enthält keine harte Visual-Interest-Regel.');
    if (visualInterestGate && !/INTERNAL METADATA RULE\s+—\s+HARD:/i.test(prompt)) errors.push('Finaler Flow-Prompt enthält keine harte interne-Metadaten-Sperre.');

    if (styleLock) {
      if (styleLock.status !== 'READY') errors.push('config/flow-style-lock.json ist nicht READY.');
      if (styleLock.styleId !== visual.styleId || styleLock.styleId !== meta.visualStyleId) errors.push('Style-ID stimmt zwischen visual-policy, video.json und flow-style-lock nicht überein.');
      if (!nonEmpty(styleLock.masterStylePrompt) || !nonEmpty(styleLock.sceneStyleAnchor)) errors.push('flow-style-lock ist unvollständig.');
    }

    if (worldLock) {
      if (worldLock.status !== 'READY') errors.push('FLOW_WORLD_LOCK.json muss vor Phase 1 auf READY gesetzt werden.');
      if (!nonEmpty(worldLock.settingName) || !nonEmpty(worldLock.settingDescription)) errors.push('FLOW_WORLD_LOCK.json braucht settingName und settingDescription.');
      if (objectContainsPlaceholder(worldLock)) errors.push('FLOW_WORLD_LOCK.json enthält noch Platzhalter.');
    }
  }

  const images = Array.isArray(mapping.images) ? mapping.images : [];
  if (Number.isInteger(meta.plannedImageCount) && images.length !== meta.plannedImageCount) {
    errors.push(`Mapping enthält ${images.length} Bilder, erwartet ${meta.plannedImageCount}.`);
  }
  if (images.length && mapping.videoLastImageNumber !== images.length) errors.push('videoLastImageNumber entspricht nicht der Mapping-Länge.');

  const sceneCardV2 = Number(mapping.schemaVersion) >= 2;
  const requiredSceneFields = Array.isArray(visual.requiredScenePlanningFields) ? visual.requiredScenePlanningFields : [];
  const supportedVisualForms = new Set(Array.isArray(visual.supportedVisualForms) ? visual.supportedVisualForms : []);
  const maxSupporting = Number(visual.maxSupportingElementsPerImage ?? 3);
  const minimumPromptQc = Number(visual.promptQcMinimumScore ?? 8);

  if (visual.visualDirectorRequired === true && !sceneCardV2) {
    errors.push('Bildplanung verwendet noch Schema V1. Neue Produktionen müssen Scene Card V2 verwenden.');
  }

  let lastAnchorIndex = -1;
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const expected = index + 1;
    if (Number(image.imageNumber) !== expected) errors.push(`Bildnummern müssen lückenlos sein: erwartet ${expected}.`);
    if (image.imageFile !== `Bild ${String(expected).padStart(2, '0')}.png`) errors.push(`Falscher Dateiname bei Bild ${expected}.`);
    if (!image.startAnchor || String(image.startAnchor).startsWith('[')) errors.push(`Startanker fehlt/ist Platzhalter bei Bild ${expected}.`);
    if (!image.visualPurpose) errors.push(`visualPurpose fehlt bei Bild ${expected}.`);
    if (!image.topicAnchor) errors.push(`topicAnchor fehlt bei Bild ${expected}.`);
    if (!image.visualForm) errors.push(`visualForm fehlt bei Bild ${expected}.`);
    if (!Number.isFinite(Number(image.plannedHoldSeconds))) errors.push(`plannedHoldSeconds fehlt bei Bild ${expected}.`);

    if (image.visualForm && supportedVisualForms.size && !supportedVisualForms.has(image.visualForm)) {
      errors.push(`Nicht unterstützte visualForm bei Bild ${expected}: ${image.visualForm}.`);
    }

    if (visualInterestGate) {
      errors.push(...validateVisualInterestScene(image, {
        imageNumber: expected,
        isCover: expected === 1 && meta.coverPolicy?.firstSceneIsCover !== false,
        policy: interestPolicy,
        textUsagePolicy,
        hardMaximumSeconds: meta.imageDensityPolicy?.hardMaximumSeconds
      }));
    }

    if (sceneCardV2) {
      for (const field of requiredSceneFields) {
        if (field === 'supportingElements') {
          if (!Array.isArray(image.supportingElements)) errors.push(`supportingElements muss ein Array sein bei Bild ${expected}.`);
          continue;
        }
        if (field === 'promptQcScore') {
          const score = Number(image.promptQcScore);
          if (!Number.isFinite(score)) errors.push(`promptQcScore fehlt bei Bild ${expected}.`);
          else if (score < minimumPromptQc || score > 10) errors.push(`promptQcScore bei Bild ${expected} muss zwischen ${minimumPromptQc} und 10 liegen.`);
          continue;
        }
        if (!nonEmpty(image[field])) errors.push(`${field} fehlt bei Bild ${expected}.`);
      }

      if (Array.isArray(image.supportingElements) && image.supportingElements.length > maxSupporting) {
        errors.push(`Bild ${expected} hat ${image.supportingElements.length} Supporting Elements; erlaubt sind maximal ${maxSupporting}.`);
      }

      if (compilerV3 && styleLock) {
        const riskyWords = findHighRiskPromptWords(image, styleLock);
        if (riskyWords.length) errors.push(`Bild ${expected} enthält Style-Drift-Risikowörter in der Scene Card: ${riskyWords.join(', ')}.`);
      }

      const block = extractImagePrompt(prompt, expected, images.length);
      if (!block) {
        errors.push(`Finaler Promptblock für BILD ${String(expected).padStart(2, '0')} fehlt.`);
      } else {
        const minimumLength = compilerV3 ? 300 : 140;
        if (block.length < minimumLength) errors.push(`Prompt für Bild ${expected} ist zu knapp für das aktive Prompt-System.`);
        if (!hasCompositionLanguage(block)) errors.push(`Prompt für Bild ${expected} enthält keine konkrete Kamera-/Kompositionssprache.`);
        if (image.visualForm === 'comparison' && !hasComparisonLanguage(block)) {
          errors.push(`Comparison bei Bild ${expected} wird im finalen Prompt nicht klar als Vergleich inszeniert.`);
        }
        if (compilerV3 && styleLock?.sceneStyleAnchor) {
          if (!matchesSceneStyleAnchor(block, styleLock, meta)) errors.push(`Bild ${expected} wiederholt den kompakten Style Anchor nicht.`);
        }
        if (expected === 1 && meta.coverPolicy?.firstSceneIsCover !== false && coverText && !block.includes(`"${coverText}"`)) errors.push('BILD 01 enthält den exakten Cover-Text nicht im Prompt.');
        if ((expected > 1 || meta.coverPolicy?.firstSceneIsCover === false) && !/No visible text|ZERO visible text|TEXT SAFETY/i.test(block)) errors.push(`Bild ${expected} enthält keine explizite Text-Sicherheitsregel.`);
        if (visualInterestGate && expected === 1 && meta.coverPolicy?.firstSceneIsCover !== false && !/only visible text allowed/i.test(block)) errors.push('BILD 01 enthält keine harte Only-Cover-Text-Regel.');
        if (visualInterestGate && (expected > 1 || meta.coverPolicy?.firstSceneIsCover === false) && !/metadata only.*NEVER|metadata only and must NEVER|ZERO visible text/i.test(block)) {
          errors.push(`Bild ${expected} enthält keine harte Sperre gegen sichtbare interne Bildnummern/Metadaten.`);
        }
        if ((expected > 1 || meta.coverPolicy?.firstSceneIsCover === false) && image.visibleTextPolicy === 'EDITORIAL_TEXT' && !block.includes(`"${String(image.editorialText ?? '').trim()}"`)) {
          errors.push(`Bild ${expected}: der finale Prompt enthält den exakt freigegebenen editorialText nicht.`);
        }
      }
    }

    if (image.startAnchor && !String(image.startAnchor).startsWith('[')) {
      const at = cleanScript.indexOf(image.startAnchor);
      if (at < 0) errors.push(`Startanker von Bild ${expected} kommt nicht exakt im Skript vor.`);
      else if (at <= lastAnchorIndex) errors.push(`Startanker von Bild ${expected} ist nicht monoton.`);
      else lastAnchorIndex = at;
    }

    if (!imageMarkerRegex(expected).test(prompt)) errors.push(`BILD ${String(expected).padStart(2, '0')} fehlt im Flow-Prompt.`);
  }

  if (visualInterestGate) {
    errors.push(...validateVisualInterestSequence(images, interestPolicy));
  }

  return { passed: errors.length === 0, errors };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-phase1 -- --dir "youtube/<week>/<slug>"');
  const result = await validatePhase1(dir);
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Phase-1-Regel(n) verletzt.`);
  }
  console.log('YouTube Phase 1: BESTANDEN');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`YouTube Phase 1: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
