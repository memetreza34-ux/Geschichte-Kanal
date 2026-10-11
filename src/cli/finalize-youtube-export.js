#!/usr/bin/env node

import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists, projectPaths, readJson, sha256, writeJson } from '../lib/pipeline.js';
import { validateYoutubeUpload } from '../lib/upload-metadata.js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function arrayLine(value) {
  return Array.isArray(value) ? value.map((item) => clean(item)).filter(Boolean).join(' ') : '';
}

export function buildCaption(meta) {
  const upload = meta.youtubeUpload ?? {};
  const title = clean(upload.title) || clean(meta.title);
  const description = clean(upload.description) || (clean(meta.topic) ? `In diesem Video geht es um ${clean(meta.topic)}.` : '');
  const hashtags = arrayLine(upload.hashtags);

  if (!title) throw new Error('YouTube-Titel fehlt in video.json (youtubeUpload.title oder title).');
  if (!description) throw new Error('YouTube-Beschreibung fehlt in video.json (youtubeUpload.description oder topic).');

  const additionalHashtags = hashtags.split(/\s+/).filter(Boolean).filter((tag) => !description.includes(tag));
  const descriptionForUpload = [description, additionalHashtags.join(' ')].filter(Boolean).join('\n\n');

  // CAPTION.txt is a copy-ready upload aid: keywords and cover instructions
  // remain internal metadata and must not appear in the YouTube description.
  return `TITLE:\n${title}\n\nDESCRIPTION:\n${descriptionForUpload}\n`;
}

function subtitleText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function srtTimestamp(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) throw new Error(`Ungültiger Untertitel-Zeitwert: ${seconds}`);
  const totalMs = Math.round(value * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function buildSrt(mapping) {
  const images = Array.isArray(mapping?.images) ? mapping.images : [];
  if (!images.length) throw new Error('SUBTITLES.srt benötigt Scene Cards in BILD_AUDIO_ZUORDNUNG.json.');

  const cues = images.map((image, index) => {
    const start = Number(image.actualStartSeconds);
    const end = Number(image.actualEndSeconds);
    const text = subtitleText(image.narrationBeat);

    if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) {
      throw new Error(`SUBTITLES.srt benötigt echte Audio-Zeitwerte bei Bild ${image.imageNumber ?? index + 1}. Erst Auto-Alignment ausführen.`);
    }
    if (!text) {
      throw new Error(`narrationBeat fehlt für Untertitel bei Bild ${image.imageNumber ?? index + 1}.`);
    }

    return `${index + 1}\n${srtTimestamp(start)} --> ${srtTimestamp(end)}\n${text}`;
  });

  return `${cues.join('\n\n')}\n`;
}

export async function finalizeYoutubeExport(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const video = path.join(p.exportDir, 'FINAL_VIDEO.mp4');
  const cover = path.join(p.imagesDir, 'Bild 01.png');
  const thumbnail = path.join(p.exportDir, 'THUMBNAIL.png');
  const caption = path.join(p.exportDir, 'CAPTION.txt');
  const subtitles = path.join(p.exportDir, 'SUBTITLES.srt');

  if (!(await exists(video))) throw new Error('FINAL_VIDEO.mp4 fehlt.');
  if (!(await exists(cover))) throw new Error('Bild 01.png fehlt.');

  const [meta, mapping] = await Promise.all([
    readJson(p.meta),
    readJson(p.mapping)
  ]);

  if (Number(meta.youtubeUpload?.captionPolicyVersion ?? 0) >= 2) {
    const channel = await readJson(path.resolve('config/channel-policy.json'));
    const qc = validateYoutubeUpload(meta, channel);
    if (!qc.passed) throw new Error(qc.errors.join('\n'));
  }

  await mkdir(p.exportDir, { recursive: true });
  await copyFile(cover, thumbnail);
  await writeFile(caption, buildCaption(meta), 'utf8');
  const srt = buildSrt(mapping);
  await writeFile(subtitles, srt, 'utf8');

  const report = {
    schemaVersion: 3,
    createdAt: new Date().toISOString(),
    videoFile: '03-export/FINAL_VIDEO.mp4',
    thumbnailFile: '03-export/THUMBNAIL.png',
    captionFile: '03-export/CAPTION.txt',
    subtitleFile: '03-export/SUBTITLES.srt',
    subtitleCueCount: Array.isArray(mapping.images) ? mapping.images.length : 0,
    subtitleTimingSource: '99-technik/BILD_AUDIO_ZUORDNUNG.json actualStartSeconds/actualEndSeconds',
    thumbnailSource: '00-bildprompts/images/Bild 01.png',
    coverSha256: await sha256(cover),
    thumbnailSha256: await sha256(thumbnail),
    captionSha256: await sha256(caption),
    subtitleSha256: await sha256(subtitles)
  };
  report.thumbnailIdenticalToCover = report.coverSha256 === report.thumbnailSha256;
  if (!report.thumbnailIdenticalToCover) throw new Error('Thumbnail ist nicht identisch zu Bild 01.');
  await writeJson(path.join(p.techDir, 'EXPORT_REPORT.json'), report);
  return report;
}

async function main() {
  const dir = arg('--dir');
  if (!dir) throw new Error('Nutzung: npm run finalize:youtube-export -- --dir "youtube/<week>/<slug>"');
  const report = await finalizeYoutubeExport(dir);
  console.log(`Export finalisiert: FINAL_VIDEO.mp4 + THUMBNAIL.png + CAPTION.txt + SUBTITLES.srt (${report.subtitleCueCount} Untertitel)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`Export-Finalisierung: FEHLER — ${error.message}`);
    process.exitCode = 1;
  });
}
