#!/usr/bin/env node
// One-shot import for TOEICwords.csv → Supabase `words` table.
//
// CSV columns (header optional): english, japanese, difficulty_level
//
// Config resolution (first match wins):
//   1. process.env.SUPABASE_URL / SUPABASE_KEY
//   2. app.json → extra.supabaseUrl / extra.supabaseAnonKey
//
// Anon key works only if RLS is disabled on `words` (default after SQL editor
// `CREATE TABLE`). If you set up RLS, pass SUPABASE_SERVICE_ROLE_KEY via env.
//
// Usage:
//   node scripts/import-words.js                # uses TOEICwords.csv at root
//   node scripts/import-words.js path/to.csv

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CSV_PATH = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(ROOT, 'TOEICwords.csv');

const BATCH_SIZE = 500;

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function loadConfig() {
  let url = process.env.SUPABASE_URL || '';
  let key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    '';
  if (!url || !key) {
    try {
      const json = JSON.parse(
        fs.readFileSync(path.resolve(ROOT, 'app.json'), 'utf8')
      );
      const extra = json?.expo?.extra ?? {};
      if (!url) url = extra.supabaseUrl || '';
      if (!key) key = extra.supabaseAnonKey || '';
    } catch (e) {
      console.warn('app.json read failed:', e.message);
    }
  }
  if (!url) fail('No SUPABASE_URL in env or app.json.extra.supabaseUrl');
  if (!key) fail('No SUPABASE key in env or app.json.extra.supabaseAnonKey');
  // createClient wants the project base URL — strip any trailing /rest/v1.
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return { url, key };
}

// Minimal RFC-4180-ish CSV parser. Handles quoted fields w/ commas, escaped
// quotes, and CRLF.
function parseCSV(text) {
  // strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let cur = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuote = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i += 1;
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c && c.trim()));
}

function isHeader(row) {
  const a = (row[0] || '').toLowerCase().trim();
  return a === 'word' || a === 'english';
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) fail(`CSV not found at ${CSV_PATH}`);

  const { url, key } = loadConfig();
  console.log(`→ Supabase: ${url}`);
  console.log(`→ CSV: ${CSV_PATH}`);

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const text = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(text);
  if (rows.length === 0) fail('CSV is empty');
  const start = isHeader(rows[0]) ? 1 : 0;

  const records = [];
  const skipped = [];
  for (let i = start; i < rows.length; i += 1) {
    const r = rows[i];
    const [english, japanese, difficultyRaw] = r;
    const difficulty_level = Number.parseInt(difficultyRaw, 10);
    if (!english || !japanese) {
      skipped.push({ line: i + 1, reason: 'missing english/japanese', row: r });
      continue;
    }
    if (!Number.isFinite(difficulty_level)) {
      skipped.push({ line: i + 1, reason: 'bad difficulty', row: r });
      continue;
    }
    if (difficulty_level < 2 || difficulty_level > 5) {
      skipped.push({
        line: i + 1,
        reason: `difficulty out of TOEIC range (2-5): ${difficulty_level}`,
        row: r,
      });
      continue;
    }
    records.push({
      english: english.trim(),
      japanese: japanese.trim(),
      difficulty_level,
    });
  }

  console.log(`→ ${records.length} valid, ${skipped.length} skipped`);
  if (skipped.length > 0) console.log('first 3 skipped:', skipped.slice(0, 3));

  let upserted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from('words')
      .upsert(batch, {
        onConflict: 'english',
        count: 'exact',
        ignoreDuplicates: false,
      });
    if (error) {
      console.error(`❌ batch ${i / BATCH_SIZE + 1} failed:`, error);
      process.exit(1);
    }
    upserted += count ?? batch.length;
    console.log(
      `  batch ${i / BATCH_SIZE + 1}: ${batch.length} rows (cumulative: ${upserted})`
    );
  }
  console.log(`✓ imported ${upserted} rows`);
}

main().catch((e) => {
  console.error('❌ fatal', e);
  process.exit(1);
});
