#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { arg, exists } from '../lib/pipeline.js';
import { creativeInputs, creativePlanFingerprint } from '../lib/creative-evidence.js';
import { fingerprint } from '../lib/production-integrity.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export async function previewYoutubePlan(projectDirectory) {
  const input = await creativeInputs(projectDirectory);
  const { meta, mapping, research, worldLock, scriptSha256 } = input;
  const planFingerprint = creativePlanFingerprint(input);
  const cards = [];
  for (const scene of mapping.images ?? []) {
    const file = `Bild ${String(scene.imageNumber).padStart(2, '0')}.png`;
    const image = path.join(projectDirectory, '00-bildprompts', 'images', file);
    const references = (scene.visualReferenceIds ?? []).map(id => research?.visualReferences?.find(reference => reference.id === id)).filter(Boolean);
    cards.push(`<article><h2>Bild ${escape(scene.imageNumber)} · ${escape(scene.sequenceId)} · ${escape(scene.beatFunction)}</h2>
      ${await exists(image) ? `<img src="../00-bildprompts/images/${encodeURIComponent(file)}" alt="Bild ${escape(scene.imageNumber)}">` : '<div class="missing">Bild noch nicht erzeugt</div>'}
      <p class="voice">${escape(scene.narrationBeat)}</p>
      <p><b>Neue Erkenntnis:</b> ${escape(scene.knowledgeChange)}</p><p><b>Sichtbarer Beleg:</b> ${escape(scene.visibleEvidence)}</p>
      <p><b>Komposition:</b> ${escape(scene.composition)}</p><p><b>Kontinuität:</b> ${escape(JSON.stringify(scene.continuity ?? []))}</p>
      <p><b>Beschriftung/Route:</b> ${escape(JSON.stringify(scene.overlays ?? []))}</p>
      ${references.map(reference => `<p><b>Historische Referenz:</b> ${escape(reference.description)}<br>Muss: ${escape(reference.mustShow?.join('; '))}<br>Ausschließen: ${escape(reference.mustAvoid?.join('; '))}</p>`).join('')}
      <p><b>Geplante Dauer:</b> ${escape(scene.plannedHoldSeconds)} s · ${escape(scene.holdReason)}</p></article>`);
  }
  const output = path.join(projectDirectory, '99-technik', 'STORYBOARD.html');
  await writeFile(output, `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(meta.title)} · Szenenprüfung</title>
  <style>body{font:17px/1.5 system-ui;background:#ece8df;color:#1b2228;margin:24px auto;max-width:1080px;padding:0 20px}article{background:white;padding:24px;margin:24px 0;border-radius:12px;break-inside:avoid}img{width:100%;aspect-ratio:16/9;object-fit:contain}.voice{font-size:1.25em;border-left:4px solid #a23e23;padding-left:16px}.missing{padding:40px;background:#e3e7e9;text-align:center}code{overflow-wrap:anywhere;font-size:.8em}@media print{article{page-break-after:always}}</style>
  <h1>${escape(meta.title)}</h1><p>Prüfansicht · keine automatische Freigabe. Erst Sprachfluss, dann Ursache → Entscheidung → Folge, anschließend Bildbeleg und Zustandskontinuität prüfen.</p>
  <p>Skript-SHA256: <code>${scriptSha256}</code><br>Recherche: <code>${fingerprint(research)}</code><br>Szenenplan: <code>${planFingerprint}</code></p>
  <details><summary>Wiederkehrende Identitäten</summary><pre>${escape(JSON.stringify(worldLock.entities ?? [], null, 2))}</pre></details>${cards.join('\n')}</html>`, 'utf8');
  return { output, scriptSha256, researchFingerprint: fingerprint(research), planFingerprint };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = arg('--dir');
  (async () => {
    if (!dir) throw new Error('Nutzung: npm run preview:youtube-plan -- --dir "youtube/<week>/<slug>"');
    console.log(JSON.stringify(await previewYoutubePlan(path.resolve(dir)), null, 2));
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
