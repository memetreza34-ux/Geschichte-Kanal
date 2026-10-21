import { execFileAsync } from './pipeline.js';

export async function inspectVideo(filePath, timeline) {
  const errors = [];
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=format_name,duration:stream=codec_type,codec_name,width,height,avg_frame_rate,duration', '-of', 'json', filePath
    ], { timeout: 30_000, maxBuffer: 1024 * 1024 });
    const media = JSON.parse(stdout);
    const video = media.streams?.find(stream => stream.codec_type === 'video');
    const audio = media.streams?.find(stream => stream.codec_type === 'audio');
    const fps = video?.avg_frame_rate?.split('/').map(Number);
    const measuredFps = fps?.[0] / fps?.[1];
    if (!media.format?.format_name?.split(',').includes('mp4')) errors.push('Export ist kein MP4-Container.');
    if (!video || video.codec_name !== 'h264' || video.width !== timeline.width || video.height !== timeline.height) errors.push('Videoformat/Auflösung entspricht nicht der Timeline.');
    if (!audio) errors.push('Export enthält keine Audiospur.');
    if (!Number.isFinite(measuredFps) || Math.abs(measuredFps - timeline.fps) > 0.001) errors.push('Export-Bildrate entspricht nicht der Timeline.');
    const duration = Number(media.format?.duration);
    if (!Number.isFinite(duration) || Math.abs(duration - timeline.durationSeconds) > Math.max(0.1, 2 / timeline.fps)) errors.push('Export-Dauer entspricht nicht der Timeline.');
    if (!errors.length) {
      await execFileAsync('ffmpeg', ['-v', 'error', '-xerror', '-i', filePath, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], { timeout: 600_000, maxBuffer: 1024 * 1024 });
    }
  } catch (error) {
    errors.push(`Export ist nicht vollständig decodierbar: ${String(error.stderr || error.message).trim().slice(0, 300)}`);
  }
  return { passed: errors.length === 0, errors };
}
