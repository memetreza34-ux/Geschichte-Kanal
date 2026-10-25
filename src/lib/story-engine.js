import { normalizeText } from './pipeline.js';

// Story Engine V4: every claim in STORY_BLUEPRINT.json must be visible in the
// actual voice-over text. Self-assigned scores are not accepted as evidence.

function filled(value, min = 1) {
  return typeof value === 'string' && value.trim().length >= min;
}

function paragraphs(script) {
  return String(script ?? '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function words(script) {
  return normalizeText(script).split(' ').filter(Boolean);
}

function indexOfQuote(normalizedScript, quote) {
  const needle = normalizeText(quote);
  if (!needle) return -1;
  return ` ${normalizedScript} `.indexOf(` ${needle} `);
}

function wordPosition(normalizedScript, charIndex) {
  if (charIndex <= 0) return 0;
  return normalizedScript.slice(0, charIndex).split(' ').filter(Boolean).length;
}

export function lintScript(script, policy = {}) {
  const errors = [];
  const text = String(script ?? '').trim();
  if (!text) return { passed: false, errors: ['Skript ist leer.'] };
  const normalized = normalizeText(text);
  const opening = words(text).slice(0, Number(policy.openingDateWindowWords ?? 6));
  const dateWords = new Set((policy.openingDateWords ?? []).map((word) => normalizeText(word)));

  if (opening.some((word) => dateWords.has(word) || /^\d{3,4}$/.test(word))) {
    errors.push('Cold Open: Das Skript beginnt mit einem Datum. Starte mitten in einer Szene mit Mensch, Ort und Problem.');
  }
  for (const phrase of policy.forbiddenOpeningPhrases ?? []) {
    if (normalized.startsWith(normalizeText(phrase))) errors.push(`Cold Open: verbotener Einstieg „${phrase}“.`);
  }
  for (const phrase of policy.forbiddenLecturePhrases ?? []) {
    if (indexOfQuote(normalized, phrase) >= 0) errors.push(`Lexikon-Formel gefunden: „${phrase}“. Zeigen statt erklären.`);
  }

  const last = paragraphs(text).at(-1) ?? '';
  const maxCommas = Number(policy.maximumListCommasInLastParagraph ?? 3);
  const longestList = Math.max(0, ...last.split(/[.!?:]/).map((part) => (part.match(/,/g) ?? []).length));
  if (longestList > maxCommas) {
    errors.push(`Schluss: Aufzählung mit ${longestList} Kommas im letzten Absatz. Ein Bild statt einer Ursachenliste.`);
  }
  return { passed: errors.length === 0, errors };
}

export function validateStoryBlueprint(blueprint, script, policy = {}) {
  const errors = [];
  if (!blueprint || typeof blueprint !== 'object' || Array.isArray(blueprint)) {
    return { passed: false, errors: ['STORY_BLUEPRINT.json ist ungültig.'] };
  }
  if (blueprint.status !== 'APPROVED') errors.push('STORY_BLUEPRINT.status muss APPROVED sein.');

  const text = String(script ?? '');
  const normalized = normalizeText(text);
  const totalWords = words(text).length;
  const hookWindow = Number(policy.hookWindowWords ?? 120);
  const position = (quote) => {
    const index = indexOfQuote(normalized, quote);
    return index < 0 ? -1 : wordPosition(normalized, index);
  };
  const requireQuote = (label, quote) => {
    if (!filled(quote, 3)) {
      errors.push(`${label} fehlt.`);
      return -1;
    }
    const at = position(quote);
    if (at < 0) errors.push(`${label} steht nicht wörtlich im Skript: „${quote}“.`);
    return at;
  };

  const firstWords = blueprint.coldOpen?.firstWords;
  if (!filled(firstWords, 3)) errors.push('coldOpen.firstWords fehlt.');
  else if (!normalized.startsWith(normalizeText(firstWords))) errors.push('Das Skript beginnt nicht mit coldOpen.firstWords.');
  if (!filled(blueprint.coldOpen?.scene, 15)) errors.push('coldOpen.scene braucht eine konkrete Szenenbeschreibung (Mensch, Ort, Problem).');

  if (!String(blueprint.centralQuestion ?? '').trim().endsWith('?')) errors.push('centralQuestion muss eine Frage mit „?“ sein.');
  const questionAt = requireQuote('centralQuestion', blueprint.centralQuestion);
  if (questionAt > hookWindow) errors.push(`centralQuestion kommt erst bei Wort ${questionAt}; spätestens bei Wort ${hookWindow}.`);

  if (policy.guideCharacterRequired !== false) {
    const name = blueprint.guideCharacter?.name;
    if (!filled(name, 2)) {
      errors.push('guideCharacter.name fehlt (reale Person oder klar beschriebene Gruppe).');
    } else {
      const needle = normalizeText(name);
      const hits = [];
      let from = 0;
      const haystack = ` ${normalized} `;
      for (;;) {
        const index = haystack.indexOf(` ${needle} `, from);
        if (index < 0) break;
        hits.push(wordPosition(normalized, index) / Math.max(1, totalWords));
        from = index + needle.length;
      }
      const thirds = new Set(hits.map((share) => Math.min(2, Math.floor(share * 3))));
      if (thirds.size < 3) errors.push(`Führungsfigur „${name}“ muss im ersten, mittleren und letzten Drittel vorkommen.`);
    }
  }

  const loops = Array.isArray(blueprint.openLoops) ? blueprint.openLoops : [];
  const minLoops = Number(policy.minimumOpenLoops ?? 3);
  if (loops.length < minLoops) errors.push(`Mindestens ${minLoops} offene Schleifen erforderlich.`);
  loops.forEach((loop, index) => {
    const setup = requireQuote(`openLoops[${index}].setupQuote`, loop?.setupQuote);
    const payoff = requireQuote(`openLoops[${index}].payoffQuote`, loop?.payoffQuote);
    if (setup >= 0 && payoff >= 0 && payoff <= setup) errors.push(`openLoops[${index}]: Die Auflösung muss nach dem Aufbau kommen.`);
  });

  const details = Array.isArray(blueprint.vividDetails) ? blueprint.vividDetails : [];
  const minDetails = Number(policy.minimumVividDetails ?? 5);
  if (details.length < minDetails) errors.push(`Mindestens ${minDetails} konkrete Details erforderlich.`);
  details.forEach((detail, index) => {
    requireQuote(`vividDetails[${index}].quote`, detail?.quote);
    if (!filled(detail?.source, 4)) errors.push(`vividDetails[${index}].source fehlt.`);
  });

  if (policy.eyewitnessRequired !== false) {
    requireQuote('eyewitness.quote', blueprint.eyewitness?.quote);
    if (!filled(blueprint.eyewitness?.source, 4)) errors.push('eyewitness.source fehlt.');
  }

  const callback = blueprint.endingCallback?.quote;
  const callbackAt = requireQuote('endingCallback.quote', callback);
  if (callbackAt >= 0) {
    const last = normalizeText(paragraphs(text).at(-1) ?? '');
    if (indexOfQuote(last, callback) < 0) errors.push('endingCallback.quote muss im letzten Absatz stehen.');
    if (callbackAt > hookWindow) errors.push('endingCallback.quote muss schon im Cold Open vorkommen (Rückgriff auf den Anfang).');
  }

  errors.push(...lintScript(text, policy).errors);
  return { passed: errors.length === 0, errors };
}
