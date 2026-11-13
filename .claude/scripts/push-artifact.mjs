#!/usr/bin/env node
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');

function parseEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8')
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
        .map(l => { const eq = l.indexOf('='); const val = l.slice(eq + 1).trim(); return [l.slice(0, eq).trim(), val.replace(/^["']|["']$/g, '')]; })
    );
  } catch { return {}; }
}

const env = parseEnv(join(projectRoot, '.env'));

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

const url = getArg('url');
const title = getArg('title');
const description = getArg('description') || '';
const tagsRaw = getArg('tags') || '';
const htmlFile = getArg('html-file');

if (!url || !title) {
  console.error('Usage: push-artifact.mjs --url <url> --title <title> [--description <desc>] [--tags <tag1,tag2>] [--html-file <path>]');
  process.exit(1);
}

const tags = tagsRaw
  ? JSON.stringify(tagsRaw.split(',').map(t => t.trim()).filter(Boolean))
  : '[]';

let htmlContent = null;
if (htmlFile) {
  try { htmlContent = readFileSync(htmlFile, 'utf8'); } catch (e) {
    console.warn(`Warning: could not read HTML file: ${e.message}`);
  }
}

const dbUrl = env.VITE_TURSO_DB_URL;
const authToken = env.VITE_TURSO_DB_TOKEN;

if (!dbUrl || !authToken) {
  console.error('Missing VITE_TURSO_DB_URL or VITE_TURSO_DB_TOKEN in .env');
  process.exit(1);
}

const client = createClient({ url: dbUrl, authToken });

const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const createdAt = new Date().toISOString();

await client.execute({
  sql: `INSERT INTO saved_artifacts (id, url, title, description, tags, html_content, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
  args: [id, url, title, description, tags, htmlContent, createdAt],
});

console.log(`✓ Saved: "${title}"`);
console.log(`  ID: ${id}`);
if (htmlContent) {
  console.log(`  HTML: ${Math.round(htmlContent.length / 1024)}KB captured — available offline on any machine`);
} else {
  console.log(`  HTML: not captured — open the URL and use the Download button in The Ball`);
}
