#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { arg, discoverAudioFiles, exists, listFinalImages, projectPaths, readJson, sha256 } from '../lib/pipeline.js';
import { inspectPng } from '../lib/image-integrity.js';

function validScore(value, minimum) {
  const score = Number(value);
  return Number.isFinite(score) && score >= minimum && score <= 10;
}

async function validateVisualQc(qc, meta, images, mapping) {
  const errors = [];
  const count = images.length;
  if (!qc || typeof qc !== 'object') return ['PHASE2_VISUAL_QC.json ist ungültig.'];
  if (qc.status !== 'APPROVED') errors.push('PHASE2_VISUAL_QC.json muss status=APPROVED haben.');
  if (!qc.reviewMethod || qc.reviewMethod === 'UNREVIEWED') errors.push('PHASE2_VISUAL_QC.json braucht eine echte human-or-vision Review-Methode.');
  if (Number(meta.phase2VisualQcHashVersion ?? 0) >= 1) {
    if (Number(qc.schemaVersion) < 2) errors.push('Hash-gebundenes Visual-QC benötigt PHASE2_VISUAL_QC.schemaVersion >= 2.');
    if (String(qc.hashAlgorithm ?? '').toLowerCase() !== 'sha256') errors.push('PHASE2_VISUAL_QC.hashAlgorithm muss sha256 sein.');
  }

  const minimumNarration = Number(qc.minimumNarrationSupportScore ?? 8);
  const minimumInterest = Number(qc.minimumVisualInterestScore ?? 8);
  const minimumStyle = Number(qc.minimumStyleConsistencyScore ?? 8);
  const entries = Array.isArray(qc.images) ? qc.images : [];
  const plannedScenes = Array.isArray(mapping?.images) ? mapping.images : [];

  if (entries.length !== count) errors.push(`Visual-QC enthält ${entries.length} Bilder, erwartet ${count}.`);

  const coverText = String(meta.coverPolicy?.coverText ?? '').trim();
  for (let i = 1; i <= count; i += 1) {
    const entry = entries.find((item) => Number(item.imageNumber) === i);
    const image = images.find((item) => Number(item.number) === i);
    const scene = plannedScenes.find((item) => Number(item.imageNumber) === i);
    if (!entry) {
      errors.push(`Visual-QC-Eintrag fehlt für Bild ${i}.`);
      continue;
    }
    if (!image) {
      errors.push(`Bild ${i} fehlt für die Visual-QC-Hashprüfung.`);
      continue;
    }

    if (entry.approved !== true) errors.push(`Bild ${i} ist im Visual-QC nicht freigegeben.`);
    if (!validScore(entry.narrationSupportScore, minimumNarration)) errors.push(`Bild ${i}: narrationSupportScore muss mindestens ${minimumNarration}/10 sein.`);
    if (!validScore(entry.visualInterestScore, minimumInterest)) errors.push(`Bild ${i}: visualInterestScore muss mindestens ${minimumInterest}/10 sein.`);
    if (!validScore(entry.styleConsistencyScore, minimumStyle)) errors.push(`Bild ${i}: styleConsistencyScore muss mindestens ${minimumStyle}/10 sein.`);
    if (entry.weirdnessDetected !== false) errors.push(`Bild ${i}: unbeabsichtigte Weirdness muss explizit false sein.`);
    if (entry.imageNumberVisible !== false) errors.push(`Bild ${i}: sichtbare Bildnummer/interne ID erkannt oder nicht ausgeschlossen.`);
    if (entry.unexpectedTextDetected !== false) errors.push(`Bild ${i}: unerwarteter sichtbarer Text erkannt oder nicht ausgeschlossen.`);
    if (entry.pseudoTextDetected !== false) errors.push(`Bild ${i}: Pseudo-Schrift erkannt oder nicht ausgeschlossen.`);

    if (Number(meta.phase2VisualQcHashVersion ?? 0) >= 1) {
      const expectedName = `Bild ${String(i).padStart(2, '0')}.png`;
      if (entry.fileName !== expectedName) errors.push(`Bild ${i}: Visual-QC.fileName muss ${expectedName} sein.`);
      if (!/^[a-f0-9]{64}$/i.test(String(entry.sha256 ?? ''))) {
        errors.push(`Bild ${i}: gültiger SHA-256 fehlt im Visual-QC.`);
      } else {
        const currentHash = await sha256(image.path);
        if (String(entry.sha256).toLowerCase() !== currentHash.toLowerCase()) errors.push(`Bild ${i}: Datei wurde nach der Visual-QC-Prüfung verändert oder ersetzt (SHA-256 stimmt nicht).`);
      }
    }

    if (i === 1) {
      if (entry.visibleTextDetected !== true) errors.push('Bild 1: Cover-Text muss als sichtbarer Text erkannt und geprüft sein.');
      if (String(entry.visibleTextExact ?? '').trim() !== coverText) errors.push('Bild 1: visibleTextExact entspricht nicht exakt dem Cover-Text.');
    } else {
      const textPolicy = String(scene?.visibleTextPolicy ?? 'NO_VISIBLE_TEXT');
      if (textPolicy === 'EDITORIAL_TEXT') {
        const expectedText = String(scene?.editorialText ?? '').trim();
        if (entry.visibleTextDetected !== true) errors.push(`Bild ${i}: freigegebener Redaktionstext muss als sichtbar erkannt und geprüft sein.`);
        if (String(entry.visibleTextExact ?? '').trim() !== expectedText) errors.push(`Bild ${i}: visibleTextExact entspricht nicht exakt dem freigegebenen editorialText.`);
      } else {
        if (entry.visibleTextDetected !== false) errors.push(`Bild ${i}: Scene Card verlangt NO_VISIBLE_TEXT, visibleTextDetected muss false sein.`);
        if (String(entry.visibleTextExact ?? '').trim()) errors.push(`Bild ${i}: visibleTextExact muss bei NO_VISIBLE_TEXT leer sein.`);
      }
    }
  }

  return errors;
}

export async function validatePhase2(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const errors = [];
  if (!(await exists(p.meta))) return { passed: false, errors: ['video.json fehlt.'] };
  const meta = await readJson(p.meta);
  const mapping = await readJson(p.mapping, { images: [] });
  const count = Number(meta.plannedImageCount);
  if (!Number.isInteger(count) || count < 1) errors.push('plannedImageCount ist ungültig.');

  const images = await listFinalImages(p.imagesDir);
  if (Number.isInteger(count) && images.length !== count) errors.push(`Finale Bildzahl: ${images.length}, erwartet ${count}.`);
  if (Number.isInteger(count)) {
    for (let i = 1; i <= count; i += 1) {
      const expected = `Bild ${String(i).padStart(2, '0')}.png`;
      if (!images.some((item) => item.name === expected)) errors.push(`Bild fehlt: ${expected}`);
    }
  }

  if (Number(meta.imageIntegrityGateVersion ?? 0) >= 1) {
    for (const image of images) {
      const result = await inspectPng(image.path);
      errors.push(...result.errors.map((message) => image.name + ': ' + message));
    }
  }

  if (await exists(p.imagesDir)) {
    const entries = await readdir(p.imagesDir, { withFileTypes: true });
    const extras = entries.filter((entry) => entry.isFile() && entry.name !== '.gitkeep' && !/^Bild \d{2,3}\.png$/i.test(entry.name));
    if (extras.length) errors.push(`Unerlaubte Zusatzdateien im finalen Bilderordner: ${extras.map((x) => x.name).join(', ')}`);
    const dirs = entries.filter((entry) => entry.isDirectory());
    if (dirs.length) errors.push('Der finale Bilderordner muss flach sein; Unterordner sind nicht erlaubt.');
  }

  if (meta.phase2VisualQcRequired === true || Number(meta.visualInterestGateVersion) >= 1) {
    if (!(await exists(p.phase2VisualQc))) {
      errors.push('Neue Produktion benötigt 99-technik/PHASE2_VISUAL_QC.json vor Phase 3.');
    } else if (Number.isInteger(count) && count > 0) {
      const qc = await readJson(p.phase2VisualQc);
      errors.push(...await validateVisualQc(qc, meta, images, mapping));
    }
  }

  const audio = await discoverAudioFiles(p.audioDir);
  if (audio.length !== 1) errors.push(`Unter 02-audio wird genau eine finale Voice-over-Datei erwartet; gefunden: ${audio.length}.`);

  return { passed: errors.length === 0, errors, images, audio };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run validate:youtube-phase2 -- --dir "youtube/<week>/<slug>"');
  const result = await validatePhase2(dir);
  if (!result.passed) {
    for (const error of result.errors) console.error(`- ${error}`);
    throw new Error(`${result.errors.length} Phase-2-Regel(n) verletzt.`);
  }
  console.log('YouTube Phase 2: BESTANDEN');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`YouTube Phase 2: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
