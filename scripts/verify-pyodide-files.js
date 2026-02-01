// scripts/verify-pyodide-files.js
// Ensures all Pyodide runtime files are present and above minimal size.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEST_DIR = path.resolve(__dirname, '../public/pyodide');
const required = {
  'pyodide.js': 100 * 1024, // 100 KB
  'pyodide.asm.js': 150 * 1024, // 150 KB
  'pyodide.asm.wasm': 1 * 1024 * 1024, // 1 MB
  'python_stdlib.zip': 4 * 1024 * 1024, // 4 MB
  'pyodide-lock.json': 100, // 100 B
  'packages.json': 100, // 100 B
  'repodata.json': 100, // 100 B
};

let ok = true;
for (const [file, min] of Object.entries(required)) {
  const p = path.join(DEST_DIR, file);
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing ${file}`);
    ok = false;
  } else {
    const size = fs.statSync(p).size;
    if (size < min) {
      console.error(`❌ ${file} too small (${size} bytes)`);
      ok = false;
    }
  }
}
if (!ok) {
  console.error('Pyodide verification failed. Run npm run setup:pyodide');
  process.exit(1);
} else {
  console.log('✅ Pyodide files verified');
}
