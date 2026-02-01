// scripts/verify-pyodide-files.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIR = path.resolve(__dirname, '../public/pyodide');

if (process.env.SKIP_PYODIDE_VERIFY === '1') {
  const exists = fs.existsSync(DIR);
  if (exists) {
    console.log('⏭  SKIP_PYODIDE_VERIFY=1 — skipping verification');
    process.exit(0);
  }
}
const REQ = {
  'pyodide.js': 5e3,
  'pyodide.asm.js': 150e3,
  'pyodide.asm.wasm': 1e6,
  'python_stdlib.zip': 2e6,
  'pyodide-lock.json': 1,
  'packages.json': 1,
  'repodata.json': 1,
};
let ok = true;
for (const [file, min] of Object.entries(REQ)) {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) {
    console.error('❌ missing', file);
    ok = false;
  } else if (fs.statSync(p).size < min) {
    console.error('❌ too small', file);
    ok = false;
  }
}
if (!ok) {
  console.error('Pyodide verification failed. Run npm run setup:pyodide');
  process.exit(1);
} else {
  console.log('✅ Pyodide files verified');
}
