import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';
import test from 'node:test';
import { validatePngBytes, inspectPng } from '../src/lib/image-integrity.js';
import { auditYoutubeImages, repairImageNames } from '../src/cli/audit-youtube-images.js';
import { createPhase3ImageLock } from '../src/cli/phase3-image-lock.js';
import { findUnreviewedExports } from '../src/lib/continuous-improvement.js';

const CRC_TABLE = Array.from({ length: 256 }, (_, i) => {
  let x = i;
  for (let n = 0; n < 8; n++) x = (x & 1) ? (0xedb88320 ^ (x >>> 1)) : x >>> 1;
  return x >>> 0;
});
function crc32(data) {
  let x = 0xffffffff;
  for (const value of data) x = CRC_TABLE[(x ^ value) & 255] ^ (x >>> 8);
  return (x ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const label = Buffer.from(name, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, crc]);
}
function png(width, height, pixels = null) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 2;
  const rows = pixels ?? Buffer.alloc(height * (width * 3 + 1));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))
  ]);
}
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'history-image-integrity-'));
  await mkdir(path.join(dir, '00-bildprompts', 'images'), { recursive: true });
  await mkdir(path.join(dir, '99-technik'), { recursive: true });
  await writeFile(path.join(dir, '99-technik', 'video.json'), JSON.stringify({ plannedImageCount: 2, imageIntegrityGateVersion: 1 }));
  return dir;
}

test('PNG-Prüfung erkennt echte 16:9-Bilddaten, Dateifehler und falsche Maße', () => {
  const image = png(1280, 720);
  assert.equal(validatePngBytes(image).passed, true);
  assert.equal(validatePngBytes(Buffer.from('not a png')).passed, false);
  const corrupt = Buffer.from(image);
  corrupt[corrupt.length - 17] ^= 1;
  assert.equal(validatePngBytes(corrupt).passed, false);
  assert.match(validatePngBytes(png(1024, 768)).errors.join(' '), /Auflösung|Seitenverhältnis/);
});

test('PNG mit korrekter CRC, aber unvollständigen Pixelzeilen besteht keine echte Decodierung', async () => {
  const dir = await fixture();
  try {
    const file = path.join(dir, '00-bildprompts', 'images', 'Bild 01.png');
    await writeFile(file, png(1280, 720, Buffer.from([0, 0, 0, 0])));
    assert.equal((await inspectPng(file)).passed, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Flow-Bild-Audit meldet Lücken und benennt nur vor Bildfreigabe sicher um', async () => {
  const dir = await fixture();
  try {
    const folder = path.join(dir, '00-bildprompts', 'images');
    await writeFile(path.join(folder, 'Bild 1.png'), png(1280, 720));
    const incomplete = await auditYoutubeImages(dir);
    assert.deepEqual(incomplete.missing, ['Bild 01.png', 'Bild 02.png']);
    assert.deepEqual(incomplete.unexpected, ['Bild 1.png']);
    assert.equal((await repairImageNames(dir)).length, 1);
    const after = await auditYoutubeImages(dir, { writeReport: true });
    assert.equal(after.validCount, 1);
    assert.deepEqual(after.missing, ['Bild 02.png']);
    assert.match(await readFile(path.join(dir, '99-technik', 'FLOW_IMAGE_AUDIT.json'), 'utf8'), /INCOMPLETE/);
    await writeFile(path.join(folder, 'Bild 02.png'), png(1280, 720));
    assert.equal((await auditYoutubeImages(dir)).status, 'COMPLETE');
    await createPhase3ImageLock(dir);
    await assert.rejects(() => repairImageNames(dir), /Bildlock/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Aktiver Bildintegritäts-Gate blockiert selbst beim Bildlock defekte PNG-Dateien', async () => {
  const dir = await fixture();
  try {
    const folder = path.join(dir, '00-bildprompts', 'images');
    await writeFile(path.join(folder, 'Bild 01.png'), 'not-a-png');
    await writeFile(path.join(folder, 'Bild 02.png'), png(1280, 720));
    await assert.rejects(() => createPhase3ImageLock(dir), /Bild ungültig/);
    assert.equal((await inspectPng(path.join(folder, 'Bild 02.png'))).passed, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Improvement-Backlog findet fehlende Exportberichte und manipulierte vorhandene MP4', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'history-review-integrity-'));
  try {
    const dir = path.join(root, 'youtube', 'KW42', 'actual-export');
    await mkdir(path.join(dir, '99-technik'), { recursive: true });
    await mkdir(path.join(dir, '03-export'), { recursive: true });
    await writeFile(path.join(dir, '99-technik', 'video.json'), JSON.stringify({ postVideoImprovementGateVersion: 1 }));
    await writeFile(path.join(dir, '03-export', 'FINAL_VIDEO.mp4'), 'first-version');
    let pending = await findUnreviewedExports(root);
    assert.match(pending[0].reason, /EXPORT_REPORT.json fehlt/);
    await writeFile(path.join(dir, '99-technik', 'EXPORT_REPORT.json'), JSON.stringify({ videoSha256: 'a'.repeat(64) }));
    pending = await findUnreviewedExports(root);
    assert.match(pending[0].reason, /Video-SHA-256/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Ein bestehender Phase-3-Lock kann nach Bildersatz nicht neu geschrieben werden', async () => {
  const dir = await fixture();
  try {
    const folder = path.join(dir, '00-bildprompts', 'images');
    const file1 = path.join(folder, 'Bild 01.png');
    const file2 = path.join(folder, 'Bild 02.png');
    await writeFile(file1, png(1280, 720));
    await writeFile(file2, png(1280, 720));
    const lock = await createPhase3ImageLock(dir);
    await writeFile(file2, png(1920, 1080));
    await assert.rejects(() => createPhase3ImageLock(dir), /verändert oder ersetzt/i);
    const stored = JSON.parse(await readFile(path.join(dir, '99-technik', 'PHASE3_IMAGE_LOCK.json'), 'utf8'));
    assert.equal(stored.images[1].sha256, lock.images[1].sha256);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Bild-Audit erkennt überzählige Bilder trotz formal richtigem Dateinamen', async () => {
  const dir = await fixture();
  try {
    const folder = path.join(dir, '00-bildprompts', 'images');
    for (const name of ['Bild 01.png', 'Bild 02.png', 'Bild 03.png']) {
      await writeFile(path.join(folder, name), png(1280, 720));
    }
    const audit = await auditYoutubeImages(dir);
    assert.deepEqual(audit.unexpected, ['Bild 03.png']);
    assert.equal(audit.status, 'INCOMPLETE');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Separates Thumbnail ist ein eigener freigegebener Asset-Hash und nie das erste Storybild', async () => {
  const { sha256 } = await import('../src/lib/pipeline.js');
  const { validatePhase2 } = await import('../src/cli/validate-youtube-phase2.js');
  const { finalizeYoutubeExport } = await import('../src/cli/finalize-youtube-export.js');
  const dir = await fixture();
  try {
    const images = path.join(dir, '00-bildprompts', 'images');
    const tech = path.join(dir, '99-technik');
    const exportDir = path.join(dir, '03-export');
    await mkdir(path.join(dir, '02-audio'), { recursive: true });
    await mkdir(exportDir, { recursive: true });
    const first = path.join(images, 'Bild 01.png');
    const second = path.join(images, 'Bild 02.png');
    const thumbnail = path.join(dir, '00-bildprompts', 'thumbnail.png');
    await writeFile(first, png(1280, 720));
    await writeFile(second, png(1280, 720));
    await writeFile(thumbnail, png(1920, 1080));
    await writeFile(path.join(dir, '02-audio', 'voice.wav'), 'placeholder');
    await writeFile(path.join(exportDir, 'FINAL_VIDEO.mp4'), 'test-video');
    await writeFile(path.join(tech, 'video.json'), JSON.stringify({
      plannedImageCount: 2, imageIntegrityGateVersion: 1, phase2VisualQcRequired: true,
      phase2VisualQcHashVersion: 1, figureReviewGateVersion: 1,
      coverPolicy: { firstSceneIsCover: false, coverText: 'DIE LETZTE FLOTTE' },
      title: 'History Test', topic: 'Testgeschichte',
      youtubeUpload: { title: 'History Test', description: 'Ein Testtext.' }
    }));
    await writeFile(path.join(tech, 'BILD_AUDIO_ZUORDNUNG.json'), JSON.stringify({
      images: [
        { imageNumber: 1, visualForm: 'character-scene', visibleTextPolicy: 'NO_VISIBLE_TEXT', narrationBeat: 'Eine Flotte beginnt.', actualStartSeconds: 0, actualEndSeconds: 3 },
        { imageNumber: 2, visualForm: 'object-focus', visibleTextPolicy: 'NO_VISIBLE_TEXT', narrationBeat: 'Dann fährt sie los.', actualStartSeconds: 3, actualEndSeconds: 6 }
      ]
    }));
    const entries = [];
    for (let i = 1; i <= 2; i++) {
      entries.push({
        imageNumber: i, fileName: 'Bild 0' + i + '.png', sha256: await sha256(i === 1 ? first : second),
        approved: true, narrationSupportScore: 9, visualInterestScore: 9, styleConsistencyScore: 9,
        weirdnessDetected: false, imageNumberVisible: false, unexpectedTextDetected: false,
        pseudoTextDetected: false, visibleTextDetected: false, visibleTextExact: '',
        prominentPeopleVisible: i === 1,
        faceNatural: true, proportionsPlausible: true, handsGesturesPlausible: true,
        distinctIdentities: true, historicalWardrobePlausible: true, characterStyleConsistent: true
      });
    }
    const review = {
      schemaVersion: 2, status: 'APPROVED', reviewMethod: 'human-or-vision-review',
      hashAlgorithm: 'sha256', images: entries,
      thumbnail: {
        approved: true, fileName: 'thumbnail.png', sha256: await sha256(thumbnail),
        visibleTextDetected: true, visibleTextExact: 'DIE LETZTE FLOTTE',
        weirdnessDetected: false, unexpectedTextDetected: false, pseudoTextDetected: false,
        styleConsistencyScore: 9, readabilityScore: 9
      }
    };
    await writeFile(path.join(tech, 'PHASE2_VISUAL_QC.json'), JSON.stringify(review));
    assert.equal((await validatePhase2(dir)).passed, true);
    review.minimumNarrationSupportScore = 0;
    review.minimumVisualInterestScore = 0;
    review.minimumStyleConsistencyScore = 0;
    review.images[0].narrationSupportScore = 0;
    await writeFile(path.join(tech, 'PHASE2_VISUAL_QC.json'), JSON.stringify(review));
    assert.match((await validatePhase2(dir)).errors.join(' '), /narrationSupportScore muss mindestens 8/);
    review.images[0].narrationSupportScore = 9;
    await writeFile(path.join(tech, 'PHASE2_VISUAL_QC.json'), JSON.stringify(review));
    const report = await finalizeYoutubeExport(dir);
    assert.equal(report.thumbnailIdenticalToCover, false);
    assert.equal(report.thumbnailVerifiedAgainstSource, true);
    assert.equal(report.thumbnailSource, '00-bildprompts/thumbnail.png');

    review.images[0].faceNatural = false;
    await writeFile(path.join(tech, 'PHASE2_VISUAL_QC.json'), JSON.stringify(review));
    assert.match((await validatePhase2(dir)).errors.join(' '), /faceNatural/);
    review.images[0].faceNatural = true;
    await writeFile(path.join(tech, 'PHASE2_VISUAL_QC.json'), JSON.stringify(review));
    await writeFile(thumbnail, png(1280, 720));
    assert.match((await validatePhase2(dir)).errors.join(' '), /Thumbnail.*SHA-256/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
