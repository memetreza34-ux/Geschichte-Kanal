import { motionFromScene } from './directing.js';

export function timelineImages({ meta, mapping, audioDuration, hold }) {
  return mapping.images.map((image, index) => {
    const start = image.actualStartSeconds;
    const end = index === mapping.images.length - 1 ? audioDuration + hold : mapping.images[index + 1].actualStartSeconds;
    const durationSeconds = Number((end - start).toFixed(3));
    return {
      imageNumber: image.imageNumber,
      file: `__render/${meta.videoId}/images/${image.imageFile}`,
      startSeconds: Number(start.toFixed(3)), endSeconds: Number(end.toFixed(3)), durationSeconds,
      visualPurpose: image.visualPurpose ?? '', topicAnchor: image.topicAnchor ?? '',
      visualForm: image.visualForm ?? '', colorPhase: image.colorPhase ?? '', overlays: image.overlays ?? [],
      motion: Number(meta.directingGateVersion ?? 0) >= 1
        ? motionFromScene(image, durationSeconds)
        : { scaleFrom: 1.01, scaleTo: 1.025, xFrom: 0, xTo: 0, yFrom: 0, yTo: 0 }
    };
  });
}
