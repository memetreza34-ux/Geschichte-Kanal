import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildCaption, validateYoutubeUpload } from '../src/lib/upload-metadata.js';
import { finalizeYoutubeExport } from '../src/cli/finalize-youtube-export.js';

const policy = JSON.parse(await readFile('config/channel-policy.json', 'utf8'));

const description = [
  'Eine Hafenstadt erhält seit Wochen kaum noch Waren. Warum gelingt es den Einwohnern trotzdem, ihre Märkte offen zu halten? In diesem Geschichtsvideo verfolgen wir, wie Händler, Lastträger und Stadtwachen auf eine wachsende Versorgungskrise reagieren und welche Rolle die engen Zufahrten spielen.',
  'Wir sehen, wie der Handel in der Stadt organisiert war, welche Schwierigkeiten beim Transport schwerer Güter entstanden und warum eine einzige blockierte Zufahrt Auswirkungen auf das tägliche Leben haben konnte. Dabei betrachten wir die Entscheidungen der Beteiligten und erklären, was die Ereignisse für die Bewohner bedeuteten.'
].join('\n\n');

function newMeta() {
  return {
    title: 'Die belagerte Hafenstadt',
    topic: 'Historische Hafenstadt',
    coverPolicy: { coverText: 'DIE STADT WAR GESPERRT' },
    youtubeUpload: {
      captionPolicyVersion: 2,
      title: 'Wie eine Hafenstadt mit einer Blockade umging',
      description,
      hashtags: ['#Geschichte', '#Hafenstadt', '#Handel', '#Belagerung', '#Geschichtsvideo'],
      keywords: ['soll nicht in CAPTION erscheinen']
    }
  };
}

test('Neue Videos benutzen nur Titel, längere Beschreibung und fünf Hashtags', async () => {
  const meta = newMeta();
  const checked = validateYoutubeUpload(meta, policy);
  assert.equal(checked.passed, true, checked.errors.join('\n'));
  assert.ok(description.length >= policy.uploadRules.minimumDescriptionCharacters);

  const caption = buildCaption(meta, policy);
  assert.match(caption, /^TITLE:\nWie eine Hafenstadt/);
  assert.match(caption, /\n\nDESCRIPTION:\nEine Hafenstadt/);
  assert.match(caption, /\n\nWir sehen, wie der Handel/);
  assert.ok(caption.trimEnd().endsWith('#Geschichte #Hafenstadt #Handel #Belagerung #Geschichtsvideo'));
  assert.doesNotMatch(caption, /KEYWORDS:|THUMBNAIL_TEXT:|HASHTAGS:/);
  assert.doesNotMatch(caption, /soll nicht in CAPTION erscheinen/);
});

test('Caption V2 blockiert kurze Beschreibungen und falsche Hashtag-Anzahlen', () => {
  const short = newMeta();
  short.youtubeUpload.description = 'Ein zu kurzer Satz.';
  short.youtubeUpload.hashtags = ['#Geschichte', '#Geschichte'];
  const result = validateYoutubeUpload(short, policy);
  assert.equal(result.passed, false);
  assert.match(result.errors.join(' '), /Zeichen/);
  assert.match(result.errors.join(' '), /Absätze/);
  assert.match(result.errors.join(' '), /genau 5/);
  assert.match(result.errors.join(' '), /doppelt/);
  assert.throws(() => buildCaption(short, policy), /YouTube-Caption V2/);
});

test('Alte Projekte behalten ihre bisherigen Exportmetadaten', () => {
  const meta = newMeta();
  delete meta.youtubeUpload.captionPolicyVersion;
  const result = validateYoutubeUpload(meta, policy);
  assert.equal(result.legacy, true);
  assert.equal(result.passed, true);
  const oldCaption = buildCaption(meta, policy);
  assert.match(oldCaption, /HASHTAGS:/);
  assert.match(oldCaption, /KEYWORDS:/);
  assert.match(oldCaption, /THUMBNAIL_TEXT:/);
});

test('Neues Template aktiviert Caption V2 ohne neue Keyword- oder Thumbnail-Rubrik', async () => {
  const meta = JSON.parse(await readFile('youtube/templates/video-template/99-technik/video.json', 'utf8'));
  assert.equal(meta.youtubeUpload.captionPolicyVersion, 2);
  assert.equal(Object.hasOwn(meta.youtubeUpload, 'keywords'), false);
  assert.equal(policy.uploadRules.requiredHashtagCount, 5);
  assert.equal(policy.uploadRules.minimumDescriptionCharacters, 450);
});

test('Finaler Export liefert für neue Projekte kopierbare Caption und SRT', async () => {
  const temp = await mkdtemp(path.join(tmpdir(), 'youtube-caption-v2-'));
  try {
    await mkdir(path.join(temp, '00-bildprompts/images'), { recursive: true });
    await mkdir(path.join(temp, '03-export'), { recursive: true });
    await mkdir(path.join(temp, '99-technik'), { recursive: true });
    await writeFile(path.join(temp, '00-bildprompts/images/Bild 01.png'), 'test-cover');
    await writeFile(path.join(temp, '03-export/FINAL_VIDEO.mp4'), 'test-video');
    await writeFile(path.join(temp, '99-technik/video.json'), JSON.stringify(newMeta()));
    await writeFile(path.join(temp, '99-technik/BILD_AUDIO_ZUORDNUNG.json'), JSON.stringify({
      images: [
        { imageNumber: 1, actualStartSeconds: 0, actualEndSeconds: 4, narrationBeat: 'Ein historischer Text.' }
      ]
    }));
    const report = await finalizeYoutubeExport(temp);
    assert.equal(report.subtitleFile, '03-export/SUBTITLES.srt');
    const caption = await readFile(path.join(temp, '03-export/CAPTION.txt'), 'utf8');
    assert.match(caption, /#Geschichtsvideo/);
    assert.doesNotMatch(caption, /KEYWORDS:|THUMBNAIL_TEXT:|HASHTAGS:/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
