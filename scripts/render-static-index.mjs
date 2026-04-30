import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(rootDir, 'public/dist/.vite/manifest.json');
const indexPath = path.join(rootDir, '_index.html');
const outputPath = path.join(rootDir, 'public/index.html');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entry = manifest['client/lighterpack.ts'];

const styles = (entry.css || [])
    .map(file => `<link rel='stylesheet' href='/dist/${file}' />`)
    .join('');
const scripts = `<script type='module' src='/dist/${entry.file}'></script>`;

const html = fs.readFileSync(indexPath, 'utf8')
    .replace('{{styles}}', styles)
    .replace('{{scripts}}', scripts);

fs.writeFileSync(outputPath, html);
