#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, fileSize, listFinalImages, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';
import { inspectPng } from '../lib/image-integrity.js';

async function snapshotImages(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const meta = await readJson(p.meta);
  const planned = Number(meta.plannedImageCount);

  if (!Number.isInteger(planned) || planned < 1) {
    throw new Error('plannedImageCount ist ungültig. Phase 3 darf ohne vollständigen Bildplan nicht starten.');
  }
  if (!(await exists(p.imagesDir))) {
    throw new Error('Finaler Bilderordner fehlt. Phase 3 erzeugt keine Bilder selbst.');
  }

  const entries = await readdir(p.imagesDir, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());
  if (dirs.length) throw new Error('Unterordner im finalen Bilderordner sind in Phase 3 nicht erlaubt.');

  const unexpected = entries
    .filter((entry) => entry.isFile() && entry.name !== '.gitkeep' && !/^Bild \d{2,3}\.png$/i.test(entry.name))
    .map((entry) => entry.name);
  if (unexpected.length) throw new Error(`Unerlaubte Dateien im Bilderordner: ${unexpected.join(', ')}`);

  const images = await listFinalImages(p.imagesDir);
  if (images.length !== planned) {
    throw new Error(`Finale Bildzahl ${images.length}, erwartet ${planned}. Phase 3 bricht ab und erzeugt keine fehlenden Bilder.`);
  }

  const snapshot = [];
  for (let i = 1; i <= planned; i += 1) {
    const expected = `Bild ${String(i).padStart(2, '0')}.png`;
    const image = images.find((item) => item.name === expected);
    if (!image) throw new Error(`Bild fehlt: ${expected}. Phase 3 bricht ab und erzeugt keinen Ersatz.`);
    const size = await fileSize(image.path);
    if (size <= 0) throw new Error(`Bild ist leer/ungültig: ${expected}. Phase 3 bricht ab.`);
    if (Number(meta.imageIntegrityGateVersion ?? 0) >= 1) {
      const result = await inspectPng(image.path);
      if (!result.passed) throw new Error(`Bild ungültig: ${expected}: ${result.errors.join(' | ')}. Phase 3 bricht ab.`);
    }
    snapshot.push({
      imageNumber: i,
      file: expected,
      sizeBytes: size,
      sha256: await sha256(image.path)
    });
  }

  return { p, meta, snapshot };
}

export async function createPhase3ImageLock(projectDirectory) {
  const { p, meta, snapshot } = await snapshotImages(projectDirectory);
  const lock = {
    schemaVersion: 1,
    status: 'LOCKED',
    policy: 'phase3-existing-images-read-only',
    source: '00-bildprompts/images',
    plannedImageCount: Number(meta.plannedImageCount),
    lockedAt: new Date().toISOString(),
    rules: [
      'Phase 3 may only read the images that already existed when this lock was created.',
      'Phase 3 must never generate, regenerate, replace, edit, delete or add images.',
      'Any missing, added, renamed, resized or byte-modified image is a hard failure.'
    ],
    images: snapshot
  };
  await writeJson(p.phase3ImageLock, lock);
  return lock;
}

export async function verifyPhase3ImageLock(projectDirectory) {
  const p = projectPaths(projectDirectory);
  if (!(await exists(p.phase3ImageLock))) {
    throw new Error('PHASE3_IMAGE_LOCK.json fehlt. Phase 3 darf ohne Bildlock nicht fortgesetzt werden.');
  }

  const lock = await readJson(p.phase3ImageLock);
  if (lock.status !== 'LOCKED' || lock.policy !== 'phase3-existing-images-read-only') {
    throw new Error('PHASE3_IMAGE_LOCK.json ist ungültig oder nicht aktiv.');
  }

  const { snapshot } = await snapshotImages(projectDirectory);
  const locked = Array.isArray(lock.images) ? lock.images : [];
  if (snapshot.length !== locked.length) {
    throw new Error('Bilderordner wurde nach Phase-3-Start verändert. Phase 3 bricht sofort ab.');
  }

  for (let i = 0; i < locked.length; i += 1) {
    const before = locked[i];
    const now = snapshot[i];
    if (!before || !now || before.file !== now.file) {
      throw new Error(`Bildbestand wurde verändert bei Position ${i + 1}. Phase 3 bricht sofort ab.`);
    }
    if (Number(before.sizeBytes) !== Number(now.sizeBytes) || before.sha256 !== now.sha256) {
      throw new Error(`${now.file} wurde während Phase 3 verändert oder ersetzt. Phase 3 bricht sofort ab.`);
    }
  }

  return { passed: true, imageCount: snapshot.length };
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: node src/cli/phase3-image-lock.js --dir "youtube/<week>/<slug>" [--verify]');

  if (process.argv.includes('--verify')) {
    const result = await verifyPhase3ImageLock(dir);
    console.log(`Phase-3-Bildlock: unverändert (${result.imageCount} Bilder).`);
    return;
  }

  const lock = await createPhase3ImageLock(dir);
  console.log(`Phase-3-Bildlock erstellt: ${lock.images.length} vorhandene Bilder sind jetzt read-only für Phase 3.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Phase-3-Bildlock: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
