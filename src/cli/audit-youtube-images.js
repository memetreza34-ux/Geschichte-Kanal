#!/usr/bin/env node
import { readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';
import { inspectPng } from '../lib/image-integrity.js';

function proposedNumber(name) {
  const match = /^(?:bild|image)[ _-]*0*(\d{1,3})\.png$/i.exec(name);
  return match ? Number(match[1]) : null;
}

export async function repairImageNames(projectDirectory) {
  const p = projectPaths(projectDirectory);
  if (await exists(p.phase3ImageLock)) throw new Error('Phase-3-Bildlock aktiv: keine Dateiumbenennung erlaubt.');
  const qc = await readJson(p.phase2VisualQc, null);
  if (qc?.status === 'APPROVED') throw new Error('Phase-2-QC ist freigegeben: Umbenennen würde geprüfte Bild-Hashes invalidieren.');
  const meta = await readJson(p.meta);
  const count = Number(meta.plannedImageCount);
  if (!Number.isInteger(count) || count < 1 || count > 999) throw new Error('plannedImageCount ungültig.');
  if (!(await exists(p.imagesDir))) return [];
  const entries = (await readdir(p.imagesDir, { withFileTypes: true })).filter(x => x.isFile()).map(x => x.name);
  const renames = [];
  const claimed = new Set();
  for (const file of entries) {
    const number = proposedNumber(file);
    if (number === null || number < 1 || number > count) continue;
    const target = 'Bild ' + String(number).padStart(2, '0') + '.png';
    if (file === target) continue;
    if (entries.includes(target) || claimed.has(target)) {
      throw new Error('Mehrdeutige Bildnummer ' + number + ': ' + file + ' konkurriert mit ' + target + '. Keine Datei verändert.');
    }
    claimed.add(target);
    renames.push({ from: file, to: target });
  }
  // Validate the complete rename plan before any files are moved.
  for (const item of renames) {
    const result = await inspectPng(path.join(p.imagesDir, item.from));
    if (!result.passed) throw new Error('Umbenennen abgebrochen: ' + item.from + ' ist kein gültiges Produktions-PNG: ' + result.errors.join(' | '));
  }
  for (const item of renames) await rename(path.join(p.imagesDir, item.from), path.join(p.imagesDir, item.to));
  return renames;
}

export async function auditYoutubeImages(projectDirectory, { writeReport = false } = {}) {
  const p = projectPaths(projectDirectory);
  const meta = await readJson(p.meta);
  const planned = Number(meta.plannedImageCount);
  if (!Number.isInteger(planned) || planned < 1 || planned > 999) throw new Error('plannedImageCount ungültig (1–999).');
  const entries = await (await exists(p.imagesDir) ? readdir(p.imagesDir, { withFileTypes: true }) : Promise.resolve([]));
  const files = new Set(entries.filter(e => e.isFile() && e.name !== '.gitkeep').map(e => e.name));
  const expectedNames = new Set(Array.from({ length: planned }, (_, i) => 'Bild ' + String(i + 1).padStart(2, '0') + '.png'));
  const unexpected = [...files].filter(name => !expectedNames.has(name));
  const subdirectories = entries.filter(e => e.isDirectory()).map(e => e.name);
  const images = [];
  const errors = [];
  for (let number = 1; number <= planned; number += 1) {
    const fileName = 'Bild ' + String(number).padStart(2, '0') + '.png';
    if (!files.has(fileName)) {
      images.push({ imageNumber: number, fileName, status: 'MISSING' });
      continue;
    }
    const filePath = path.join(p.imagesDir, fileName);
    const integrity = await inspectPng(filePath);
    images.push({
      imageNumber: number, fileName, status: integrity.passed ? 'VALID' : 'INVALID',
      width: integrity.width, height: integrity.height,
      sha256: await sha256(filePath),
      errors: integrity.errors
    });
    if (!integrity.passed) errors.push(fileName + ': ' + integrity.errors.join(' | '));
  }
  const missing = images.filter(x => x.status === 'MISSING').map(x => x.fileName);
  if (unexpected.length) errors.push('Unerwartete Dateinamen: ' + unexpected.join(', '));
  if (subdirectories.length) errors.push('Unerlaubte Unterordner: ' + subdirectories.join(', '));
  if (missing.length) errors.push('Fehlende Bilder: ' + missing.join(', '));
  const report = {
    schemaVersion: 1,
    status: errors.length ? 'INCOMPLETE' : 'COMPLETE',
    expectedCount: planned, validCount: images.filter(x => x.status === 'VALID').length,
    missing, unexpected, subdirectories, images, errors
  };
  if (writeReport) await writeJson(path.join(p.techDir, 'FLOW_IMAGE_AUDIT.json'), report);
  return report;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run audit:youtube-images -- --dir "youtube/<week>/<slug>" [--repair-names] [--write-report]');
  if (process.argv.includes('--repair-names')) {
    const changed = await repairImageNames(dir);
    console.log('Nur vor Phase-2-Freigabe umbenannt: ' + (changed.length ? changed.map(x => x.from + ' → ' + x.to).join(', ') : 'keine'));
  }
  const report = await auditYoutubeImages(dir, { writeReport: process.argv.includes('--write-report') });
  console.log('Flow-Bilder: ' + report.validCount + '/' + report.expectedCount + ' gültig. Status: ' + report.status);
  for (const error of report.errors) console.error('- ' + error);
  if (report.errors.length) process.exitCode = 1;
}
if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(error => { console.error('Bild-Audit: ' + error.message); process.exitCode = 1; });
}
