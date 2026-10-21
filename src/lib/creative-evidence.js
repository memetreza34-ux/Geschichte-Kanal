import { readFile } from 'node:fs/promises';
import { projectPaths, readJson, sha256 } from './pipeline.js';
import { fingerprint } from './production-integrity.js';
import { validateFigureDirection } from './figure-direction.js';

const filled = value => typeof value === 'string' && value.trim().length >= 12 && !/\[[^\]]+\]|\bTODO\b|\bTBD\b|PLACEHOLDER|UNSET/i.test(value);
const list = value => Array.isArray(value) ? value : [];
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export const usesCreativeEvidence = meta => Number(meta?.creativeEvidenceVersion ?? 0) >= 1;

export function plannedScenes(mapping) {
  return list(mapping?.images).map(scene => {
    const { actualStartSeconds, actualEndSeconds, alignmentConfidence, ...planned } = scene;
    return planned;
  });
}

export function creativePlanFingerprint({ scriptSha256, mapping, research, worldLock }) {
  return fingerprint({ scriptSha256, scenes: plannedScenes(mapping), research, worldLock });
}

export async function creativeInputs(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const [meta, mapping, research, review, worldLock, script, scriptSha256] = await Promise.all([
    readJson(p.meta), readJson(p.mapping), readJson(p.researchEvidence, null), readJson(p.creativeReview, null),
    readJson(p.flowWorldLock), readFile(p.script, 'utf8'), sha256(p.script)
  ]);
  return { meta, mapping, research, review, worldLock, script, scriptSha256 };
}

export function validateCreativeEvidence(input) {
  const { meta, mapping, research, review, worldLock, script, scriptSha256 } = input;
  const errors = [];
  if (Number(meta?.figureDirectionVersion ?? 0) >= 1) {
    for (const scene of list(mapping?.images)) errors.push(...validateFigureDirection(scene));
  }
  if (!usesCreativeEvidence(meta)) {
    if (Number(meta?.schemaVersion) >= 5) errors.push('Schema 5 benötigt creativeEvidenceVersion=1.');
    return { passed: errors.length === 0, errors };
  }
  const sources = list(research?.sources);
  const claims = list(research?.claims);
  const references = list(research?.visualReferences);
  if (!sources.length || !claims.length) errors.push('RESEARCH_EVIDENCE.json braucht überprüfbare Quellen und historische Aussagen.');
  const uniqueIds = (entries, label) => {
    const ids = entries.map(item => item.id);
    if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) errors.push(`${label}: IDs fehlen oder sind doppelt.`);
    return new Set(ids);
  };
  const sourceIds = uniqueIds(sources, 'Quellen');
  const claimIds = uniqueIds(claims, 'Aussagen');
  const referenceIds = uniqueIds(references, 'Bildreferenzen');
  for (const source of sources) {
    try {
      const url = new URL(source.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
    } catch { errors.push(`Quelle ${source.id}: gültige HTTP(S)-URL fehlt.`); }
    if (!filled(source.title) || !filled(source.locator)) errors.push(`Quelle ${source.id}: Titel und konkrete Fundstelle fehlen.`);
  }
  for (const claim of claims) {
    if (!filled(claim.statement) || !filled(claim.evidence)) errors.push(`Aussage ${claim.id}: Aussage oder Quellenbeleg fehlt.`);
    if (!['supported', 'interpretation', 'uncertain'].includes(claim.certainty)) errors.push(`Aussage ${claim.id}: Sicherheit fehlt.`);
    if (!list(claim.sourceIds).length || claim.sourceIds.some(id => !sourceIds.has(id))) errors.push(`Aussage ${claim.id}: Quellenverknüpfung ungültig.`);
    if (claim.certainty !== 'supported' && !filled(claim.scriptQualification)) errors.push(`Aussage ${claim.id}: Unsicherheit muss im Skript kenntlich sein.`);
    if (filled(claim.scriptQualification) && !script.includes(claim.scriptQualification)) errors.push(`Aussage ${claim.id}: angegebene Einschränkung fehlt im Skript.`);
  }
  for (const reference of references) {
    if (!sourceIds.has(reference.sourceId) || !filled(reference.description)) errors.push(`Bildreferenz ${reference.id}: Quelle oder Beschreibung fehlt.`);
    if (!list(reference.mustShow).some(filled) || !list(reference.mustAvoid).some(filled)) errors.push(`Bildreferenz ${reference.id}: konkrete Muss-/Ausschlussmerkmale fehlen.`);
  }

  const scriptReview = review?.script;
  const checkReview = (entry, label) => {
    if (entry?.status !== 'APPROVED' || !entry.reviewer?.trim() || !date(entry.reviewedAt) || !list(entry.observations).some(filled)) errors.push(`${label}: echte Prüfung mit Person/Modell, Zeitpunkt und konkretem Befund fehlt.`);
  };
  checkReview(scriptReview, 'Skriptprüfung');
  if (scriptReview?.scriptSha256 !== scriptSha256 || scriptReview?.researchFingerprint !== fingerprint(research)) errors.push('Skriptprüfung gehört nicht zum aktuellen Skript/Quellenstand.');
  if (!filled(scriptReview?.centralQuestion) || !filled(scriptReview?.endingAnswer) || scriptReview?.readAloudReviewed !== true) errors.push('Skriptprüfung: Leitfrage, Schlussantwort und Sprachflussprüfung sind Pflicht.');
  const causalLinks = list(scriptReview?.causalLinks);
  if (!causalLinks.length) errors.push('Skriptprüfung: mindestens eine konkrete Ursache-Entscheidung-Folge-Verbindung fehlt.');
  for (const link of causalLinks) {
    if (![link.cause, link.decision, link.consequence, link.scriptEvidence].every(filled) || !script.includes(link.scriptEvidence)) errors.push('Skriptprüfung: Kausalkette braucht konkrete Ursache, Entscheidung, Folge und exakten Skriptausschnitt.');
  }
  if (!date(mapping?.planningStartedAt) || !date(scriptReview?.reviewedAt) || Date.parse(mapping.planningStartedAt) < Date.parse(scriptReview.reviewedAt)) errors.push('Szenenplanung muss nach der dokumentierten Skriptprüfung beginnen.');

  const entities = list(worldLock?.entities);
  const entityIds = uniqueIds(entities, 'Kontinuitätsobjekte');
  const states = new Map();
  for (const entity of entities) {
    if (!filled(entity.identity) || !filled(entity.initialState)) errors.push(`Kontinuitätsobjekt ${entity.id}: Identität/Anfangszustand fehlt.`);
    states.set(entity.id, entity.initialState);
  }
  const functions = new Set(['orientation', 'cause', 'decision', 'action', 'reaction', 'consequence', 'evidence', 'payoff']);
  for (const scene of list(mapping?.images)) {
    const label = `Bild ${scene.imageNumber}`;
    if (!scene.sequenceId?.trim() || !functions.has(scene.beatFunction) || !filled(scene.knowledgeChange) || !filled(scene.visibleEvidence)) errors.push(`${label}: Sequenz, Erzählfunktion, Erkenntnisgewinn oder sichtbarer Beleg fehlt.`);
    if (!list(scene.claimIds).length || scene.claimIds.some(id => !claimIds.has(id))) errors.push(`${label}: historische Aussagen sind nicht belegt.`);
    if (!list(scene.visualReferenceIds).length || scene.visualReferenceIds.some(id => !referenceIds.has(id))) errors.push(`${label}: historische Bildreferenz fehlt.`);
    const focus = scene.focusPoint;
    if (!focus || [focus.x, focus.y].some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) errors.push(`${label}: focusPoint muss normierte x/y-Koordinaten enthalten.`);
    if (scene.visibleTextPolicy !== 'NO_VISIBLE_TEXT') errors.push(`${label}: Beschriftungen im Renderer über overlays planen; das generierte Bild bleibt textfrei.`);
    for (const change of list(scene.continuity)) {
      if (!entityIds.has(change.entityId)) errors.push(`${label}: unbekanntes Kontinuitätsobjekt ${change.entityId}.`);
      if (states.get(change.entityId) !== change.fromState || !filled(change.toState)) errors.push(`${label}: Zustand von ${change.entityId} springt zurück oder ist nicht belegt.`);
      states.set(change.entityId, change.toState);
    }
    errors.push(...validateOverlays(scene.overlays).map(error => `${label}: ${error}`));
  }
  const sequence = review?.sequence;
  checkReview(sequence, 'Sequenzprüfung');
  const planFingerprint = creativePlanFingerprint(input);
  if (sequence?.planFingerprint !== planFingerprint) errors.push('Sequenzprüfung ist nach Änderung von Skript, Scene Cards, Bildwelt oder Recherche veraltet.');
  if (sequence?.openingMatchesPromise !== true || sequence?.endingAnswersQuestion !== true || sequence?.continuityReviewed !== true) errors.push('Sequenzprüfung: Einstiegsversprechen, Schlussantwort und Zustandskontinuität prüfen.');
  return { passed: errors.length === 0, errors, planFingerprint };
}

export function validateOverlays(overlays = []) {
  if (!Array.isArray(overlays) || overlays.length > 4) return ['höchstens vier gezielte Overlays pro Szene erlaubt.'];
  const errors = [];
  const point = value => value && [value.x, value.y].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0.03 && n <= 0.97);
  for (const overlay of overlays) {
    if (!filled(overlay.purpose)) errors.push('Overlay braucht einen konkreten Orientierungszweck.');
    if (overlay.type === 'label') {
      if (!point(overlay) || typeof overlay.text !== 'string' || !overlay.text.trim() || overlay.text.length > 45 || /\b(?:BILD|IMAGE|SCENE)\s*\d*\b/i.test(overlay.text)) errors.push('Overlay-Beschriftung ist ungültig oder enthält interne Metadaten.');
    } else if (overlay.type === 'route') {
      if (!Array.isArray(overlay.points) || overlay.points.length < 2 || overlay.points.length > 12 || !overlay.points.every(point)) errors.push('Route braucht 2–12 gültige normierte Punkte.');
    } else errors.push('Overlay-Typ muss label oder route sein.');
  }
  return errors;
}

export async function validateCreativeProject(projectDirectory) {
  const p = projectPaths(projectDirectory);
  const meta = await readJson(p.meta);
  if (!usesCreativeEvidence(meta) && Number(meta.schemaVersion) < 5) return { passed: true, errors: [] };
  return validateCreativeEvidence(await creativeInputs(projectDirectory));
}

export async function validateCreativeImageReview(projectDirectory, qc) {
  const input = await creativeInputs(projectDirectory);
  const result = validateCreativeEvidence(input);
  const errors = [...result.errors];
  if (!qc.reviewer?.trim() || !date(qc.reviewedAt)) errors.push('Bildprüfung: Reviewer und Prüfzeitpunkt fehlen.');
  if (qc.planFingerprint !== result.planFingerprint) errors.push('Bildprüfung gehört nicht zum aktuellen Szenen-/Quellenstand.');
  for (const entry of list(qc.images)) {
    for (const field of ['narrationEvidence', 'continuityEvidence', 'historicalEvidence', 'textEvidence']) {
      if (!filled(entry[field])) errors.push(`Bild ${entry.imageNumber}: konkreter Sichtbefund ${field} fehlt.`);
    }
  }
  return { passed: errors.length === 0, errors };
}
