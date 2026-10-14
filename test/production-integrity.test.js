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
function png(width, height) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 2;
  const rows = Buffer.alloc(height * (width * 3 + 1));
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
