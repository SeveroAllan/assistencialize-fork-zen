/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Surfer currently hardcodes upstream website links in generated branding.
// Run after every import; never edit node_modules to change these defaults.
export async function applyBranding(engine = resolve('engine')) {
  const repository = 'https://github.com/SeveroAllan/assistencialize-fork-zen';
  const paths = ['release', 'twilight'].map(brand => ({
    prefs: resolve(engine, 'browser/branding', brand, 'pref/firefox-branding.js'),
    installer: resolve(engine, 'browser/branding', brand, 'branding.nsi'),
  }));
  // Read all inputs before writing, so a missing engine fails without partial edits.
  const inputs = await Promise.all(paths.flatMap(p => [p.prefs, p.installer]).map(async path => ({
    path, text: await readFile(path, 'utf8'),
  })));
  for (const input of inputs) {
    let text = input.text;
    if (input.path.endsWith('.js')) {
      text = text.replace(/https:\/\/(?:www\.)?zen-browser\.app\/[^"\s]*/g, url => {
        if (url.includes('welcome') || url.includes('whatsnew')) return 'about:blank';
        if (url.includes('privacy-policy')) return 'about:rights';
        return repository;
      });
    } else {
      text = text.replace(/^!define (URLInfoAbout|URLUpdateInfo|HelpLink|URLManualDownload|URLStubDownloadX86|URLStubDownloadAMD64|URLStubDownloadAArch64)\s+".*"/gm,
        (_, key) => `!define ${key} "${key.startsWith('URLStub') ? 'https://downloads.assistencialize.invalid/' : key === 'HelpLink' ? repository + '/issues' : repository}"`);
    }
    await writeFile(input.path, text);
  }
  console.log('Assistencialize: links de marca gerados atualizados.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await applyBranding();
}
