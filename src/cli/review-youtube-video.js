#!/usr/bin/env node

import path from 'node:path';
import { arg, exists, projectPaths, readJson, writeJson, sha256 } from '../lib/pipeline.js';
import { REVIEW_FILENAME, createPendingReview, validatePostVideoReview, validateReviewEvidenceFiles, findUnreviewedExports } from '../lib/continuous-improvement.js';

export async function reviewYoutubeVideo(projectDirectory, { init = false } = {}) {
  const p = projectPaths(projectDirectory);
  const reportPath = path.join(p.techDir, 'EXPORT_REPORT.json');
  const videoPath = path.join(p.exportDir, 'FINAL_VIDEO.mp4');
  const reviewPath = path.join(p.techDir, REVIEW_FILENAME);

  if (!(await exists(reportPath)) || !(await exists(videoPath))) {
    throw new Error('Review benötigt echtes FINAL_VIDEO.mp4 und EXPORT_REPORT.json; keine Vorab-Erfolgsmeldung.');
  }
  const [meta, report] = await Promise.all([readJson(p.meta), readJson(reportPath)]);
  const actualHash = await sha256(videoPath);
  if (report.videoSha256 && actualHash !== report.videoSha256) {
    throw new Error('Video-SHA im EXPORT_REPORT.json stimmt nicht mit dem vorliegenden Video überein.');
  }
  const knownReport = { ...report, videoSha256: report.videoSha256 ?? actualHash };
  if (init) {
    if (await exists(reviewPath)) throw new Error('Review existiert bereits, nicht still überschreiben: '+reviewPath);
    await writeJson(reviewPath, createPendingReview(meta, knownReport));
    return { created: true, path: reviewPath };
  }
  if (!(await exists(reviewPath))) throw new Error('POST_VIDEO_REVIEW.json fehlt. Mit --init starten.');
  const review = await readJson(reviewPath);
  const result = validatePostVideoReview(review, knownReport);

  result.errors.push(...await validateReviewEvidenceFiles(review));
  if (review.videoId !== meta.videoId) result.errors.push('Review-Video-ID passt nicht zu video.json.');
  if (review.source?.exportVideoSha256 !== actualHash) {
    result.errors.push('Review-SHA stimmt nicht mit der vorliegenden FINAL_VIDEO.mp4 überein.');
  }
  result.passed = result.errors.length===0;
  return { ...result, path: reviewPath };
}

async function main() {
  const dir = arg('--dir');
  if (process.argv.includes('--backlog')) {
    const pending=await findUnreviewedExports();
    if (pending.length) {
      pending.forEach(x=>console.error('- '+x.project+': '+x.reason));
      throw new Error(pending.length+' offene Verbesserungs-Reviews.');
    }
    console.log('Post-Video-Improvement: Kein offener Review-Rückstand.');
    return;
  }
  if (!dir) throw new Error('Nutzung: npm run review:youtube -- --dir "youtube/<week>/<slug>" --init | --validate (oder --backlog)');
  const result=await reviewYoutubeVideo(dir, { init:process.argv.includes('--init') });
  if (result.created) {
    console.log('Review angelegt: '+result.path+' (PENDING_REVIEW). Das Video jetzt ansehen und konkrete Belege dokumentieren.');
  } else if (!result.passed) {
    result.errors.forEach(x=>console.error('- '+x));
    throw new Error('Review unvollständig: Verbesserungs-Gate nicht bestanden.');
  } else {
    console.log('Post-Video-Review VERIFIZIERT: nachweisbare Systemverbesserung und Lerntransfer dokumentiert.');
  }
}

if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(error=>{console.error('Post-Video-Review: '+error.message);process.exitCode=1;});
}
