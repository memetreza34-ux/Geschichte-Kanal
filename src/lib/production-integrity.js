import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

export function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function validateVideoId(videoId) {
  if (typeof videoId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,179}$/i.test(videoId)) {
    throw new Error('videoId muss ein einfacher Bezeichner ohne Pfadtrenner oder Punktsegmente sein.');
  }
  return videoId;
}

export async function safeRenderDirectory(videoId, root = path.resolve('public', '__render')) {
  validateVideoId(videoId);
  const target = path.join(root, videoId);
  for (const candidate of [path.dirname(root), root, target]) {
    try {
      if ((await lstat(candidate)).isSymbolicLink()) throw new Error(`Render-Pfad darf kein Symlink sein: ${candidate}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return target;
}

export function alignmentFingerprint(mapping, { model, language, scriptSha256 }) {
  return fingerprint({
    version: 2, model, language, scriptSha256,
    images: (mapping.images ?? []).map(({ imageNumber, imageFile, startAnchor, narrationBeat }) => ({ imageNumber, imageFile, startAnchor, narrationBeat }))
  });
}

export function alignedMappingErrors(images) {
  if (!Array.isArray(images) || !images.length) return ['Alignment enthält keine Szenen.'];
  const errors = [];
  for (let index = 0; index < images.length; index += 1) {
    const { actualStartSeconds: start, actualEndSeconds: end } = images[index];
    if (typeof start !== 'number' || !Number.isFinite(start) || start < 0 ||
        typeof end !== 'number' || !Number.isFinite(end) || end <= start) {
      errors.push(`Bild ${index + 1}: gemessene Start-/Endzeiten fehlen oder sind ungültig.`);
    }
    if (index === 0 && start !== 0) errors.push('Erste Alignment-Szene muss bei 0 starten.');
    if (index && Math.abs(start - images[index - 1].actualEndSeconds) > 0.002) errors.push(`Alignment-Lücke/Überlappung vor Bild ${index + 1}.`);
  }
  return errors;
}

export function timelineErrors(timeline, count) {
  const errors = [];
  const images = timeline?.images;
  if (!Array.isArray(images) || images.length !== count || !images.length) return ['Timeline enthält nicht die erwarteten Szenen.'];
  if (!Number.isFinite(timeline.durationSeconds) || timeline.durationSeconds <= 0) errors.push('Timeline-Gesamtdauer ist ungültig.');
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const values = [image.startSeconds, image.endSeconds, image.durationSeconds];
    if (values.some(value => typeof value !== 'number' || !Number.isFinite(value)) || image.startSeconds < 0 || image.endSeconds <= image.startSeconds ||
        Math.abs(image.endSeconds - image.startSeconds - image.durationSeconds) > 0.002) errors.push(`Ungültige Timeline-Zeiten bei Bild ${index + 1}.`);
    if (image.imageNumber !== index + 1) errors.push(`Timeline-Reihenfolge ungültig bei Bild ${index + 1}.`);
    if (index === 0 && image.startSeconds !== 0) errors.push('Timeline muss bei 0 starten.');
    if (index && Math.abs(image.startSeconds - images[index - 1].endSeconds) > 0.002) errors.push(`Timeline-Lücke/Überlappung vor Bild ${index + 1}.`);
  }
  if (Math.abs(images.at(-1).endSeconds - timeline.durationSeconds) > 0.002) errors.push('Letzte Szene deckt das Kompositionsende nicht ab.');
  return errors;
}

