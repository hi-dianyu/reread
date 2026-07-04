import type { BookInfo, NotebookEntry, NoteCardData } from "./types";
import { DEMO_KEY, demoNotebooks, demoPool } from "./demo";

const KEY_STORAGE = "reread:key";
const NOTEBOOKS_CACHE = "reread:notebooks";
const POOL_CACHE_PREFIX = "reread:pool:";
const NOTEBOOKS_TTL = 6 * 60 * 60 * 1000;
const POOL_TTL = 24 * 60 * 60 * 1000;

export class WeReadError extends Error {
  constructor(message: string, public errcode?: number) {
    super(message);
    this.name = "WeReadError";
  }
}

// ---- api key ----

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE);
}

export function isDemoKey(key?: string | null): boolean {
  return (key ?? getApiKey()) === DEMO_KEY;
}

// ---- cache ----

function cacheGet<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - t > maxAgeMs) return null;
    return v;
  } catch {
    return null;
  }
}

function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // 配额满时静默降级为不缓存
  }
}

export function clearDataCache() {
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k === NOTEBOOKS_CACHE || k.startsWith(POOL_CACHE_PREFIX))) {
      doomed.push(k);
    }
  }
  doomed.forEach((k) => localStorage.removeItem(k));
}

// ---- gateway ----

async function gateway<T>(
  apiName: string,
  params: Record<string, unknown> = {},
  keyOverride?: string
): Promise<T> {
  const key = keyOverride ?? getApiKey();
  if (!key) throw new WeReadError("尚未设置 API Key");
  const res = await fetch("/api/weread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-weread-key": key,
    },
    body: JSON.stringify({ api_name: apiName, ...params }),
  });
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new WeReadError(`接口响应异常（HTTP ${res.status}）`);
  }
  if (!res.ok) {
    throw new WeReadError(
      (data.error as string) ?? `请求失败（HTTP ${res.status}）`
    );
  }
  const errcode = data.errcode as number | undefined;
  if (errcode) {
    const msg = (data.errmsg as string) ?? (data.errMsg as string) ?? "";
    if (errcode === -2012 || errcode === 401 || /auth|登录|鉴权/i.test(msg)) {
      throw new WeReadError("API Key 无效或已过期，请重新设置", errcode);
    }
    throw new WeReadError(msg || `微信读书接口错误（${errcode}）`, errcode);
  }
  return data as T;
}

// ---- raw response shapes ----

interface RawBook {
  title?: string;
  author?: string;
  cover?: string;
}

interface NotebooksResp {
  hasMore?: number;
  books?: Array<{
    bookId?: string;
    book?: RawBook;
    reviewCount?: number;
    noteCount?: number;
    bookmarkCount?: number;
    sort?: number;
  }>;
}

interface BookmarkListResp {
  updated?: Array<{
    bookmarkId?: string;
    chapterUid?: number;
    markText?: string;
    createTime?: number;
    range?: string;
  }>;
  chapters?: Array<{ chapterUid?: number; title?: string }>;
}

interface ReviewListResp {
  reviews?: Array<{
    review?: {
      reviewId?: string;
      content?: string;
      abstract?: string;
      createTime?: number;
      star?: number;
      chapterName?: string;
      chapterUid?: number;
      range?: string;
    };
  }>;
  hasMore?: number;
  synckey?: number;
}

// ---- high-level fetchers ----

export async function validateKey(key: string): Promise<void> {
  if (key === DEMO_KEY) return;
  await gateway<NotebooksResp>("/user/notebooks", { count: 1 }, key);
}

/** 拉取所有「有可展示笔记」的书（划线数 + 想法数 > 0），带本地缓存 */
export async function fetchAllNotebooks(force = false): Promise<NotebookEntry[]> {
  if (isDemoKey()) return demoNotebooks();
  if (!force) {
    const cached = cacheGet<NotebookEntry[]>(NOTEBOOKS_CACHE, NOTEBOOKS_TTL);
    if (cached) return cached;
  }
  const entries: NotebookEntry[] = [];
  let lastSort: number | undefined;
  for (let page = 0; page < 50; page++) {
    const params: Record<string, unknown> = { count: 100 };
    if (lastSort !== undefined) params.lastSort = lastSort;
    const resp = await gateway<NotebooksResp>("/user/notebooks", params);
    const books = resp.books ?? [];
    for (const b of books) {
      if (!b.bookId) continue;
      entries.push({
        bookId: b.bookId,
        book: {
          bookId: b.bookId,
          title: b.book?.title ?? "未知书籍",
          author: b.book?.author ?? "",
          cover: b.book?.cover,
        },
        noteCount: b.noteCount ?? 0,
        reviewCount: b.reviewCount ?? 0,
        bookmarkCount: b.bookmarkCount ?? 0,
        sort: b.sort ?? 0,
      });
    }
    if (resp.hasMore !== 1 || books.length === 0) break;
    lastSort = books[books.length - 1].sort;
  }
  const usable = entries.filter((e) => e.noteCount + e.reviewCount > 0);
  cacheSet(NOTEBOOKS_CACHE, usable);
  return usable;
}

/** 拉取一本书的全部可展示笔记（划线 + 想法/点评），带本地缓存 */
export async function fetchBookPool(entry: NotebookEntry): Promise<NoteCardData[]> {
  if (isDemoKey()) return demoPool(entry.bookId);
  const cacheKey = POOL_CACHE_PREFIX + entry.bookId;
  const cached = cacheGet<NoteCardData[]>(cacheKey, POOL_TTL);
  if (cached) return cached;

  const cards: NoteCardData[] = [];
  const book: BookInfo = entry.book;

  if (entry.noteCount > 0) {
    const resp = await gateway<BookmarkListResp>("/book/bookmarklist", {
      bookId: entry.bookId,
    });
    const chapterTitle = new Map<number, string>();
    for (const c of resp.chapters ?? []) {
      if (c.chapterUid !== undefined) chapterTitle.set(c.chapterUid, c.title ?? "");
    }
    for (const m of resp.updated ?? []) {
      const text = m.markText?.trim();
      if (!m.bookmarkId || !text) continue;
      cards.push({
        id: m.bookmarkId,
        kind: "highlight",
        quote: text,
        book,
        chapterTitle:
          m.chapterUid !== undefined ? chapterTitle.get(m.chapterUid) : undefined,
        chapterUid: m.chapterUid,
        range: m.range,
        createTime: m.createTime,
      });
    }
  }

  if (entry.reviewCount > 0) {
    let synckey = 0;
    for (let page = 0; page < 20; page++) {
      const resp = await gateway<ReviewListResp>("/review/list/mine", {
        bookid: entry.bookId,
        count: 50,
        synckey,
      });
      for (const item of resp.reviews ?? []) {
        const r = item.review;
        const content = r?.content?.trim();
        if (!r?.reviewId || !content) continue;
        const isBookReview = !r.chapterName && !r.abstract && r.chapterUid === undefined;
        cards.push({
          id: r.reviewId,
          kind: isBookReview ? "review" : "thought",
          quote: r.abstract?.trim() || undefined,
          thought: content,
          star:
            isBookReview && r.star !== undefined && r.star >= 0 ? r.star : undefined,
          book,
          chapterTitle: r.chapterName || undefined,
          chapterUid: r.chapterUid,
          range: r.range,
          createTime: r.createTime,
        });
      }
      if (resp.hasMore !== 1) break;
      synckey = resp.synckey ?? 0;
      if (!synckey) break;
    }
  }

  // 去重（同一条可能同时出现在两个接口的极端情况）
  const seen = new Set<string>();
  const unique = cards.filter((c) =>
    seen.has(c.id) ? false : (seen.add(c.id), true)
  );
  cacheSet(cacheKey, unique);
  return unique;
}

/** 拼接微信读书 App 内跳转链接 */
export function deepLink(card: NoteCardData): string {
  if (card.chapterUid !== undefined && card.range?.includes("-")) {
    const [start, end] = card.range.split("-");
    return `weread://bestbookmark?bookId=${card.book.bookId}&chapterUid=${card.chapterUid}&rangeStart=${start}&rangeEnd=${end}`;
  }
  return `weread://reading?bId=${card.book.bookId}`;
}
