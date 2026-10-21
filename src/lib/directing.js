function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ratio(part, total) {
  return total > 0 ? part / total : 0;
}

export function validateDirectingPlan({ meta, mapping, renderPlan, policy } = {}) {
  const errors = [];
  const images = Array.isArray(mapping?.images) ? mapping.images : [];
  if (Number(meta?.directingGateVersion ?? 0) < 1) return { passed: true, errors };
  if (!policy || policy.status !== 'READY') return { passed: false, errors: ['Directing Policy fehlt oder ist nicht READY.'] };
  if (!renderPlan || Number(renderPlan.schemaVersion ?? 0) < 2) errors.push('YOUTUBE_RENDER_PLAN.json muss für neue Projekte schemaVersion >= 2 verwenden.');

  const colorPolicy = policy.colorWorldArc ?? {};
  const motionPolicy = policy.motionDirector ?? {};
  const colorFields = colorPolicy.sceneFieldsRequired ?? [];
  const motionFields = motionPolicy.sceneFieldsRequired ?? [];
  const allowedMotionTypes = new Set(motionPolicy.allowedTypes ?? []);
  const allowedIntensity = new Set(motionPolicy.allowedIntensity ?? []);

  const colorPhases = new Set();
  let staticLike = 0;
  let mediumMotion = 0;
  let previousMotion = null;
  let motionRun = 0;
  let previousColor = null;
  let colorRun = 0;

  for (const image of images) {
    const number = image.imageNumber ?? '?';
    for (const field of colorFields) if (!text(image[field])) errors.push(`${field} fehlt bei Bild ${number}.`);
    for (const field of motionFields) if (!text(image[field])) errors.push(`${field} fehlt bei Bild ${number}.`);

    const phase = text(image.colorPhase);
    if (phase) colorPhases.add(phase);
    if (phase && phase === previousColor) colorRun += 1;
    else colorRun = phase ? 1 : 0;
    previousColor = phase || null;
    if (colorRun > Number(colorPolicy.maximumConsecutiveSameColorPhase ?? 8)) {
      errors.push(`Color-Arc-Monotonie: mehr als ${colorPolicy.maximumConsecutiveSameColorPhase} Bilder hintereinander in derselben Farbphase (${phase}).`);
      break;
    }

    const motionType = text(image.motionType);
    const intensity = text(image.motionIntensity);
    if (motionType && allowedMotionTypes.size && !allowedMotionTypes.has(motionType)) errors.push(`motionType bei Bild ${number} ist nicht erlaubt: ${motionType}.`);
    if (intensity && allowedIntensity.size && !allowedIntensity.has(intensity)) errors.push(`motionIntensity bei Bild ${number} ist nicht erlaubt: ${intensity}.`);
    if (motionType === 'static' || intensity === 'none') staticLike += 1;
    if (intensity === 'medium') mediumMotion += 1;

    if (motionType && motionType === previousMotion) motionRun += 1;
    else motionRun = motionType ? 1 : 0;
    previousMotion = motionType || null;
    if (motionRun > Number(motionPolicy.maximumConsecutiveSameMotionType ?? 2)) {
      errors.push(`Motion-Monotonie: ${motionRun} Bilder hintereinander mit motionType=${motionType}.`);
      break;
    }
  }

  const minPhases = Number(colorPolicy.minimumDistinctColorPhases ?? 3);
  if (images.length && colorPhases.size < minPhases) errors.push(`Color & World Arc braucht mindestens ${minPhases} verschiedene colorPhase-Werte; aktuell ${colorPhases.size}.`);
  if (images.length && ratio(staticLike, images.length) < Number(motionPolicy.minimumStaticOrNearStaticShare ?? 0.2)) errors.push('Motion Director verlangt mindestens 20 % statische oder nahezu statische Szenen.');
  if (images.length && ratio(mediumMotion, images.length) > Number(motionPolicy.maximumMediumMotionShare ?? 0.25)) errors.push('Zu viele Szenen verwenden motionIntensity=medium.');

  if (!Array.isArray(renderPlan?.colorArc) || renderPlan.colorArc.length < minPhases) errors.push(`YOUTUBE_RENDER_PLAN.json braucht mindestens ${minPhases} Color-Arc-Phasen.`);
  if (renderPlan?.motionPolicy !== 'content-aware-v1') errors.push('YOUTUBE_RENDER_PLAN.json.motionPolicy muss content-aware-v1 sein.');

  return { passed: errors.length === 0, errors };
}

export function motionFromScene(scene, durationSeconds) {
  const type = text(scene?.motionType) || 'static';
  const intensity = text(scene?.motionIntensity) || 'none';
  const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
  const base = intensity === 'medium' ? 1 : intensity === 'subtle' ? 0.55 : 0;
  const durationFactor = Math.min(1, Math.max(0.45, duration / 4));
  const travel = 14 * base * durationFactor;
  const zoom = 0.028 * base * durationFactor;
  const result = { type, intensity, focus: text(scene?.motionFocus), focusPoint: scene?.focusPoint ?? { x: 0.5, y: 0.5 }, scaleFrom: 1.01, scaleTo: 1.01, xFrom: 0, xTo: 0, yFrom: 0, yTo: 0 };

  if (type === 'push-in') result.scaleTo = 1.01 + zoom;
  else if (type === 'pull-out') result.scaleFrom = 1.01 + zoom;
  else if (type === 'pan-left') { result.xFrom = travel / 2; result.xTo = -travel / 2; }
  else if (type === 'pan-right') { result.xFrom = -travel / 2; result.xTo = travel / 2; }
  else if (type === 'pan-up') { result.yFrom = travel / 2; result.yTo = -travel / 2; }
  else if (type === 'pan-down') { result.yFrom = -travel / 2; result.yTo = travel / 2; }
  return result;
}

function markerRegex(imageNumber) {
  // Nur echte Scene-Header treffen. Globale Regeln dürfen Begriffe wie
  // "BILD 01 through BILD 84" erwähnen, ohne dass dort Directing-Blöcke landen.
  return new RegExp(`^BILD\\s+0*${Number(imageNumber)}\\s*$`, 'im');
}

export function injectDirectingIntoPrompt(prompt, mapping, renderPlan) {
  let output = String(prompt ?? '');
  const images = Array.isArray(mapping?.images) ? mapping.images : [];
  if (!images.length) return output;

  const arc = Array.isArray(renderPlan?.colorArc) ? renderPlan.colorArc : [];
  const arcSummary = arc.map((phase) => `${text(phase.id)}: ${text(phase.storyFunction)}; palette ${text(phase.paletteBias)}; lighting ${text(phase.lighting)}`).join(' | ');
  const globalBlock = `\nCOLOR & WORLD ARC — HARD:\nKeep the channel drawing style consistent, but do NOT keep every frame in the same beige-blue palette or the same flat daylight. Follow this story color arc: ${arcSummary}. Color, weather, contrast and lighting must evolve with the story while recurring objects keep their identity. Repeated locations must feel alive through specific historically plausible activity, weather, reflections, mud, smoke, wind, tools, animals, boats, vegetation or human work when relevant. Do not add random clutter.\n`;
  const firstMarker = markerRegex(1).exec(output);
  if (firstMarker) output = `${output.slice(0, firstMarker.index)}${globalBlock}\n${output.slice(firstMarker.index)}`;

  for (let index = images.length - 1; index >= 0; index -= 1) {
    const scene = images[index];
    const match = markerRegex(scene.imageNumber).exec(output);
    if (!match) continue;
    const insertAt = match.index + match[0].length;
    const sceneBlock = `\nDIRECTING — HARD: color phase "${text(scene.colorPhase)}". Color intent: ${text(scene.colorIntent)}. World-life detail: ${text(scene.worldLifeDetail)}. Preserve one clear subject; use the life detail only as believable supporting evidence, not clutter.`;
    output = `${output.slice(0, insertAt)}${sceneBlock}${output.slice(insertAt)}`;
  }
  return output;
}
