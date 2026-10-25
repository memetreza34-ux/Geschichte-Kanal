import path from 'node:path';
import { exists, sha256 } from './pipeline.js';
import { inspectPng } from './image-integrity.js';

export function usesStandaloneThumbnail(meta) {
  return meta?.coverPolicy?.firstSceneIsCover === false;
}

export function thumbnailSourcePath(paths) {
  return path.join(paths.projectDir, '00-bildprompts', 'thumbnail.png');
}

// Both the Phase-2 gate and every later render/export stage verify the exact
// approved thumbnail bytes; Phase 3 must never repair or regenerate the asset.
export async function validateStandaloneThumbnail(paths, meta, qc) {
  if (!usesStandaloneThumbnail(meta)) return [];
  const errors = [];
  const source = thumbnailSourcePath(paths);
  if (!(await exists(source))) return ['Separates Thumbnail fehlt: 00-bildprompts/thumbnail.png.'];
  const integrity = await inspectPng(source);
  errors.push(...integrity.errors.map(message => 'Thumbnail: ' + message));
  const review = qc?.thumbnail;
  if (!review || review.approved !== true) {
    return [...errors, 'Separates Thumbnail fehlt oder ist in PHASE2_VISUAL_QC.json nicht freigegeben.'];
  }
  if (review.fileName !== 'thumbnail.png') errors.push('Thumbnail-QC.fileName muss thumbnail.png sein.');
  const approvedHash = String(review.sha256 ?? '');
  if (!/^[a-f0-9]{64}$/i.test(approvedHash) || approvedHash.toLowerCase() !== (await sha256(source)).toLowerCase()) {
    errors.push('Thumbnail wurde nach der Freigabe ausgetauscht oder der SHA-256 fehlt.');
  }
  if (review.visibleTextDetected !== true || String(review.visibleTextExact ?? '').trim() !== String(meta.coverPolicy?.coverText ?? '').trim()) {
    errors.push('Thumbnail muss den exakten Covertext zeigen, ohne weitere Schrift.');
  }
  const override = review.userOverride;
  const waived = override?.acceptedBy === 'user' && String(override.reason ?? '').trim().length >= 10 && Array.isArray(override.waivedChecks)
    ? new Set(override.waivedChecks.filter((field) => ['weirdnessDetected', 'unexpectedTextDetected', 'pseudoTextDetected'].includes(field)))
    : new Set();
  for (const field of ['weirdnessDetected', 'unexpectedTextDetected', 'pseudoTextDetected']) {
    if (!waived.has(field) && review[field] !== false) errors.push('Thumbnail-QC.' + field + ' muss false sein.');
  }
  for (const field of ['styleConsistencyScore', 'readabilityScore']) {
    const value = Number(review[field]);
    if (!Number.isFinite(value) || value < 8 || value > 10) errors.push('Thumbnail-QC.' + field + ' muss mindestens 8/10 sein.');
  }
  return errors;
}
