import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { validateYoutubeUpload } from '../src/lib/upload-metadata.js';
import { buildCaption, finalizeYoutubeExport } from '../src/cli/finalize-youtube-export.js';

const policy = JSON.parse(await readFile('config/channel-policy.json', 'utf8'));
const description = [
  'Eine historische Hafenstadt wird von ihren gewohnten Handelswegen abgeschnitten. Wie können Händler und Bewohner weiterleben, wenn die wichtigsten Zufahrten plötzlich gesperrt sind? Wir erzählen die Entwicklung vom ersten Verkehrsproblem bis zu den ungewöhnlichen Maßnahmen, mit denen die Menschen ihren Alltag organisieren.',
  'Du erfährst, welche Rolle Posten, Lagerhäuser, Marktstände und Transportwege spielen, warum eine kleine Entscheidung für eine ganze Stadt große Folgen haben kann und wie sich eine scheinbar technische Frage zu einem gesellschaftlichen Problem entwickelt. Dabei bleiben wir bei den konkreten Vorgängen und historischen Zusammenhängen.'
].join('\n\n');

const newMeta = () => ({
  title: 'Die eingeschlossene Stadt',
  coverPolicy: { coverText: 'STADT OHNE HANDEL' },
  youtubeUpload: {
    captionPolicyVersion: 2,
    title: 'Warum diese Stadt ihren Handel verlor',
    description,
    hashtags: ['#Geschichte', '#Hafenstadt', '#Handel', '#Belagerung', '#Historie']
  }
});

test('Zukünftige CAPTION V2 erzwingt längere Absätze und fünf Hashtags', () => {
  const qc = validateYoutubeUpload(newMeta(), policy);
  assert.equal(qc.passed, true, qc.errors.join('\n'));
  assert.ok(description.length >= 450);
  const caption = buildCaption(newMeta());
  assert.match(caption, /^TITLE:\nWarum diese Stadt/);
  assert.match(caption, /DESCRIPTION:\nEine historische Hafenstadt/);
  assert.match(caption, /\n\nDu erfährst, welche Rolle/);
  assert.ok(caption.trim().endsWith('#Geschichte #Hafenstadt #Handel #Belagerung #Historie'));
  assert.doesNotMatch(caption, /KEYWORDS:|THUMBNAIL_TEXT:|HASHTAGS:/);
});

test('Caption V2 blockiert zu kurze Texte, fehlenden Absatz und doppelte Hashtags', () => {
  const meta = newMeta();
  meta.youtubeUpload.description = 'Viel zu kurz.';
  meta.youtubeUpload.hashtags = ['#Geschichte', '#Geschichte'];
  const qc = validateYoutubeUpload(meta, policy);
  assert.equal(qc.passed, false);
  assert.match(qc.errors.join(' '), /450–1400 Zeichen/);
  assert.match(qc.errors.join(' '), /2 inhaltliche Absätze/);
  assert.match(qc.errors.join(' '), /genau 5 Hashtags/);
  assert.match(qc.errors.join(' '), /eindeutig/);
});

test('Bestehende Videos ohne V2-Marker sind weiterhin gültig und werden nicht umgeschrieben', () => {
  const legacy = newMeta();
  delete legacy.youtubeUpload.captionPolicyVersion;
  legacy.youtubeUpload.description = 'Bisherige kurze Beschreibung.';
  legacy.youtubeUpload.hashtags = ['#Geschichte'];
  const qc = validateYoutubeUpload(legacy, policy);
  assert.equal(qc.passed, true);
  assert.equal(qc.legacy, true);
});

test('Nur zukünftige Templates aktivieren Caption V2', async () => {
  const meta = JSON.parse(await readFile('youtube/templates/video-template/99-technik/video.json', 'utf8'));
  assert.equal(meta.youtubeUpload.captionPolicyVersion, 2);
  assert.equal(Object.hasOwn(meta.youtubeUpload, 'keywords'), false);
  assert.equal(policy.uploadRules.requiredHashtagCount, 5);
  assert.equal(policy.uploadRules.minimumDescriptionCharacters, 450);
  assert.equal(policy.uploadRules.minimumDescriptionParagraphs, 2);
});

test('Export prüft künftige Beschreibungen und liefert weiterhin Subtitle-SRT', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'caption-v2-'));
  try {
    await mkdir(path.join(temp, '00-bildprompts', 'images'), { recursive: true });
    await mkdir(path.join(temp, '03-export'), { recursive: true });
    await mkdir(path.join(temp, '99-technik'), { recursive: true });
    await writeFile(path.join(temp, '00-bildprompts/images/Bild 01.png'), 'cover');
    await writeFile(path.join(temp, '03-export/FINAL_VIDEO.mp4'), 'video');
    const meta = newMeta();
    await writeFile(path.join(temp, '99-technik/video.json'), JSON.stringify(meta));
    await writeFile(path.join(temp, '99-technik/BILD_AUDIO_ZUORDNUNG.json'), JSON.stringify({
      images: [{ imageNumber: 1, narrationBeat: 'Ein Satz für Untertitel.', actualStartSeconds: 0, actualEndSeconds: 3.5 }]
    }));
    let report = await finalizeYoutubeExport(temp);
    assert.equal(report.subtitleFile, '03-export/SUBTITLES.srt');
    const caption = await readFile(path.join(temp, '03-export/CAPTION.txt'), 'utf8');
    assert.match(caption, /#Historie/);
    assert.doesNotMatch(caption, /KEYWORDS:|THUMBNAIL_TEXT:|HASHTAGS:/);
    meta.youtubeUpload.description = 'Viel zu kurz.';
    await writeFile(path.join(temp, '99-technik/video.json'), JSON.stringify(meta));
    await assert.rejects(() => finalizeYoutubeExport(temp), /Caption V2/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
