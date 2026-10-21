const fields = ['identity', 'expression', 'actionAndGaze', 'poseAndHands'];
const filled = value => typeof value === 'string' && value.trim().length >= 12 && !/\[[^\]]+\]|\bTODO\b|\bTBD\b|PLACEHOLDER|UNSET/i.test(value);

export function validateFigureDirection(scene) {
  if (!['none', 'background', 'prominent'].includes(scene.peoplePresence)) return [`Bild ${scene.imageNumber}: peoplePresence muss none, background oder prominent sein.`];
  if (scene.peoplePresence !== 'prominent') return [];
  return fields.filter(field => !filled(scene.figureDirection?.[field]))
    .map(field => `Bild ${scene.imageNumber}: konkrete Figurenregie ${field} fehlt.`);
}

export function buildFigureDirectionPrompt(scene, styleLock) {
  if (scene.peoplePresence === undefined || scene.peoplePresence === 'none') return '';
  const errors = validateFigureDirection(scene);
  if (errors.length) throw new Error(errors.join('\n'));
  if (scene.peoplePresence === 'background') return styleLock.backgroundFigurePrompt ?? 'Draw small background people as simple coherent silhouettes, with readable work and stance rather than tiny detailed faces.';
  const direction = scene.figureDirection;
  return [
    styleLock.figureDrawingPrompt,
    `Character identity: ${direction.identity}`,
    `Face and expression: ${direction.expression}`,
    `Action and gaze: ${direction.actionAndGaze}`,
    `Body support and hands: ${direction.poseAndHands}`
  ].filter(Boolean).map(value => /[.!?]$/.test(value.trim()) ? value.trim() : `${value.trim()}.`).join(' ');
}

export function matchesSceneStyleAnchor(block, styleLock, meta) {
  if (Number(meta.figureDirectionVersion ?? 0) >= 1) return block.includes(styleLock.sceneStyleAnchor);
  return [styleLock.sceneStyleAnchor, ...(styleLock.legacySceneStyleAnchors ?? [])]
    .some(anchor => typeof anchor === 'string' && anchor.length >= 70 && block.includes(anchor.slice(0, 70)));
}
