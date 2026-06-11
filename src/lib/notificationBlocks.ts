import type { NotificationBlock, NotificationSlot } from '../types';

/** Hours around each enabled slot during which notifications are allowed. */
const SLOT_WINDOW_HOURS = 3;

/**
 * Convert "notify around these times" slots into do-not-disturb blocks (the
 * complement) so the existing interval scheduler honors them. Each enabled slot
 * opens an allowed window of SLOT_WINDOW_HOURS starting at its hour; everything
 * else becomes a quiet block. If no slot is enabled, returns [] (notify
 * anytime) so the user is never left with zero notifications.
 */
export function slotsToBlocks(slots: NotificationSlot[]): NotificationBlock[] {
  if (!Array.isArray(slots)) return [];
  const enabled = slots.filter((s) => s && s.enabled);
  if (enabled.length === 0) return [];

  const allowed = new Array(24).fill(false);
  for (const s of enabled) {
    const start = ((s.hour % 24) + 24) % 24;
    for (let i = 0; i < SLOT_WINDOW_HOURS; i += 1) {
      allowed[(start + i) % 24] = true;
    }
  }

  const blocks: NotificationBlock[] = [];
  let start: number | null = null;
  for (let h = 0; h <= 24; h += 1) {
    const blocked = h < 24 ? !allowed[h] : false;
    if (blocked && start === null) start = h;
    if (!blocked && start !== null) {
      blocks.push({ start, end: h % 24 });
      start = null;
    }
  }
  return blocks;
}

/**
 * If `time` falls inside any of the user's "do not disturb" blocks, advance
 * it past the latest block-end (looping until clear). Otherwise return
 * `time` unchanged.
 *
 * A block `{ start, end }` is an integer hour pair (0-23):
 *   - `start < end`  → straight range, e.g. 9-12 means 09:00 ≤ t < 12:00
 *   - `start > end`  → wraps midnight, e.g. 23-7 means t ≥ 23:00 OR t < 07:00
 *   - `start === end`→ all-day (treated as midnight-skip by the loop)
 */
export function skipBlockZones(
  time: Date,
  blocks: NotificationBlock[]
): Date {
  let result = new Date(time);
  let changed = true;
  let iterations = 0;

  while (changed) {
    // Hard stop: pathological block configs (e.g. blocks covering all 24h)
    // could otherwise loop forever and freeze the scheduler.
    if (++iterations > 100) {
      console.warn('skipBlockZones: max iterations reached');
      break;
    }
    changed = false;
    for (const block of blocks) {
      const hour = result.getHours();
      const isInBlock =
        block.start > block.end
          ? hour >= block.start || hour < block.end
          : hour >= block.start && hour < block.end;

      if (isInBlock) {
        const next = new Date(result);
        next.setHours(block.end, 0, 0, 0);
        if (next <= result) {
          // The block-end happened earlier today — roll to tomorrow.
          next.setDate(next.getDate() + 1);
        }
        result = next;
        changed = true;
        break;
      }
    }
  }
  return result;
}

export function formatBlock(block: NotificationBlock): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(block.start)}:00 - ${pad(block.end)}:00`;
}
