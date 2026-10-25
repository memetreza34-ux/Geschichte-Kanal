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

export const COMPACT_PROMPT_SYSTEM = 'flow-compiler-v4-compact';

const pad = (value) => String(value).padStart(2, '0');

// One google-flow-prompt.txt with the full workflow (3 covers, choice, cast sheets, scenes in
// steps of ten, naming, final check, one folder) and short scene prompts. Headings never contain
// "Bild NN " except the scene markers, so the Phase-1 extractor and Flow see clean blocks.
export function compileFlowMasterV4({ meta, mapping, cast, policy = {}, worldLock = null }) {
  const errors = [];
  const images = mapping?.images ?? [];
  const total = images.length;
  const last = pad(total);
  const minChars = Number(policy.minPromptChars ?? 150);
  const maxChars = Number(policy.maxPromptChars ?? 600);
  const batch = Number(policy.batchSize ?? 10);
  const coverText = text(meta?.coverPolicy?.coverText);
  const reference = text(policy.channelStyleReferenceImage) || 'assets/style/kanal-stil-referenz.png';
  const exclusions = (policy.exclusions ?? []).filter((item) => !/^(text|letters)$/i.test(item));
  const members = cast?.characters ?? [];

  const scenePrompts = images.map((scene) => {
    const prompt = compileScenePromptV4(scene, { cast, policy });
    if (prompt.length < minChars || prompt.length > maxChars) {
      errors.push(`Bild ${pad(scene.imageNumber)}: Prompt hat ${prompt.length} Zeichen (erlaubt ${minChars}–${maxChars}).`);
    }
    if (/\b(BILD|IMAGE|SCENE)\s*\d/i.test(prompt)) errors.push(`Bild ${pad(scene.imageNumber)}: Prompt enthält eine Bildnummer.`);
    return prompt;
  });

  const steps = [];
  for (let start = 0; start < total; start += batch) {
    const end = Math.min(start + batch, total);
    const part = Math.floor(start / batch) + 1;
    const blocks = [];
    for (let i = start; i < end; i += 1) {
      const name = `Bild ${pad(images[i].imageNumber)}`;
      blocks.push(`${name} → speichern als „${name}.png“\nPrompt:\n${scenePrompts[i]}`);
    }
    steps.push(`── Schritt 4.${part}: Bilder ${pad(start + 1)}–${pad(end)} ──\n\n${blocks.join('\n\n')}\n\nPrüfe diese ${end - start} Bilder kurz (kein Text, richtige Figur, richtige Epoche), dann weiter.`);
  }

  const castBlocks = members.map((member) => `Figur: ${text(member.name)} → speichern als „cast-${member.id}.png“, als Ingredient @${member.name.replace(/\s+/g, '')}\nPrompt:\n${compileCastPrompt(member, { policy })}`);
  const world = text(worldLock?.settingDescription);
  const coverPrompt = [
    `YouTube thumbnail for a history video: ${text(meta?.title)}.`,
    text(meta?.coverPolicy?.coverConcept) ? sentence(meta.coverPolicy.coverConcept) : 'One strong central subject from this story, dramatic but clear composition.',
    world ? sentence(world) : '',
    `Large, correctly spelled German title text "${coverText}" in a calm, high-contrast area that does not cover the main subject.`,
    sentence(policy.shortStyleAnchor),
    `Exclude: any other text, ${exclusions.join(', ')}.`
  ].filter(Boolean).join('\n');

  const master = `ACTIVE_STYLE_ID: ${text(meta?.visualStyleId)}
PROMPT_SYSTEM: ${COMPACT_PROMPT_SYSTEM}

GOOGLE FLOW — ${text(meta?.title)}

Auftrag: ${total} Szenenbilder im Format 16:9 für ein deutsches YouTube-Geschichtsvideo, plus Cover und Figurenkarten. Arbeite die Schritte 1 bis 7 der Reihe nach ab.

VORLAGEN (als Ingredients anhängen)
- Kanal-Stil-Referenz „${reference}“: bei jedem Bild.
- Das ausgewählte Cover: ab Schritt 3 bei jedem Bild, damit die Bildwelt gleich bleibt.
- Die Figurenkarten aus Schritt 3: bei jeder Szene, in der @Name vorkommt.

REGELN FÜR ALLE BILDER
- Nur der Text unter „Prompt:“ beschreibt ein Bild. Schritte, Überschriften, Dateinamen und Nummern sind Arbeitsanweisungen und erscheinen nie im Bild.
- Kein Text, keine Buchstaben, keine Zahlen im Bild. Einzige Ausnahme ist der Cover-Text auf dem Cover.
- Jedes Bild ist ein durchgehendes Bild: kein Split-Screen, keine Panels, kein Rahmen.
- Gleicher Zeichenstil wie die Kanal-Stil-Referenz, natürliche Proportionen und ruhige, natürliche Gesichter.
- Jede Figur sieht in jedem Bild aus wie auf ihrer Figurenkarte.

SCHRITT 1 — COVER: DREI VARIANTEN
Erzeuge genau drei deutlich unterschiedliche Cover-Varianten A, B und C mit exakt dem Text „${coverText}“ und sonst keinem Text. Danach STOPP: Wähle nicht selbst aus und erzeuge noch keine Szenen, sondern warte auf meine Auswahl.
Prompt:
${coverPrompt}

SCHRITT 2 — AUSWAHL
Ich nenne die beste Variante. Lösche die beiden anderen. Speichere die gewählte als „thumbnail.png“, nicht im Ordner images. Das Cover ist das YouTube-Thumbnail und erscheint nicht im Video.

SCHRITT 3 — FIGURENKARTEN
Erzeuge für jede Figur eine Figurenkarte im Stil des gewählten Covers und lege sie als Ingredient mit dem angegebenen @Namen an.

${castBlocks.join('\n\n')}

SCHRITT 4 — SZENENBILDER IN 10ER-SCHRITTEN
Nimm das gewählte Cover und die Kanal-Stil-Referenz als Vorlage für dieselbe Bildwelt. Erzeuge immer 10 Bilder, prüfe sie kurz und mache dann mit den nächsten 10 weiter. Erzeuge jedes Bild genau einmal.

${steps.join('\n\n')}

SCHRITT 5 — UMBENENNEN
Alle Szenenbilder heißen exakt „Bild 01.png“ bis „Bild ${last}.png“: zweistellig, mit Leerzeichen, ohne Zusätze. Namen wie „image_1.png“ oder „Bild 1.png“ korrigieren.

SCHRITT 6 — ALLES NOCHMAL PRÜFEN
Gehe alle ${total} Bilder noch einmal durch: Fehlt ein Bild? Ist Text, eine Zahl oder Pseudo-Schrift zu sehen? Stimmt die Figur? Stimmt die Epoche? Gibt es einen Split-Screen oder Rahmen? Fehlende oder fehlerhafte Bilder neu erzeugen und mir die Liste nennen.

SCHRITT 7 — EIN ORDNER
Lege alle ${total} Szenenbilder zusammen in den Ordner „images“. Das Thumbnail und die Figurenkarten liegen nicht in images.
`;
  return { passed: errors.length === 0, errors, prompt: master };
}
