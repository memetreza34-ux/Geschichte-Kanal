import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { isMainModule } from '../src/lib/pipeline.js';

const CLI_DIR = path.resolve('src/cli');

async function guardedCliScripts() {
  const names = (await readdir(CLI_DIR)).filter((name) => name.endsWith('.js')).sort();
  const guarded = [];
  for (const name of names) {
    if ((await readFile(path.join(CLI_DIR, name), 'utf8')).includes('isMainModule(import.meta.url)')) guarded.push(name);
  }
  return guarded;
}

test('kein CLI vergleicht import.meta.url mit einem selbstgebauten file://-String', async () => {
  for (const name of (await readdir(CLI_DIR)).filter((entry) => entry.endsWith('.js'))) {
    const source = await readFile(path.join(CLI_DIR, name), 'utf8');
    assert.ok(!source.includes('file://${process.argv[1]}'), `${name} nutzt den unsicheren Einstiegsvergleich`);
  }
});

test('isMainModule erkennt Pfade mit Leerzeichen und relative argv-Pfade', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'Pfad mit Leerzeichen '));
  try {
    const file = path.join(root, 'skript.js');
    await cp(path.resolve('src/lib/pipeline.js'), file);
    const url = pathToFileURL(file).href;
    assert.match(url, /%20/);
    assert.equal(isMainModule(url, ['node', file]), true);
    assert.equal(isMainModule(url, ['node', path.relative(process.cwd(), file)]), true);
    assert.equal(isMainModule(url, ['node', path.join(root, 'anderes.js')]), false);
    assert.equal(isMainModule(url, ['node']), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// Regression: in a folder with spaces (or reached via symlink) main() was
// skipped and every gate exited 0 without checking anything.
test('alle CLI-Gates laufen auch in Ordnern mit Leerzeichen und über Symlinks wirklich', async () => {
  const scripts = await guardedCliScripts();
  assert.ok(scripts.length >= 14, `erwartet mindestens 14 CLI-Skripte mit isMainModule, gefunden ${scripts.length}`);

  const root = await mkdtemp(path.join(tmpdir(), 'Mein Kanal '));
  try {
    const repo = path.join(root, 'Geschichte Kanal');
    await cp(path.resolve('src'), path.join(repo, 'src'), { recursive: true });
    await cp(path.resolve('package.json'), path.join(repo, 'package.json'));
    const linked = path.join(root, 'verlinkter Kanal');
    await symlink(repo, linked, 'dir');

    for (const base of [repo, linked]) {
      for (const name of scripts) {
        const result = spawnSync(process.execPath, [path.join(base, 'src', 'cli', name)], { cwd: base, encoding: 'utf8' });
        assert.equal(result.status, 1, `${name} in ${path.basename(base)} endete mit Exit ${result.status} statt 1`);
        assert.match(result.stderr, /FEHLER/, `${name} in ${path.basename(base)} hat main() nicht ausgeführt`);
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
