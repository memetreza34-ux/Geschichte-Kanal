export function sceneFrames(image, index, length, fps, totalFrames) {
  const from = Math.max(0, Math.round(image.startSeconds * fps));
  const end = index === length - 1 ? totalFrames : Math.round(image.endSeconds * fps);
  return { from, durationInFrames: Math.max(1, end - from) };
}

export function safeImageTransform({ scale, x, y, width, height, focusPoint = { x: 0.5, y: 0.5 } }) {
  const safeScale = Math.max(1, scale);
  const focusX = Math.min(1, Math.max(0, focusPoint.x));
  const focusY = Math.min(1, Math.max(0, focusPoint.y));
  const marginX = (safeScale - 1) * width / 2;
  const marginY = (safeScale - 1) * height / 2;
  const clamp = (value, margin) => Math.min(margin, Math.max(-margin, value));
  return {
    scale: safeScale,
    x: clamp(x + (0.5 - focusX) * width * (safeScale - 1), marginX),
    y: clamp(y + (0.5 - focusY) * height * (safeScale - 1), marginY)
  };
}
