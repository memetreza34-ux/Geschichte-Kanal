import { buildHardTextInstruction, buildVisualInterestPromptParts } from './visual-interest.js';
import { buildFigureDirectionPrompt } from './figure-direction.js';

const REQUIRED_SCENE_FIELDS = [
  'viewerTakeaway',
  'visualPurpose',
  'topicAnchor',
  'visualForm',
  'visualConcept',
  'dominantSubject',
  'actionState',
  'composition',
  'camera',
  'depthPlan',
  'lightingMood',
  'continuityNote',
  'historicalAccuracyNote'
];

const VISUAL_FORM_GUARDS = {
  comparison: 'Keep both comparison poles visible in the same frame and clearly opposed through space, scale, state or placement.',
  'cause-effect': 'Make the cause and its consequence visibly connected in one readable composition instead of showing only one side of the relationship.',
  'process-sequence': 'Make the changed state immediately readable and preserve the established place and near-same viewpoint when continuity improves the comparison.',
  'system-hierarchy': 'Express the hierarchy through physical height, distance, routes, grouping or spatial relationships; do not use corporate arrows or diagram boxes.',
  'battle-city-overview': 'Keep the spatial situation as the main idea; use the overview to show positions, routes, barriers or encirclement rather than turning it into a character close-up.',
  'object-focus': 'Let the main object carry the statement through scale, state and context; keep the background quiet and secondary.',
  'character-scene': 'Use believable mature editorial human anatomy, restrained faces, natural eye size, physically coherent hands and purposeful plausible gestures. Avoid exaggerated comic acting, repeated officer faces, stiff pointing and impossible grips. Let posture, action, gaze or relationship between people communicate the point. Make prominent unrelated characters visibly individual in face, hair, clothing silhouette, build or posture instead of cloning one generic figure. Avoid a static front-facing talking-head setup when an action, reaction, spatial problem or object interaction can carry the beat more strongly.',
  'multi-moment-illustration': 'Show only two or three tightly connected story moments that all explain one viewer takeaway. Integrate them through a clear left-to-right flow, foreground-to-background progression or another readable spatial relationship. Keep one moment dominant or make the reading order unmistakable. Do not create a dense collage, a grid of tiny panels or unrelated mini-scenes.',
  'detail-inset': 'Keep one main historical scene or object dominant and add only one clearly subordinate enlarged detail inset that reveals exactly the feature discussed by the narration. Do not add labels unless the Scene Card explicitly approves one exact editorial text element.',
  'cutaway-section': 'Use a clean cutaway or sectional view only to reveal otherwise hidden spatial structure. Keep the outside context readable and the exposed interior simple enough to understand without a dense modern infographic. Any visible label must be the exact approved editorial text from the Scene Card.',
  'evidence-reconstruction': 'Connect one historical source object, ruin, coin, document fragment or archaeological trace to one stylized reconstruction of what it helps us understand. Make the evidence-to-reconstruction relationship visually obvious without pretending uncertain details are certain. Use visible text only when exactly approved in the Scene Card.'
};

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sentence(value) {
  const clean = text(value).replace(/\s+/g, ' ');
  if (!clean) return '';
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

function listSentence(items, fallback = '') {
  if (!Array.isArray(items) || !items.length) return fallback;
  const clean = items.map((item) => text(item)).filter(Boolean);
  if (!clean.length) return fallback;
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean.at(-1)}`;
}

function containsPlaceholder(value) {
  return /\[[^\]]+\]|TODO|TBD|PLACEHOLDER|UNSET/i.test(String(value ?? ''));
}

export function validateStyleLock(styleLock, expectedStyleId) {
  if (!styleLock || typeof styleLock !== 'object') throw new Error('Flow Style Lock fehlt.');
  if (styleLock.status !== 'READY') throw new Error('Flow Style Lock ist nicht READY.');
  if (!text(styleLock.styleId)) throw new Error('Flow Style Lock enthält keine styleId.');
  if (expectedStyleId && styleLock.styleId !== expectedStyleId) {
    throw new Error(`Flow Style Lock styleId ${styleLock.styleId} passt nicht zu ${expectedStyleId}.`);
  }
  if (!text(styleLock.masterStylePrompt) || !text(styleLock.sceneStyleAnchor) || !text(styleLock.globalNegativePrompt)) {
    throw new Error('Flow Style Lock ist unvollständig: masterStylePrompt, sceneStyleAnchor und globalNegativePrompt sind Pflicht.');
  }
}

export function buildWorldLockText(worldLock) {
  if (!worldLock || typeof worldLock !== 'object') throw new Error('FLOW_WORLD_LOCK.json fehlt oder ist ungültig.');
  if (worldLock.status !== 'READY') throw new Error('FLOW_WORLD_LOCK.json muss vor dem Prompt-Build auf READY stehen.');

  const settingName = text(worldLock.settingName);
  const settingDescription = text(worldLock.settingDescription);
  const timeWeatherLogic = text(worldLock.timeWeatherLogic);
  if (!settingName || !settingDescription || containsPlaceholder(settingName) || containsPlaceholder(settingDescription)) {
    throw new Error('FLOW_WORLD_LOCK.json braucht settingName und settingDescription ohne Platzhalter.');
  }

  const parts = [
    `Keep one consistent interpretation of ${settingName} throughout this video.`,
    sentence(settingDescription)
  ];

  const places = listSentence(worldLock.recurringPlaces);
  if (places) parts.push(`Recurring places must remain visually identical in silhouette, layout and defining features: ${places}.`);

  const characters = listSentence(worldLock.recurringCharacters);
  if (characters) parts.push(`Recurring characters must keep the same individual face construction, hair, build, clothing and identifying props: ${characters}.`);

  const props = listSentence(worldLock.recurringProps);
  if (props) parts.push(`Recurring props must keep the same design and base colors: ${props}.`);

  const palette = listSentence(worldLock.basePalette);
  if (palette) parts.push(`Use this video-world palette as the local color bias while staying inside the channel palette: ${palette}.`);

  if (timeWeatherLogic) parts.push(sentence(`Time and weather continuity: ${timeWeatherLogic}`));

  const rules = Array.isArray(worldLock.continuityRules)
    ? worldLock.continuityRules.map((item) => sentence(item)).filter(Boolean)
    : [];
  parts.push(...rules);

  return parts.filter(Boolean).join(' ');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findHighRiskPromptWords(scene, styleLock) {
  const haystack = [...REQUIRED_SCENE_FIELDS.map((field) => text(scene?.[field])), ...Object.values(scene?.figureDirection ?? {}).map(text)].join(' ').toLowerCase();
  const words = Array.isArray(styleLock?.highRiskPromptWords) ? styleLock.highRiskPromptWords : [];

  return words.filter((word) => {
    const needle = String(word ?? '').trim().toLowerCase();
    if (!needle) return false;
    const escaped = escapeRegex(needle).replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, 'i');
    return pattern.test(haystack);
  });
}

export function compileScenePrompt(scene, { styleLock, coverText = '', isCover = false, creativeEvidence = false, references = [] } = {}) {
  validateStyleLock(styleLock, styleLock?.styleId);
  for (const field of REQUIRED_SCENE_FIELDS) {
    if (!text(scene?.[field]) || containsPlaceholder(scene[field])) {
      throw new Error(`${field} fehlt oder enthält einen Platzhalter bei Bild ${scene?.imageNumber ?? '?'}.`);
    }
  }

  const supporting = Array.isArray(scene.supportingElements)
    ? scene.supportingElements.map((item) => text(item)).filter(Boolean)
    : [];
  if (supporting.length > 3) throw new Error(`Bild ${scene.imageNumber ?? '?'} hat mehr als drei Supporting Elements.`);

  const score = Number(scene.promptQcScore);
  if (!Number.isFinite(score) || score < 8 || score > 10) {
    throw new Error(`Bild ${scene.imageNumber ?? '?'} braucht promptQcScore 8–10 vor dem Build.`);
  }

  const risky = findHighRiskPromptWords(scene, styleLock);
  if (risky.length) {
    throw new Error(`Bild ${scene.imageNumber ?? '?'} enthält Style-Drift-Risikowörter: ${risky.join(', ')}. Formuliere konkret statt mit generischen Stilwörtern.`);
  }

  const parts = [
    sentence(styleLock.sceneStyleAnchor),
    sentence(scene.visualConcept),
    sentence(`Make ${scene.dominantSubject} the unmistakable dominant subject; ${scene.actionState}`),
    sentence(scene.composition),
    sentence(`Use ${scene.camera}`),
    ...(creativeEvidence ? [] : buildVisualInterestPromptParts(scene).map((part) => sentence(part))),
    sentence(`Organize depth as follows: ${scene.depthPlan}`),
    sentence(`Lighting and mood: ${scene.lightingMood}`)
  ];

  if (supporting.length) {
    parts.push(sentence(`Limit supporting context to ${listSentence(supporting)}; each must remain secondary to the narrative takeaway`));
  }

  const guard = VISUAL_FORM_GUARDS[text(scene.visualForm)];
  if (guard && !creativeEvidence && !(scene.visualForm === 'character-scene' && scene.peoplePresence !== undefined)) parts.push(sentence(guard));
  parts.push(buildFigureDirectionPrompt(scene, styleLock));

  if (creativeEvidence) {
    parts.push(sentence(`Visible evidence that must be legible at video size: ${scene.visibleEvidence}`));
    parts.push(sentence(`Local color, weather and activity: ${scene.colorIntent}; ${scene.worldLifeDetail}`));
    for (const reference of references) {
      parts.push(sentence(`Historical reference: ${reference.description}`));
      parts.push(sentence(`Must show: ${listSentence(reference.mustShow)}`));
      parts.push(sentence(`Must avoid: ${listSentence(reference.mustAvoid)}`));
    }
    for (const change of scene.continuity ?? []) parts.push(sentence(`Preserve the established identity of ${change.entityId}; show the current state: ${change.toState}`));
    for (const overlay of scene.overlays ?? []) {
      if (overlay.type === 'label') parts.push(sentence(`Keep the area around ${Math.round(overlay.x * 100)}% across and ${Math.round(overlay.y * 100)}% down visually quiet for a later editorial label; do not draw that label`));
    }
  }

  parts.push(sentence(scene.continuityNote));
  parts.push(sentence(scene.historicalAccuracyNote));

  if (isCover) {
    const exactCover = text(coverText);
    if (!exactCover || containsPlaceholder(exactCover)) throw new Error('Cover-Text fehlt oder enthält einen Platzhalter.');
    parts.push(`Integrate exactly this German cover text: "${exactCover}". Make it large, correctly spelled and immediately readable in a calm high-contrast area without covering the dominant subject.`);
  } else if (text(scene.visibleTextPolicy) === 'EDITORIAL_TEXT') {
    parts.push(sentence(`Editorial text purpose: ${text(scene.editorialTextPurpose)}. Use the approved text only because it materially improves orientation or understanding`));
  }

  parts.push(buildHardTextInstruction({ isCover, coverText, scene }));

  return parts.filter(Boolean).join(' ');
}

export function compileFlowPrompt({ meta, mapping, styleLock, worldLock, research }) {
  validateStyleLock(styleLock, meta?.visualStyleId);
  if (!meta || typeof meta !== 'object') throw new Error('video.json fehlt.');
  if (!mapping || !Array.isArray(mapping.images) || !mapping.images.length) throw new Error('BILD_AUDIO_ZUORDNUNG.json enthält keine Bilder.');

  const expectedCount = Number(meta.plannedImageCount);
  if (!Number.isInteger(expectedCount) || expectedCount !== mapping.images.length) {
    throw new Error(`plannedImageCount (${meta.plannedImageCount}) passt nicht zur Mapping-Länge (${mapping.images.length}).`);
  }

  const coverText = text(meta.coverPolicy?.coverText);
  const firstSceneIsCover = meta.coverPolicy?.firstSceneIsCover !== false;
  const worldText = buildWorldLockText(worldLock);
  const styleReferenceInstruction = text(styleLock.referencePolicy?.instruction);
  const title = text(meta.title);
  const topic = text(meta.topic);
  const aspectRatio = text(meta.aspectRatio) || '16:9';

  if (Number(meta.creativeEvidenceVersion ?? 0) >= 1) {
    if (firstSceneIsCover) throw new Error('Creative Evidence benötigt ein separates Thumbnail.');
    if (!Array.isArray(research?.visualReferences) || !research.visualReferences.length) throw new Error('Historische Bildreferenzen fehlen.');
    const blocks = mapping.images.map((scene, index) => {
      if (scene.imageNumber !== index + 1) throw new Error('Bildnummern sind nicht lückenlos.');
      const references = (scene.visualReferenceIds ?? []).map(id => {
        const reference = research.visualReferences.find(item => item.id === id);
        if (!reference) throw new Error(`Unbekannte Bildreferenz: ${id}`);
        return reference;
      });
      const narration = Number(meta.narrationAlignmentGateVersion ?? 0) >= 1 ? '' : `Narration context, never draw these words: ${scene.narrationBeat}\n`;
      return `BILD ${String(index + 1).padStart(2, '0')}\n${narration}${compileScenePrompt(scene, { styleLock, creativeEvidence: true, references })}`;
    });
    const entities = (worldLock.entities ?? []).map(entity => `${entity.id}: ${entity.identity}`).join('\n');
    return `ACTIVE_STYLE_ID: ${styleLock.styleId}\nPROMPT_SYSTEM: flow-compiler-v3\nCREATIVE_EVIDENCE: 1\n\n${title}\nCreate ${mapping.images.length} separate ${aspectRatio} historical illustrations.\n\nCHANNEL STYLE — IMMUTABLE:\n${styleLock.masterStylePrompt}\n${styleReferenceInstruction}\n\nVIDEO WORLD LOCK — IMMUTABLE WITHIN THIS VIDEO:\n${worldText}\n${entities}\n\nVISUAL INTEREST RULE — HARD:\nUse one clear visible idea, readable focus and purposeful spatial relationships. Change staging when the story requires it; preserve a viewpoint when a changed state is the point.\n\nINTERNAL METADATA RULE — HARD:\nBILD headings and narration are metadata only and must NEVER appear as artwork text.\n\nSTAGE 1 — SEPARATE THUMBNAIL ONLY\nGenerate exactly three distinct thumbnail candidates with exactly "${coverText}". STOP for explicit user selection. Save the reviewed selection to 00-bildprompts/thumbnail.png, outside images/.\n\nSTAGE 2 — STORY IMAGES AFTER USER SELECTION\nBILD headings, narration context and instructions are metadata. Never draw them. Every story image, including BILD 01, is a narration scene with ZERO visible text, numbers, labels, pseudo-writing or watermarks. Labels and routes are added later in the renderer. Each image must show its assigned visible evidence, not merely illustrate the general topic. Preserve recurring identities and changed states; do not reset destruction, positions or weather. Use the same viewpoint when a before/after comparison benefits from it.\n\n${blocks.join('\n\n')}\n\nNEGATIVE STYLE:\n${styleLock.globalNegativePrompt}\n\nREVIEW:\nInspect every final image against narration, historical reference, continuity and visible text. Reject mismatches before approval; do not grant scores automatically. Save exactly Bild 01.png through Bild ${String(mapping.images.length).padStart(2, '0')}.png in images/. No more than five active generations. Phase 3 consumes existing approved images only.\n`;
  }

  const imageBlocks = mapping.images.map((scene, index) => {
    const expectedNumber = index + 1;
    if (Number(scene.imageNumber) !== expectedNumber) throw new Error(`Bildnummern sind nicht lückenlos bei ${expectedNumber}.`);
    const marker = `BILD ${String(expectedNumber).padStart(2, '0')}`;
    return `${marker}\n${compileScenePrompt(scene, { styleLock, coverText, isCover: firstSceneIsCover && expectedNumber === 1 })}`;
  });

  const finalImage = String(mapping.images.length).padStart(2, '0');
  const referenceBlock = styleReferenceInstruction
    ? `\nSTYLE REFERENCES / INGREDIENTS:\n${styleReferenceInstruction}\n`
    : '';

  let compiled = `ACTIVE_STYLE_ID: ${styleLock.styleId}\nPROMPT_SYSTEM: flow-compiler-v3\n\nGOOGLE FLOW MASTER PROMPT — ${title}\n\nCreate ${mapping.images.length} separate ${aspectRatio} historical explainer illustrations for one coherent German YouTube video. Topic: ${topic}\n\nNARRATION-FIRST RULE:\nEvery image exists to support the exact spoken story beat assigned to it. Choose and preserve the planned visual form because it explains that narration better than a generic character shot. Do not add people merely to fill the frame. Avoid long runs of abstract explanation visuals; after one or two explanatory frames, return to the concrete historical world whenever the narration allows it.\n\nVISUAL INTEREST RULE — HARD:\nCorrect is not enough. Every frame must have one clear visual mechanism that makes the spoken beat interesting to look at: purposeful movement direction, strong depth, scale contrast, asymmetry, spatial tension, reveal, detail focus, before-after relation, cause-effect relation, reaction or another explicitly planned device. Do not default to repeated medium-wide eye-level character interactions. Change shot scale, viewpoint, visual form or spatial structure when the narration changes.\n\nINTERNAL METADATA RULE — HARD:\nThe headings BILD 01 through BILD ${finalImage} are prompt metadata only. NEVER draw these headings, their numbers, scene names, prompt instructions or any other internal metadata inside the artwork. A generated image containing BILD, IMAGE, SCENE, an image number, an unrequested heading or pseudo-text is invalid and must be regenerated.\n\nCHANNEL STYLE — IMMUTABLE:\n${styleLock.masterStylePrompt}\n\nSTYLE CONSISTENCY RULE:\nThe CHANNEL STYLE is a hard rendering lock, not a suggestion. Scene content, era, weather, camera and mood may change, but linework, human simplification level, flat-color rendering, cel shading, texture and detail hierarchy must not drift. Recurring characters stay recognizable; unrelated prominent people must not become clones of one generic figure. Every BILD block below repeats a compact locked-style anchor on purpose.\n${referenceBlock}\nVIDEO WORLD LOCK — IMMUTABLE WITHIN THIS VIDEO:\n${worldText}\n\nCOVER TEXT:\nUse exactly this German cover text on every Bild-01 candidate: "${coverText}". It is the ONLY visible text allowed on Bild 01. Keep it large, correctly spelled and immediately readable with strong contrast. Never cover the dominant subject. Do not add Bild 01, BILD 01, scene names, subtitles, labels or any second text element.\n\n${imageBlocks.join('\n\n')}\n\nGLOBAL NEGATIVE STYLE RULE:\n${styleLock.globalNegativePrompt}\n\nGLOBAL COMPOSITION RULES:\nEvery image must deliver one immediately readable viewer takeaway and visually support the current narration. Use the visual language best suited to the beat: people, object focus, map, architecture, process, cause-effect, comparison, overview, cutaway, detail inset, evidence-plus-reconstruction or tightly controlled multi-moment illustration. Most images use one deliberately dominant subject and no more than three necessary supporting elements. Do not turn scenes into dense collages, museum boards, textbook posters, crowded wimmelbilder or generic object inventories. Preserve the planned spatial relationship, camera, depth, state/action, visual-interest mechanism, continuity and historical constraint from each BILD block.\n\nTEXT RULE — CONTROLLED EDITORIAL USE:\nBILD 01 may show exactly one text element: "${coverText}". For BILD 02 through BILD ${finalImage}, the default is ZERO visible text. A non-cover image may show visible text only when its own Scene Card explicitly uses visibleTextPolicy=EDITORIAL_TEXT; in that case render exactly the approved editorialText and nothing else. Valid uses are short dates, years, place names, time jumps, orientation or a very short comparison. Internal prompt identifiers such as BILD 11, IMAGE 11 or SCENE 11 are NEVER visual content. Any unapproved text, extra label, watermark or pseudo-writing makes the image invalid.\n\nGENERATION WORKFLOW — MANDATORY TWO-STAGE GATE:\nSTAGE 1 — COVER ONLY\n- Generate exactly THREE alternatives for BILD 01.\n- All three must use exactly the same cover text "${coverText}" and no other visible text.\n- Reject and regenerate any candidate with missing, misspelled, poorly readable or additional text.\n- After three acceptable candidates exist, STOP.\n- Do not generate BILD 02–${finalImage}.\n- Do not choose a winner. Wait for the user's explicit cover selection.\n\nSTAGE 2 — ONLY AFTER USER SELECTION\n- The selected cover becomes Bild 01.png.\n- Keep the CHANNEL STYLE and VIDEO WORLD LOCK unchanged.\n- Use the selected cover as an additional continuity reference, not as permission to clone its composition or unrelated characters.\n- Only then generate BILD 02 through BILD ${finalImage}, once each.\n- For NO_VISIBLE_TEXT scenes, reject any visible text. For EDITORIAL_TEXT scenes, reject anything except the exact approved editorialText.\n- Always reject image numbers, internal metadata, watermarks and pseudo-writing.\n- Maximum five active generations at once.\n- Final image folder contains only Bild 01.png through Bild ${finalImage}.png.\n`;
  if (firstSceneIsCover) return compiled;
  compiled = compiled.replace(/COVER TEXT:\n[\s\S]*?(?=\n\nBILD 01\n)/, `SEPARATE YOUTUBE THUMBNAIL — NOT A VIDEO FRAME:\nGenerate three independent thumbnail concepts with the exact German words "${coverText}" and no other text, matching the channel style and central historical tension. Save the selected, visually reviewed winner as 00-bildprompts/thumbnail.png (outside images/). The thumbnail must NOT appear as BILD 01 or anywhere in the rendered video.`);
  compiled = compiled.replace(/TEXT RULE — CONTROLLED EDITORIAL USE:\n[\s\S]*?(?=\n\nGENERATION WORKFLOW)/, `TEXT RULE — CONTROLLED EDITORIAL USE:\nBILD 01 through BILD ${finalImage} are all actual narration scenes, NEVER title cards or covers. Default ZERO visible text except an exactly approved EDITORIAL_TEXT scene. The words "${coverText}" appear ONLY in the standalone thumbnail. No scene numbers, labels, watermarks or pseudo-writing.`);
  compiled = compiled.replace(/GENERATION WORKFLOW — MANDATORY TWO-STAGE GATE:\n[\s\S]*$/, `GENERATION WORKFLOW — MANDATORY TWO-STAGE GATE:\nSTAGE 1 — SEPARATE THUMBNAIL ONLY\n- Generate exactly THREE distinctly composed thumbnail candidates A/B/C with exactly "${coverText}". Verify legibility, consistent style and natural people.\n- STOP for explicit user selection; never select automatically.\n- Save the reviewed selection to 00-bildprompts/thumbnail.png, OUTSIDE the video images directory.\n\nSTAGE 2 — FULL STORY, STARTING WITH BILD 01\n- Generate all narrated BILD 01 through BILD ${finalImage}; BILD 01 is a normal historical opening shot, never the thumbnail/title card.\n- All story images are based on their exact narration beats and kept as Bild 01.png ... Bild ${finalImage}.png only in images/.\n- Reject caricature faces, incorrect anatomy, deformed hands, cloned officers and bad historical interactions; regenerate before Phase 2 approval.\n- Reject missing/misnamed files, unauthorized text or style drift; no regeneration or image modification in Phase 3.\n- Keep no more than five active generations.`);
  return compiled;
}
