import type { NotebookEntry, NoteCardData } from "./types";

/** 体验模式：无需 API Key，用内置的公版书笔记预览完整体验 */
export const DEMO_KEY = "demo";

interface DemoBook {
  bookId: string;
  title: string;
  author: string;
  notes: Array<Partial<NoteCardData> & { id: string }>;
}

const DAY = 24 * 60 * 60;
const now = Math.floor(Date.now() / 1000);

const DEMO_BOOKS: DemoBook[] = [
  {
    bookId: "demo-yecao",
    title: "野草",
    author: "鲁迅",
    notes: [
      {
        id: "d1",
        kind: "highlight",
        quote: "当我沉默着的时候，我觉得充实；我将开口，同时感到空虚。",
        chapterTitle: "题辞",
        createTime: now - 210 * DAY,
      },
      {
        id: "d2",
        kind: "highlight",
        quote:
          "然而我不愿彷徨于明暗之间，我不如在黑暗里沉没。然而我终于彷徨于明暗之间，我不知道是黄昏还是黎明。",
        chapterTitle: "影的告别",
        createTime: now - 208 * DAY,
      },
      {
        id: "d3",
        kind: "thought",
        quote: "绝望之为虚妄，正与希望相同。",
        thought: "读到这句停了很久。绝望和希望都不足信，能做的只是继续走。",
        chapterTitle: "希望",
        createTime: now - 200 * DAY,
      },
    ],
  },
  {
    bookId: "demo-zhuziqing",
    title: "背影",
    author: "朱自清",
    notes: [
      {
        id: "d4",
        kind: "highlight",
        quote:
          "我看见他戴着黑布小帽，穿着黑布大马褂，深青布棉袍，蹒跚地走到铁道边，慢慢探身下去，尚不大难。",
        chapterTitle: "背影",
        createTime: now - 120 * DAY,
      },
      {
        id: "d5",
        kind: "highlight",
        quote: "热闹是它们的，我什么也没有。",
        chapterTitle: "荷塘月色",
        createTime: now - 118 * DAY,
      },
      {
        id: "d6",
        kind: "review",
        thought: "散文可以这么平白，又这么重。写人不写情绪，情绪全在动作里。",
        star: 5,
        createTime: now - 110 * DAY,
      },
    ],
  },
  {
    bookId: "demo-sushi",
    title: "东坡乐府",
    author: "苏轼",
    notes: [
      {
        id: "d7",
        kind: "highlight",
        quote: "人生如逆旅，我亦是行人。",
        chapterTitle: "临江仙·送钱穆父",
        createTime: now - 60 * DAY,
      },
      {
        id: "d8",
        kind: "highlight",
        quote: "回首向来萧瑟处，归去，也无风雨也无晴。",
        chapterTitle: "定风波",
        createTime: now - 58 * DAY,
      },
      {
        id: "d9",
        kind: "thought",
        quote: "小舟从此逝，江海寄余生。",
        thought: "据说写完这句他倒头就睡，第二天照常上班。豁达不是出走，是回得来。",
        chapterTitle: "临江仙·夜饮东坡醒复醉",
        createTime: now - 30 * DAY,
      },
    ],
  },
];

export function demoNotebooks(): NotebookEntry[] {
  return DEMO_BOOKS.map((b) => ({
    bookId: b.bookId,
    book: { bookId: b.bookId, title: b.title, author: b.author },
    noteCount: b.notes.filter((n) => n.kind === "highlight").length,
    reviewCount: b.notes.filter((n) => n.kind !== "highlight").length,
    bookmarkCount: 0,
    sort: 0,
  }));
}

export function demoPool(bookId: string): NoteCardData[] {
  const b = DEMO_BOOKS.find((x) => x.bookId === bookId);
  if (!b) return [];
  const book = { bookId: b.bookId, title: b.title, author: b.author };
  return b.notes.map((n) => ({
    kind: "highlight",
    ...n,
    book,
  })) as NoteCardData[];
}
