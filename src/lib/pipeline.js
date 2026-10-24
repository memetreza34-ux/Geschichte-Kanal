import { createHash } from 'node:crypto';
import { access, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const execFileAsync = promisify(execFile);
export const AUDIO_RE = /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i;
export const IMAGE_RE = /^Bild (\d{2,3})\.png$/i;

export function arg(name, argv = process.argv) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

// Compare real file paths instead of hand-built file:// strings. Otherwise
// spaces (%20), symlinks or Windows paths silently skip main() with exit 0.
export function isMainModule(moduleUrl, argv = process.argv) {
  if (!argv[1]) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(path.resolve(argv[1]));
  } catch {
    return false;
  }
}

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath, fallback = undefined) {
  if (!(await exists(filePath))) {
    if (fallback !== undefined) return fallback;
    throw new Error(`JSON-Datei fehlt: ${filePath}`);
  }
  return JSON.parse(await readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

export function toPosix(value) {
  return String(value).split(path.sep).join('/');
}

export function slugify(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeText(input) {
  return String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9äöü]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function tokens(input) {
  return normalizeText(input).split(' ').filter(Boolean);
}

export function similarity(a, b) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function ensureInside(root, candidate) {
  const rootAbs = path.resolve(root);
  const abs = path.resolve(candidate);
  const rel = path.relative(rootAbs, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Pfad verlässt den erlaubten Ordner: ${candidate}`);
  }
  return abs;
}

export async function copyDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, force: false, errorOnExist: true });
}

export async function discoverAudioFiles(audioDir) {
  if (!(await exists(audioDir))) return [];
  const entries = await readdir(audioDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && AUDIO_RE.test(entry.name))
    .map((entry) => path.join(audioDir, entry.name))
    .sort();
}

export async function probeDuration(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath
  ]);
  const value = Number(String(stdout).trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Ungültige Medien-Dauer: ${filePath}`);
  return Number(value.toFixed(3));
}

export async function listFinalImages(imagesDir) {
  if (!(await exists(imagesDir))) return [];
  const entries = await readdir(imagesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_RE.test(entry.name))
    .map((entry) => {
      const match = entry.name.match(IMAGE_RE);
      return { name: entry.name, number: Number(match[1]), path: path.join(imagesDir, entry.name) };
    })
    .sort((a, b) => a.number - b.number);
}

export async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const result = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  await visit(root);
  return result;
}

export async function fileSize(filePath) {
  return (await stat(filePath)).size;
}

export function projectPaths(projectDirectory) {
  const projectDir = path.resolve(projectDirectory);
  return {
    projectDir,
    prompt: path.join(projectDir, '00-bildprompts', 'google-flow-prompt.txt'),
    imagesDir: path.join(projectDir, '00-bildprompts', 'images'),
    script: path.join(projectDir, '01-voice-script', 'voice-script.txt'),
    audioDir: path.join(projectDir, '02-audio'),
    exportDir: path.join(projectDir, '03-export'),
    techDir: path.join(projectDir, '99-technik'),
    meta: path.join(projectDir, '99-technik', 'video.json'),
    mapping: path.join(projectDir, '99-technik', 'BILD_AUDIO_ZUORDNUNG.json'),
    flowWorldLock: path.join(projectDir, '99-technik', 'FLOW_WORLD_LOCK.json'),
    topicScorecard: path.join(projectDir, '99-technik', 'TOPIC_SCORECARD.json'),
    storyQc: path.join(projectDir, '99-technik', 'STORY_QC.json'),
    storyBlueprint: path.join(projectDir, '99-technik', 'STORY_BLUEPRINT.json'),
    castBible: path.join(projectDir, '99-technik', 'CAST_BIBLE.json'),
    flowPromptDir: path.join(projectDir, '00-bildprompts', 'FLOW_PROMPTS'),
    wholeVideoQc: path.join(projectDir, '99-technik', 'WHOLE_VIDEO_QC.json'),
    phase2VisualQc: path.join(projectDir, '99-technik', 'PHASE2_VISUAL_QC.json'),
    renderPlan: path.join(projectDir, '99-technik', 'YOUTUBE_RENDER_PLAN.json'),
    status: path.join(projectDir, '99-technik', 'status.json'),
    phase3ImageLock: path.join(projectDir, '99-technik', 'PHASE3_IMAGE_LOCK.json'),
    optimizedAudio: path.join(projectDir, '99-technik', 'YOUTUBE_AUDIO_OPTIMIZED.wav'),
    alignmentEvidence: path.join(projectDir, '99-technik', 'WHISPER_ALIGNMENT.json'),
    timeline: path.join(projectDir, '99-technik', 'FINAL_TIMELINE.json'),
    renderProps: path.join(projectDir, '99-technik', 'RENDER_PROPS.json')
  };
}
