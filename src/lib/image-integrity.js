import { readFile } from 'node:fs/promises';

// Validate actual PNG structure instead of trusting a .png suffix, a nonzero
// file size, or a matching hash. No image generation or mutation happens here.
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let i = 0; i < 8; i += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

function chunkCrc(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function validatePngBytes(bytes, { minWidth = 1280, minHeight = 720, aspectRatio = 16 / 9, aspectTolerance = 0.025 } = {}) {
  const errors = [];
  if (!Buffer.isBuffer(bytes) || bytes.length < 45 || !bytes.subarray(0, 8).equals(SIGNATURE)) {
    return { passed: false, width: null, height: null, errors: ['Keine gültige PNG-Signatur bzw. Datei zu kurz.'] };
  }
  let offset = 8;
  let chunks = 0;
  let foundIdat = false;
  let foundEnd = false;
  let width = null;
  let height = null;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) { errors.push('PNG-Chunk unvollständig.'); break; }
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) { errors.push('PNG-Chunk-Länge überschreitet die Datei.'); break; }
    const name = bytes.toString('ascii', offset + 4, offset + 8);
    const payloadStart = offset + 8;
    const crcOffset = payloadStart + length;
    if (chunkCrc(bytes.subarray(offset + 4, crcOffset)) !== bytes.readUInt32BE(crcOffset)) {
      errors.push('PNG-Prüfsumme fehlerhaft bei ' + name + '.');
      break;
    }
    if (chunks === 0) {
      if (name !== 'IHDR' || length !== 13) { errors.push('PNG muss mit einem 13-Byte-IHDR beginnen.'); break; }
      width = bytes.readUInt32BE(payloadStart);
      height = bytes.readUInt32BE(payloadStart + 4);
      const bitDepth = bytes[payloadStart + 8];
      const colorType = bytes[payloadStart + 9];
      if (!width || !height || ![0, 2, 3, 4, 6].includes(colorType) || ![1, 2, 4, 8, 16].includes(bitDepth)) {
        errors.push('PNG-IHDR enthält ungültige Bildmaße oder Pixelformat.');
      }
    }
    if (name === 'IDAT') foundIdat = true;
    if (name === 'IEND') {
      if (length !== 0 || !foundIdat || crcOffset + 4 !== bytes.length) errors.push('PNG-Ende/IDAT-Struktur ungültig.');
      foundEnd = true;
      break;
    }
    offset = crcOffset + 4;
    chunks += 1;
    if (chunks > 100000) { errors.push('Zu viele PNG-Chunks.'); break; }
  }
  if (!foundIdat) errors.push('PNG hat keine Bilddaten (IDAT).');
  if (!foundEnd) errors.push('PNG ist nicht vollständig abgeschlossen (IEND).');
  if (width !== null && height !== null) {
    if (width < minWidth || height < minHeight) errors.push('PNG-Auflösung ' + width + 'x' + height + ' liegt unter ' + minWidth + 'x' + minHeight + '.');
    if (Math.abs(width / height - aspectRatio) > aspectTolerance) errors.push('PNG-Seitenverhältnis ' + width + ':' + height + ' weicht von 16:9 ab.');
  }
  return { passed: errors.length === 0, width, height, errors };
}

export async function inspectPng(filePath, options = {}) {
  return validatePngBytes(await readFile(filePath), options);
}
