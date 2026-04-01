import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'www');

const copyTargets = [
  'index.html',
  'manifest.webmanifest',
  'css',
  'js'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const target of copyTargets) {
  const src = path.join(root, target);
  const dest = path.join(outDir, target);
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true });
}

console.log('Prepared web assets in www/');
