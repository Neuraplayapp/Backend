// scripts/download-pyodide.mjs
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYODIDE_VERSION = process.env.PYODIDE_VERSION || '0.26.2';
const BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;
const DEST_DIR = path.resolve(__dirname, '../public/pyodide');

const FILES = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'packages.json',
  'repodata.json',
];

function download(url, dest, allowEmpty = false) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode === 404 && allowEmpty) {
        fs.writeFileSync(dest, '{}');
        r.resume(); // drain response so socket closes
        console.log(`⚠︎ stubbed ${path.basename(dest)}`);
        return res();
      }
      if (r.statusCode !== 200) return rej(new Error(`${url} → ${r.statusCode}`));

      const total = Number(r.headers['content-length'] || 0);
      let received = 0;
      const barWidth = 20;

      r.on('data', chunk => {
        received += chunk.length;
        if (total) {
          const pct = received / total;
          const filled = Math.round(pct * barWidth);
          const bar = '█'.repeat(filled) + ' '.repeat(barWidth - filled);
          process.stdout.write(`\r   [${bar}] ${(pct * 100).toFixed(1)}%`);
        }
      });

      const f = fs.createWriteStream(dest);
      r.pipe(f);
      f.on('finish', () => {
        process.stdout.write('\n');
        f.close(res);
      });
    }).on('error', rej);
  });
}

if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

// Skip download entirely when env is set (e.g., on Render when cache is warm)
if (process.env.SKIP_PYODIDE_DOWNLOAD === '1') {
  const haveAll = FILES.every(f => {
    const p = path.join(DEST_DIR, f);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  });
  if (haveAll) {
    console.log('⏭  SKIP_PYODIDE_DOWNLOAD=1 and files present — skipping download');
    process.exit(0);
  }
}

(async () => {
  const minSize = {
    'pyodide.js': 5_000,
    'pyodide.asm.js': 120_000,
    'pyodide.asm.wasm': 1_000_000,
    'python_stdlib.zip': 2_000_000,
    // json files handled via allowEmpty
    'pyodide-lock.json': 1,
    'packages.json': 1,
    'repodata.json': 1,
  };

  for (const file of FILES) {
    const dest = path.join(DEST_DIR, file);
    const needDownload = !fs.existsSync(dest) || fs.statSync(dest).size < (minSize[file] || 1);
    if (!needDownload) {
      console.log(`✔ ${file}`);
      continue;
    }
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    console.log(`⬇ ${file}`);
    const allowEmpty = file.endsWith('.json');
    await download(`${BASE_URL}/${file}`, dest, allowEmpty);
  }
})();
