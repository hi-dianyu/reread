export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
  cover?: string;
}

export interface NotebookEntry {
  bookId: string;
  book: BookInfo;
  /** 划线数 */
  noteCount: number;
  /** 想法/点评数 */
  reviewCount: number;
  bookmarkCount: number;
  sort: number;
}

/** highlight = 划线；thought = 划线想法/章节点评；review = 整本书评 */
export type CardKind = "highlight" | "thought" | "review";

export interface NoteCardData {
  /** bookmarkId 或 reviewId */
  id: string;
  kind: CardKind;
  /** 划线原文（highlight 的正文，thought 关联的原文） */
  quote?: string;
  /** 想法/点评正文 */
  thought?: string;
  /** 书评评分 0-5，-1/undefined 表示无 */
  star?: number;
  book: BookInfo;
  chapterTitle?: string;
  chapterUid?: number;
  range?: string;
  /** Unix 秒 */
  createTime?: number;
}

export interface DayState {
  date: string;
  cards: NoteCardData[];
  usedIds: string[];
  drawCount: number;
}
