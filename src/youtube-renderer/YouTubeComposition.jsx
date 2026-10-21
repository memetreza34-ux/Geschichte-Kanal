import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { safeImageTransform, sceneFrames } from '../lib/render-math.js';

function EditorialOverlays({ overlays = [] }) {
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {overlays.map((overlay, index) => overlay.type === 'label' ? (
      <div key={index} style={{ position: 'absolute', left: `${overlay.x * 100}%`, top: `${overlay.y * 100}%`, transform: 'translate(-50%, -50%)', background: '#171d25ee', color: '#fff5df', padding: '0.35em 0.65em', borderRadius: 7, fontFamily: 'sans-serif', fontWeight: 700, fontSize: '3cqw', whiteSpace: 'nowrap' }}>{overlay.text}</div>
    ) : overlay.type === 'route' ? (
      <svg key={index} viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute' }}>
        <polyline points={overlay.points.map(point => `${point.x * 1000},${point.y * 1000}`).join(' ')} fill="none" stroke="#f8e9bb" strokeWidth="10" strokeLinejoin="round" />
        <polyline points={overlay.points.map(point => `${point.x * 1000},${point.y * 1000}`).join(' ')} fill="none" stroke="#9f301f" strokeWidth="5" strokeLinejoin="round" />
        <circle cx={overlay.points.at(-1).x * 1000} cy={overlay.points.at(-1).y * 1000} r="9" fill="#9f301f" stroke="#f8e9bb" strokeWidth="3" />
      </svg>
    ) : null)}
  </AbsoluteFill>;
}

function Shot({ image, durationInFrames }) {
  const frame = useCurrentFrame();
  const progress = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
  const motion = image.motion ?? {};
  const { width, height } = useVideoConfig();
  const scale = interpolate(progress, [0, 1], [Number(motion.scaleFrom ?? 1.01), Number(motion.scaleTo ?? 1.035)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const x = interpolate(progress, [0, 1], [Number(motion.xFrom ?? 0), Number(motion.xTo ?? 0)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(progress, [0, 1], [Number(motion.yFrom ?? 0), Number(motion.yTo ?? 0)], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const transform = safeImageTransform({ scale, x, y, width, height, focusPoint: motion.focusPoint });

  return (
    <AbsoluteFill style={{ backgroundColor: '#111', overflow: 'hidden', containerType: 'inline-size' }}>
      <AbsoluteFill style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`, transformOrigin: 'center center' }}>
      <Img
        src={staticFile(image.file)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <EditorialOverlays overlays={image.overlays} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function YouTubeComposition({ plan }) {
  const fps = Number(plan.fps ?? 30);
  const totalFrames = Math.max(1, Math.ceil(Number(plan.durationSeconds ?? 1) * fps));

  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      <Audio src={staticFile(plan.audioFile)} />
      {plan.images.map((image, index) => {
        const { from, durationInFrames } = sceneFrames(image, index, plan.images.length, fps, totalFrames);
        return (
          <Sequence key={image.imageNumber} from={from} durationInFrames={durationInFrames} premountFor={fps}>
            <Shot image={image} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
      {(plan.sounds ?? []).filter((sound) => sound.file).map((sound, index) => {
        const from = Math.max(0, Math.round(Number(sound.fromSeconds ?? 0) * fps));
        return (
          <Sequence key={`${sound.imageNumber ?? 'sfx'}-${index}`} from={from} durationInFrames={Math.max(1, totalFrames - from)}>
            <Audio src={staticFile(sound.file)} volume={Number(sound.volume ?? 0.15)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
