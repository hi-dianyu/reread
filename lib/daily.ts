import type { DayState, NotebookEntry, NoteCardData } from "./types";
import { fetchBookPool } from "./weread";

const DAY_STATE_KEY = "reread:day";

// ---- deterministic rng ----

function hashStr(str: string): number {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 本地时区的 YYYY-MM-DD */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 卡片配色：按笔记 id 稳定散列到 6 套色板 */
export function paletteIndex(card: NoteCardData): number {
  return hashStr(card.book.bookId + card.id) % 6;
}

// ---- day state ----

export function loadDayState(): DayState {
  const empty: DayState = { date: todayStr(), cards: [], usedIds: [], drawCount: 0 };
  try {
    const raw = localStorage.getItem(DAY_STATE_KEY);
    if (!raw) return empty;
    const state = JSON.parse(raw) as DayState;
    if (state.date !== todayStr()) return empty;
    return state;
  } catch {
    return empty;
  }
}

export function saveDayState(state: DayState) {
  try {
    localStorage.setItem(DAY_STATE_KEY, JSON.stringify(state));
  } catch {
    // 存不下就算了，明天重抽
  }
}

export function clearDayState() {
  localStorage.removeItem(DAY_STATE_KEY);
}

// ---- drawing ----

function weightedPick(rng: () => number, entries: NotebookEntry[]): NotebookEntry | null {
  if (entries.length === 0) return null;
  // 权重开平方：笔记多的书更常出现，但不至于垄断
  const weights = entries.map((e) => Math.sqrt(e.noteCount + e.reviewCount));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < entries.length; i++) {
    r -= weights[i];
    if (r <= 0) return entries[i];
  }
  return entries[entries.length - 1];
}

/**
 * 抽一张卡。同一天内以 (日期 + 抽取序号) 为随机种子，
 * 已抽中的笔记记入 usedIds，当天不会重复。
 */
export async function drawOne(
  notebooks: NotebookEntry[],
  state: DayState
): Promise<NoteCardData | null> {
  const rng = mulberry32(hashStr(`${state.date}#${state.drawCount}`));
  const used = new Set(state.usedIds);
  const exhausted = new Set<string>();
  // 尽量避开今天已经出现过的书，让卡片来自不同的书
  const shownBooks = new Set(state.cards.map((c) => c.book.bookId));

  for (let attempt = 0; attempt < 15; attempt++) {
    let candidates = notebooks.filter(
      (e) => !exhausted.has(e.bookId) && !shownBooks.has(e.bookId)
    );
    if (candidates.length === 0) {
      candidates = notebooks.filter((e) => !exhausted.has(e.bookId));
    }
    const book = weightedPick(rng, candidates);
    if (!book) return null;
    let pool: NoteCardData[];
    try {
      pool = await fetchBookPool(book);
    } catch (err) {
      // 单本书拉取失败不应卡死抽卡，换一本
      console.warn("fetch pool failed", book.bookId, err);
      exhausted.add(book.bookId);
      continue;
    }
    const avail = pool.filter((c) => !used.has(c.id));
    if (avail.length === 0) {
      exhausted.add(book.bookId);
      continue;
    }
    return avail[Math.floor(rng() * avail.length)];
  }
  return null;
}
