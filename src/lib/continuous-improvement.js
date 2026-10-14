import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { exists, projectPaths, readJson, writeJson } from './pipeline.js';

export const REVIEW_FILENAME = 'POST_VIDEO_REVIEW.json';
export const REQUIRED_DIMENSIONS = [
  'hookAndStory', 'historicalAccuracy', 'visualVariety', 'narrationImageMatch',
  'pacingAndTransitions', 'cameraMotion', 'audioAndVoice', 'uploadPackage'
];

export function createPendingReview(meta, exportReport) {
  return {
    schemaVersion: 1,
    status: 'PENDING_REVIEW',
    videoId: String(meta.videoId ?? ''),
    source: {
      finalVideo: '03-export/FINAL_VIDEO.mp4',
      exportReport: '99-technik/EXPORT_REPORT.json',
      exportVideoSha256: String(exportReport.videoSha256 ?? ''),
      reviewedVideoDurationSeconds: null
    },
    reviewedAt: null,
    reviewer: '',
    dimensionScores: Object.fromEntries(REQUIRED_DIMENSIONS.map((dimension) => [dimension, null])),
    findings: [],
    verifiedImprovements: [],
    nextVideoLessons: [],
    reviewNotes: 'Review the actual final video. Cite timecodes and concrete observations; do not invent evidence.',
    CI: { regressionChecksPassed: false, reference: '' }
  };
}

const filled = (s, min=1) => typeof s === 'string' && s.trim().length >= min;
const number = (n) => typeof n === 'number' && Number.isFinite(n);
const unique = (values) => values.length === new Set(values).size;
const SHA = /^[a-f0-9]{64}$/i;

export function validatePostVideoReview(review, exportReport = null) {
  const errors = [];
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    return { passed: false, errors: ['POST_VIDEO_REVIEW.json muss ein Objekt sein.'] };
  }
  if (review.schemaVersion !== 1) errors.push('Review: schemaVersion=1 erforderlich.');
  if (review.status !== 'VERIFIED') errors.push('Review: status=VERIFIED erst nach echter Prüfung und verifizierten Verbesserungen.');
  if (!filled(review.videoId)) errors.push('Review: videoId fehlt.');
  if (!filled(review.reviewer)) errors.push('Review: reviewer / prüfende Instanz fehlt.');
  if (!filled(review.reviewedAt) || Number.isNaN(Date.parse(review.reviewedAt))) errors.push('Review: valides reviewedAt fehlt.');

  if (review.source?.finalVideo !== '03-export/FINAL_VIDEO.mp4' || review.source?.exportReport !== '99-technik/EXPORT_REPORT.json') {
    errors.push('Review: Quellen müssen FINAL_VIDEO.mp4 und EXPORT_REPORT.json referenzieren.');
  }
  if (!SHA.test(String(review.source?.exportVideoSha256 ?? ''))) errors.push('Review: überprüfter Video-SHA256 fehlt.');
  if (exportReport && review.source?.exportVideoSha256 !== exportReport.videoSha256) {
    errors.push('Review: Video-SHA passt nicht zum Exportbericht, Review gehört zu anderem Render.');
  }
  if (!number(review.source?.reviewedVideoDurationSeconds) || review.source.reviewedVideoDurationSeconds <= 0) {
    errors.push('Review: geprüfte Videodauer fehlt.');
  }

  for (const dimension of REQUIRED_DIMENSIONS) {
    const value = review.dimensionScores?.[dimension];
    if (!number(value) || value < 1 || value > 10) errors.push('Review: geprüfter Score 1–10 fehlt für '+dimension+'.');
  }
  const findings = Array.isArray(review.findings) ? review.findings : [];
  if (findings.length < 3) errors.push('Review: mindestens drei konkrete Beobachtungen oder Verbesserungschancen erforderlich.');
  const allowed = new Set(REQUIRED_DIMENSIONS);
  for (const [i,f] of findings.entries()) {
    if (!filled(f?.id) || !filled(f?.observation, 20) || !filled(f?.evidence, 15) ||
        !filled(f?.rootCause, 15) || !allowed.has(f?.dimension) ||
        !number(f?.timestampSeconds) || f.timestampSeconds < 0 ||
        !['P0','P1','P2'].includes(f?.priority)) {
      errors.push('Review: Befund '+(i+1)+' braucht ID, Dimension, Zeitpunkt, konkrete Beobachtung, Beleg, Ursache und Priorität.');
    }
    if (number(review.source?.reviewedVideoDurationSeconds) && number(f?.timestampSeconds) &&
      f.timestampSeconds > review.source.reviewedVideoDurationSeconds) {
      errors.push('Review: Befund '+(i+1)+' liegt außerhalb des geprüften Videos.');
    }
  }
  if (!unique(findings.map(f=>f?.id))) errors.push('Review: doppelte Befund-IDs.');

  const upgrades = Array.isArray(review.verifiedImprovements) ? review.verifiedImprovements : [];
  if (!upgrades.length) errors.push('Review: mindestens eine implementierte, belegte Systemverbesserung erforderlich.');
  for (const [i,x] of upgrades.entries()) {
    if (!findings.some(f => f.id === x?.findingId) ||
        !filled(x?.rootCauseAddressed, 15) || !filled(x?.policyOrCodePath, 8) ||
        !filled(x?.before, 10) || !filled(x?.after, 10) ||
        !filled(x?.verificationEvidence, 15) ||
        !filled(x?.regressionTestPath, 8) || x?.status !== 'VERIFIED') {
      errors.push('Review: Upgrade '+(i+1)+' muss einem Befund zugeordnet und mit Änderung, Vorher/Nachher, Regressionstest und Nachweis VERIFIZIERT sein.');
    }
    if (x?.policyOrCodePath === x?.regressionTestPath) errors.push('Review: Regeländerung und Regressionstest brauchen verschiedene Pfade.');
  }
  const lessons = Array.isArray(review.nextVideoLessons) ? review.nextVideoLessons : [];
  if (lessons.length < 2 || lessons.some(s=>!filled(s, 20))) errors.push('Review: mindestens zwei konkrete Lehren für das nächste Video.');
  if (review.CI?.regressionChecksPassed !== true || !filled(review.CI?.reference, 8)) {
    errors.push('Review: CI muss grün und mit konkretem Lauf/Commit belegt sein.');
  }
  return { passed: errors.length===0, errors };
}

export async function validateReviewEvidenceFiles(review, repoRoot = process.cwd()) {
  const errors = [];
  if (review?.status !== 'VERIFIED' || !Array.isArray(review.verifiedImprovements)) return errors;
  for (const item of review.verifiedImprovements) {
    for (const key of ['policyOrCodePath', 'regressionTestPath']) {
      const rel = item?.[key];
      if (typeof rel !== 'string' || !rel.trim() || path.isAbsolute(rel) || rel.replaceAll(String.fromCharCode(92), '/').split('/').includes('..')) {
        errors.push('Review: ungültiger Repo-Pfad '+String(rel)+'.');
      } else if (!(await exists(path.resolve(repoRoot, rel)))) {
        errors.push('Review: als umgesetzt behauptete Code-/Testdatei fehlt: '+rel+'.');
      }
    }
  }
  return errors;
}

export async function ensurePendingPostVideoReview(projectDirectory, meta, exportReport) {
  if (Number(meta.postVideoImprovementGateVersion ?? 0) < 1) return { created: false, legacy: true };
  const p = projectPaths(projectDirectory);
  const reviewFile = path.join(p.techDir, REVIEW_FILENAME);
  if (await exists(reviewFile)) {
    const existing = await readJson(reviewFile);
    if (existing.source?.exportVideoSha256 === exportReport.videoSha256) {
      return { created: false, existingStatus: existing.status };
    }
  }
  await writeJson(reviewFile, createPendingReview(meta, exportReport));
  return { created: true, existingStatus: 'PENDING_REVIEW' };
}

/**
 * Detect all review-enabled exports with pending or invalid reviews.
 * No existing/legacy projects without an opted-in review are included.
 * Fail closed if a completed opt-in project has no review record.
 */
export async function findUnreviewedExports(root = process.cwd(), ignoreProjectDir = null) {
  const top = path.join(root, 'youtube');
  if (!(await exists(top))) return [];
  const failures = [];
  const weeks = await readdir(top, { withFileTypes: true });
  for (const week of weeks) {
    if (!week.isDirectory() || week.name === 'templates') continue;
    const weekPath = path.join(top, week.name);
    for (const project of await readdir(weekPath, { withFileTypes: true })) {
      if (!project.isDirectory()) continue;
      const dir=path.join(weekPath, project.name);
      if (ignoreProjectDir && path.resolve(dir)===path.resolve(ignoreProjectDir)) continue;
      const p=projectPaths(dir);
      if (!(await exists(p.meta)) || !(await exists(path.join(p.techDir,'EXPORT_REPORT.json')))) continue;
      const meta = await readJson(p.meta);
      if (Number(meta.postVideoImprovementGateVersion ?? 0) < 1) continue;
      const report = await readJson(path.join(p.techDir, 'EXPORT_REPORT.json'));
      const reviewPath = path.join(p.techDir, REVIEW_FILENAME);
      if (!(await exists(reviewPath))) {
        failures.push({ project: path.relative(root,dir), reason: 'POST_VIDEO_REVIEW.json fehlt trotz Export.' });
        continue;
      }
      try {
        const review = await readJson(reviewPath);
        const result = validatePostVideoReview(review, report);
        const files = await validateReviewEvidenceFiles(review);
        if (review.videoId !== meta.videoId) result.errors.push('Review-Video-ID stimmt nicht mit video.json überein.');
        result.errors.push(...files);
        if (result.errors.length) failures.push({ project: path.relative(root,dir), reason: result.errors.join(' | ') });
      } catch (error) {
        failures.push({ project: path.relative(root,dir), reason: error.message });
      }
    }
  }
  return failures;
}

export async function assertImprovementLoopReady(root = process.cwd(), ignoreProjectDir = null) {
  const failures = await findUnreviewedExports(root, ignoreProjectDir);
  if (failures.length) {
    throw new Error('POST-VIDEO-IMPROVEMENT-HARD-GATE: Erst fertige Videos auswerten und mindestens eine getestete Verbesserung übernehmen. Offene Reviews:\n'+
      failures.map(x=>'- '+x.project+': '+x.reason).join('\n')+
      '\nPrüfen: npm run validate:youtube-postmortem -- --dir "youtube/<week>/<slug>".');
  }
  return { passed: true };
}
