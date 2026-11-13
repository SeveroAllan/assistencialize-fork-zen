import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyBranding } from './assistencialize-branding.mjs';

test('post-import removes upstream download routes, preserves notices, and is repeatable', async () => {
  const engine = await mkdtemp(join(tmpdir(), 'assistencialize-branding-'));
  try {
    for (const brand of ['release', 'twilight']) {
      const dir = join(engine, 'browser/branding', brand);
      await mkdir(join(dir, 'pref'), { recursive: true });
      await writeFile(join(dir, 'pref/firefox-branding.js'), '// Mozilla Public License v. 2.0\npref("startup.homepage_welcome_url", "https://zen-browser.app/welcome/");\npref("app.update.url.manual", "https://zen-browser.app/download/");\n');
      await writeFile(join(dir, 'branding.nsi'), '; Mozilla Public License v. 2.0\n!define HelpLink "https://github.com/zen-browser/desktop/issues"\n!define URLStubDownloadAMD64 "https://download.mozilla.org/?product=firefox-latest"\n');
    }
    await applyBranding(engine);
    const prefs = join(engine, 'browser/branding/release/pref/firefox-branding.js');
    const installer = await readFile(join(engine, 'browser/branding/release/branding.nsi'), 'utf8');
    const first = await readFile(prefs, 'utf8');
    assert.match(first, /Mozilla Public License/);
    assert.match(first, /about:blank/);
    assert.doesNotMatch(first, /zen-browser\.app/);
    assert.doesNotMatch(installer, /download\.mozilla\.org|zen-browser\/desktop/);
    assert.match(installer, /downloads\.assistencialize\.invalid/);
    await applyBranding(engine);
    assert.equal(await readFile(prefs, 'utf8'), first);
  } finally { await rm(engine, { recursive: true, force: true }); }
});
