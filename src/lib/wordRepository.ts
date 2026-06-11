import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';
import type { Difficulty, MasterWord } from '../types';

const CACHE_KEY = '@reminds_me/word_cache/v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  fetched_at: number;
  words: MasterWord[];
}

interface WordRow {
  id: string;
  english: string;
  japanese: string;
  difficulty_level: Difficulty;
  example_en: string | null;
  example_jp: string | null;
}

async function readCache(): Promise<CacheEntry | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(CACHE_KEY);
  } catch (e) {
    console.warn('[wordRepo] cache read failed', e);
    return null;
  }
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (!Array.isArray((parsed as CacheEntry).words)) return null;
    return parsed as CacheEntry;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.warn('[wordRepo] cache write failed', e);
  }
}

function isFresh(entry: CacheEntry | null): entry is CacheEntry {
  return !!entry && Date.now() - entry.fetched_at < CACHE_TTL_MS;
}

/**
 * Fetch every TOEIC word. Cached in AsyncStorage for 24h.
 * Returns [] (never null) on any failure.
 */
export async function getAllWords(
  opts: { force?: boolean } = {}
): Promise<MasterWord[]> {
  const cache = await readCache();
  if (!opts.force && isFresh(cache)) {
    return cache!.words;
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[wordRepo] Supabase not initialized — returning cache or []');
    return cache?.words ?? [];
  }

  let rows: WordRow[] = [];
  try {
    const { data, error } = await supabase
      .from('words')
      .select('id, english, japanese, difficulty_level, example_en, example_jp');
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.warn('[wordRepo] getAllWords returned no rows', error);
      return cache?.words ?? [];
    }
    rows = data as WordRow[];
  } catch (err) {
    console.error('[wordRepo] Supabase fetch error', err);
    return cache?.words ?? [];
  }

  const words: MasterWord[] = [];
  for (const r of rows) {
    if (!r || !r.id || !r.english || !r.japanese) continue;
    if (
      r.difficulty_level !== 2 &&
      r.difficulty_level !== 3 &&
      r.difficulty_level !== 4 &&
      r.difficulty_level !== 5
    ) {
      continue;
    }
    words.push({
      id: r.id,
      english: r.english,
      japanese: r.japanese,
      difficulty_level: r.difficulty_level,
      example_en: r.example_en,
      example_jp: r.example_jp,
    });
  }

  await writeCache({ fetched_at: Date.now(), words });
  return words;
}

export async function clearWordCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (e) {
    console.warn('[wordRepo] clearWordCache failed', e);
  }
}
