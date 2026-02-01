// scripts/download-pyodide.js
// Downloads the core Pyodide runtime files into public/pyodide before build

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYODIDE_VERSION = process.env.PYODIDE_VERSION || '0.26.2';
const BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;
const DEST_DIR = path.resolve(__dirname, '../public/pyodide');

const requiredFiles = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'packages.json',
  'repodata.json',
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url} (${res.statusCode})`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

  for (const file of requiredFiles) {
    const destPath = path.join(DEST_DIR, file);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      console.log(`✔ ${file} already exists, skipping`);
      continue;
    }
    const url = `${BASE_URL}/${file}`;
    console.log(`⬇ Downloading ${file}...`);
    await download(url, destPath);
    console.log(`✔ Downloaded ${file}`);
  }
})();
