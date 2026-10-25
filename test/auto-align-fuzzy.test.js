import assert from 'node:assert/strict';
import test from 'node:test';
import { findAnchor, similarToken } from '../src/cli/auto-align-youtube.js';

const words = (text) => text.split(/\s+/).map((word, i) => ({ text: word, start: i * 0.4, probability: 0.9 }));

// Regression: the first real voice-over (Melasse 1919) lost 25 of 82 anchors to Whisper spellings.
test('Anker-Abgleich toleriert Whisper-Schreibweisen, Zahlen und verschmolzene Namen', () => {
  assert.ok(similarToken('gonzales', 'gonzalez'));
  assert.ok(similarToken('gell', 'jell'));
  assert.ok(similarToken('21', 'einundzwanzig'));

  const spoken = words('Nachbarn halten Dosen. Eisekonzales arbeitet auf dem Gelände und erhört was die Nachbarn überhören. 21 Menschen werden sterben. Den Bau hat Arthur Gell geleitet. Isaac Gonzales ist auf dem Gelände so etwas wie das Mädchen für alles.');
  const four = findAnchor(spoken, 'Isaac Gonzalez arbeitet auf dem Gelände, und er hört, was die Nachbarn überhören:', 0);
  assert.equal(spoken[four.wordIndex].text, 'Eisekonzales', 'nicht zum späteren „Isaac Gonzales ist …“ springen');
  const seven = findAnchor(spoken, 'Einundzwanzig Menschen werden sterben.', four.wordIndex);
  assert.equal(spoken[seven.wordIndex].text, '21');
  const ten = findAnchor(spoken, 'Den Bau hat Arthur Jell geleitet, der Schatzmeister der Firma.', seven.wordIndex);
  assert.equal(spoken[ten.wordIndex].text, 'Den');
  assert.equal(findAnchor(spoken, 'Völlig anderer Satz über Schiffe im Hafen.', 0), null);
});

test('Phase 2: Nutzerfreigabe hebt nur genannte Prüfpunkte auf, nie Bildnummern', async () => {
  const { userWaivedChecks } = await import('../src/cli/validate-youtube-phase2.js');
  const errors = [];
  const ok = userWaivedChecks({ userOverride: { acceptedBy: 'user', reason: 'Nutzer nimmt Rahmen in Kauf', waivedChecks: ['weirdnessDetected'] } }, errors, 'Bild 26');
  assert.deepEqual([...ok], ['weirdnessDetected']);
  assert.deepEqual(errors, []);
  const bad = [];
  userWaivedChecks({ userOverride: { acceptedBy: 'claude', reason: 'x', waivedChecks: ['imageNumberVisible'] } }, bad, 'Bild 1');
  assert.match(bad.join(), /acceptedBy=user/);
  const never = [];
  const set = userWaivedChecks({ userOverride: { acceptedBy: 'user', reason: 'Nutzer will es so haben', waivedChecks: ['imageNumberVisible'] } }, never, 'Bild 2');
  assert.equal(set.has('imageNumberVisible'), false);
  assert.match(never.join(), /nicht aufhebbar/);
});
