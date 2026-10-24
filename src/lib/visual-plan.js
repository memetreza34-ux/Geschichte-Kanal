import { normalizeText } from './pipeline.js';

// Visual Plan V4: measurable sequence rules plus one short, self-contained
// Flow prompt per scene. Findings: channel/23-ANALYSE-LONDON-OSTSEE.md.

function text(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function sentence(value) {
  const clean = text(value);
  if (!clean) return '';
  const capitalized = clean[0].toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function wordCount(value) {
  return text(value).split(' ').filter(Boolean).length;
}

function mentions(haystack, name) {
  const needle = normalizeText(name);
  return Boolean(needle) && ` ${normalizeText(haystack)} `.includes(` ${needle} `);
}

// Only what is drawn counts: a person named in the narration may stay deliberately off-screen.
function sceneText(scene) {
  return ['visualConcept', 'dominantSubject', 'actionState', 'composition', 'subjectAction']
    .map((key) => text(scene?.[key])).join(' ');
}

export function validateCastBible(cast, policy = {}) {
  const errors = [];
  if (!cast || typeof cast !== 'object' || Array.isArray(cast)) return { passed: false, errors: ['CAST_BIBLE.json ist ungültig.'] };
  if (cast.status !== 'READY') errors.push('CAST_BIBLE.status muss READY sein.');
  const members = Array.isArray(cast.characters) ? cast.characters : [];
  const max = Number(policy.maxCastMembers ?? 5);
  if (members.length > max) errors.push(`Höchstens ${max} Hauptfiguren; mehr Figuren lassen die Konsistenz zusammenbrechen.`);
  const [minWords, maxWords] = policy.castIdentityWords ?? [12, 45];
  const ids = new Set();
  for (const member of members) {
    const label = member?.id || member?.name || '?';
    if (!/^[a-z0-9-]+$/.test(String(member?.id ?? ''))) errors.push(`Figur ${label}: id nur aus a-z, 0-9 und Bindestrich.`);
    if (ids.has(member?.id)) errors.push(`Figur ${label}: doppelte id.`);
    ids.add(member?.id);
    if (!text(member?.name)) errors.push(`Figur ${label}: name fehlt.`);
    const words = wordCount(member?.identity);
    if (words < minWords || words > maxWords) errors.push(`Figur ${label}: identity braucht ${minWords}–${maxWords} Wörter (aktuell ${words}).`);
    if (!/\.png$/i.test(text(member?.referenceImage))) errors.push(`Figur ${label}: referenceImage (.png) fehlt.`);
    const [minTag, maxTag] = policy.castTagWords ?? [2, 8];
    const tagWords = wordCount(member?.tag);
    if (tagWords < minTag || tagWords > maxTag) errors.push(`Figur ${label}: tag (Kurzmerkmale für Szenenprompts) braucht ${minTag}–${maxTag} Wörter (aktuell ${tagWords}).`);
  }
  const wardrobe = Array.isArray(cast.eraWardrobe) ? cast.eraWardrobe.map(text).filter(Boolean) : [];
  const minWardrobe = Number(policy.minEraWardrobeItems ?? 3);
  if (wardrobe.length < minWardrobe) errors.push(`eraWardrobe braucht mindestens ${minWardrobe} konkrete Kleidungsmerkmale der Epoche.`);
  if (!Array.isArray(cast.eraForbidden)) errors.push('eraForbidden fehlt (z. B. Kleidung einer falschen Epoche).');
  const eraTagWords = wordCount(cast.eraTag);
  if (eraTagWords < 2 || eraTagWords > 8) errors.push('eraTag braucht 2–8 Wörter, z. B. „1910s Boston working-class clothing“.');
  return { passed: errors.length === 0, errors };
}

export function validateVisualPlan({ mapping, cast, policy = {} }) {
  const errors = [];
  const images = Array.isArray(mapping?.images) ? mapping.images : [];
  if (!images.length) return { passed: false, errors: ['Bildplan enthält keine Bilder.'] };
  const members = Array.isArray(cast?.characters) ? cast.characters : [];
  const castIds = new Set(members.map((member) => member.id));
  const count = images.length;

  const maxRun = Number(policy.maxSameLocationScaleRun ?? 2);
  let run = 0;
  images.forEach((scene, index) => {
    const label = `Bild ${scene.imageNumber ?? index + 1}`;
    const location = text(scene.locationKey);
    if (!/^[a-z0-9-]+$/.test(location)) errors.push(`${label}: locationKey fehlt oder ist kein kebab-case.`);
    const previous = images[index - 1];
    const same = previous && location && location === text(previous.locationKey) && text(scene.shotScale) === text(previous.shotScale);
    run = same ? run + 1 : 1;
    if (run === maxRun + 1) errors.push(`${label}: ${run}× derselbe Ort mit gleicher Einstellungsgröße hintereinander (max. ${maxRun}). Kamera wechseln.`);

    const concept = text(scene.visualConcept);
    if (concept && concept === text(scene.actionState) && concept === text(scene.viewerTakeaway)) {
      errors.push(`${label}: visualConcept, actionState und viewerTakeaway sind wortgleich (Schablonen-Card).`);
    }

    const ids = Array.isArray(scene.castIds) ? scene.castIds : [];
    for (const id of ids) if (!castIds.has(id)) errors.push(`${label}: castId „${id}“ steht nicht in CAST_BIBLE.json.`);
    for (const member of members) {
      if (!ids.includes(member.id) && mentions(sceneText(scene), member.name)) {
        errors.push(`${label}: ${member.name} wird genannt, fehlt aber in castIds.`);
      }
    }

    const splitForm = (policy.splitScreenForms ?? []).includes(text(scene.visualForm));
    const lowered = ` ${text([scene.visualConcept, scene.composition, scene.subjectAction].join(' ')).toLowerCase()} `;
    const term = (policy.splitScreenTerms ?? []).find((word) => lowered.includes(` ${word.toLowerCase()} `));
    if ((splitForm || term) && scene.splitScreenApproved !== true) {
      errors.push(`${label}: Split-Screen/Bild-im-Bild (${term ? `„${term}“` : scene.visualForm}) nur mit splitScreenApproved=true.`);
    }
  });

  const tally = (key) => images.reduce((map, scene) => map.set(text(scene[key]), (map.get(text(scene[key])) ?? 0) + 1), new Map());
  // Shares only bite on real videos; tiny test plans keep a small absolute allowance.
  const allowed = (share, floor) => Math.max(floor, Math.floor(share * count));
  const maxLocation = Number(policy.maxLocationShare ?? 0.2);
  for (const [location, n] of tally('locationKey')) {
    if (location && n > allowed(maxLocation, 2)) errors.push(`Ort „${location}“ kommt in ${n} von ${count} Bildern vor (max. ${Math.round(maxLocation * 100)} %).`);
  }
  const maps = images.filter((scene) => text(scene.visualForm) === 'map-geography').length;
  const maxMap = Number(policy.maxMapShare ?? 0.12);
  if (maps > allowed(maxMap, 1)) errors.push(`${maps} von ${count} Bildern sind Karten (max. ${Math.round(maxMap * 100)} %).`);
  const maxComposition = Number(policy.maxIdenticalCompositionShare ?? 0.25);
  for (const [composition, n] of tally('composition')) {
    if (composition && n > allowed(maxComposition, 2)) errors.push(`${n} von ${count} Bildern haben denselben composition-Text (Schablone).`);
  }
  return { passed: errors.length === 0, errors };
}

export function compileScenePromptV4(scene, { cast = null, policy = {} } = {}) {
  const members = Array.isArray(cast?.characters) ? cast.characters : [];
  const ids = Array.isArray(scene.castIds) ? scene.castIds : [];
  // Compact format: the Flow ingredients (style reference, cast sheets) carry look and identity,
  // the text carries only what makes this scene unique.
  const people = members.filter((member) => ids.includes(member.id))
    .map((member) => `@${member.name.replace(/\s+/g, '')} (${text(member.tag)})`);
  // Present-day epilogue scenes (modernScene=true) must not get the historical era lock.
  const eraLocked = scene.modernScene !== true;
  const anonymousPeople = ids.length === 0 && text(scene.visualForm) === 'character-scene';
  const era = eraLocked && anonymousPeople && text(cast?.eraTag) ? `People in ${text(cast.eraTag)}.` : '';
  const eraForbidden = eraLocked && Array.isArray(cast?.eraForbidden)
    ? cast.eraForbidden.slice(0, Number(policy.maxEraExclusions ?? 3))
    : [];
  const exclusions = [...new Set([...(policy.exclusions ?? []), ...eraForbidden].map(text).filter(Boolean))];
  const light = text(scene.lightingMood).replace(/[.!?]$/, '');
  const where = text(scene.placeTime || scene.timeContext).replace(/[.!?]$/, '');

  return [
    sentence(scene.subjectAction || scene.visualConcept),
    sentence([where, light ? light[0].toLowerCase() + light.slice(1) : ''].filter(Boolean).join(', ')),
    sentence(scene.camera),
    people.length ? `${people.join(', ')}.` : '',
    era,
    [sentence(policy.shortStyleAnchor), exclusions.length ? `Exclude: ${exclusions.join(', ')}.` : ''].filter(Boolean).join(' ')
  ].filter(Boolean).join('\n');
}

export function compileCastPrompt(member, { policy = {} } = {}) {
  return [
    `Character reference sheet of ${text(member.name)}: front view and three-quarter view side by side, full body, neutral standing pose.`,
    sentence(member.identity),
    'Plain light paper background, even soft light.',
    sentence(policy.castStyleAnchor || policy.shortStyleAnchor),
    'Exclude: text, letters, numbers, captions, labels, watermark, photorealism, 3D render.'
  ].filter(Boolean).join('\n');
}

export function compileFlowPromptFiles({ mapping, cast, policy = {} }) {
  const errors = [];
  const files = [];
  const minChars = Number(policy.minPromptChars ?? 150);
  const maxChars = Number(policy.maxPromptChars ?? 600);
  for (const scene of mapping?.images ?? []) {
    const number = String(scene.imageNumber).padStart(2, '0');
    const prompt = compileScenePromptV4(scene, { cast, policy });
    if (prompt.length < minChars || prompt.length > maxChars) {
      errors.push(`Bild ${number}: Prompt hat ${prompt.length} Zeichen (erlaubt ${minChars}–${maxChars}).`);
    }
    if (/\b(BILD|IMAGE|SCENE)\s*\d/i.test(prompt)) errors.push(`Bild ${number}: Prompt enthält eine Bildnummer.`);
    files.push({ name: `Bild ${number}.txt`, content: `${prompt}\n` });
  }
  for (const member of cast?.characters ?? []) {
    files.push({ name: `CAST_${member.id}.txt`, content: `${compileCastPrompt(member, { policy })}\n` });
  }
  return { passed: errors.length === 0, errors, files };
}
