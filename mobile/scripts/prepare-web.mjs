import fs from 'node:fs';
import path from 'node:path';

const mobileRoot = process.cwd();
const webRoot = path.resolve(mobileRoot, '..');
const outDir = path.join(mobileRoot, 'www');

const copyTargets = [
  'index.html',
  'manifest.webmanifest',
  'css',
  'js'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const target of copyTargets) {
  const src = path.join(webRoot, target);
  const dest = path.join(outDir, target);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Prepared web assets in mobile/www from the ERP root.');
