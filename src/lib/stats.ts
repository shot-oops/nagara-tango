import { getUserWordsMap } from './storage';
import { getAllWords } from './wordRepository';
import type { MasterWord } from '../types';

export type StatsRange = '7d' | '30d' | 'all';

export interface MasteryStats {
  total: number;
  week: number;
  month: number;
  learning: number;
  labels: string[];
  data: number[]; // cumulative mastered words at each label point
}

const DAY_MS = 24 * 60 * 60 * 1000;

function buildSeries(masteredDates: Date[], rangeDays: number) {
  const now = new Date();
  const POINTS = 7;
  const stepDays = Math.max(1, Math.round(rangeDays / (POINTS - 1)));
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = POINTS - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i * stepDays);
    day.setHours(23, 59, 59, 999);
    const cum = masteredDates.filter((d) => d.getTime() <= day.getTime()).length;
    labels.push(`${day.getMonth() + 1}/${day.getDate()}`);
    data.push(cum);
  }
  return { labels, data };
}

export async function getMasteryStats(range: StatsRange): Promise<MasteryStats> {
  const map = await getUserWordsMap().catch(() => ({}));
  const masteredDates: Date[] = [];
  let learning = 0;
  for (const uw of Object.values(map)) {
    if (!uw || typeof uw !== 'object') continue;
    if (uw.status === 'mastered') {
      const at = uw.mastered_at ? new Date(uw.mastered_at) : null;
      if (at && !Number.isNaN(at.getTime())) masteredDates.push(at);
      else masteredDates.push(new Date()); // legacy mastered w/o timestamp
    } else if (uw.status === 'learning' || uw.status === 'new') {
      learning += 1;
    }
  }
  masteredDates.sort((a, b) => a.getTime() - b.getTime());

  const now = Date.now();
  const total = masteredDates.length;
  const week = masteredDates.filter((d) => now - d.getTime() <= 7 * DAY_MS).length;
  const month = masteredDates.filter((d) => now - d.getTime() <= 30 * DAY_MS).length;

  let rangeDays = 7;
  if (range === '30d') rangeDays = 30;
  else if (range === 'all') {
    const first = masteredDates[0]?.getTime() ?? now;
    rangeDays = Math.max(6, Math.ceil((now - first) / DAY_MS));
  }

  const { labels, data } = buildSeries(masteredDates, rangeDays);
  return { total, week, month, learning, labels, data };
}

export interface MasteredWordItem {
  id: string;
  english: string;
  japanese: string;
  mastered_at: string;
}

/** Mastered words, most-recently-mastered first. */
export async function getMasteredWordsList(): Promise<MasteredWordItem[]> {
  const [master, map] = await Promise.all([
    getAllWords().catch(() => [] as MasterWord[]),
    getUserWordsMap().catch(() => ({})),
  ]);
  const byId = new Map<string, MasterWord>();
  for (const w of master) if (w && w.id) byId.set(w.id, w);

  const out: MasteredWordItem[] = [];
  for (const uw of Object.values(map)) {
    if (!uw || uw.status !== 'mastered') continue;
    const w = byId.get(uw.word_id);
    if (!w) continue;
    out.push({
      id: w.id,
      english: w.english,
      japanese: w.japanese,
      mastered_at: uw.mastered_at ?? '',
    });
  }
  out.sort((a, b) => (b.mastered_at || '').localeCompare(a.mastered_at || ''));
  return out;
}
