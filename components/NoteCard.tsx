"use client";

import { useState } from "react";
import type { NoteCardData } from "@/lib/types";
import { paletteIndex } from "@/lib/daily";
import { deepLink } from "@/lib/weread";

const KIND_LABEL: Record<NoteCardData["kind"], string> = {
  highlight: "划线",
  thought: "想法",
  review: "书评",
};

/** 去掉书名尾部的版本/出版方括注和副标题，如「德米安（果麦经典）」→「德米安」 */
function displayTitle(title: string): string {
  let cut = title.length;
  const bracket = title.search(/[（(【[〔]/);
  if (bracket >= 2) cut = Math.min(cut, bracket);
  const colon = title.search(/[：:]/);
  if (colon >= 3) cut = Math.min(cut, colon);
  return title.slice(0, cut).trim() || title;
}

function formatDate(unixSec?: number): string | null {
  if (!unixSec) return null;
  const d = new Date(unixSec * 1000);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 引文按长度分级排版：短句大字，长段落收小 */
function quoteSizeClass(text: string): string {
  if (text.length <= 36) return "text-[1.4rem] leading-[2]";
  if (text.length <= 90) return "text-[1.15rem] leading-[1.95]";
  return "text-[1rem] leading-[1.9]";
}

export default function NoteCard({
  card,
  index,
}: {
  card: NoteCardData;
  index: number;
}) {
  const [copied, setCopied] = useState(false);
  const palette = `palette-${paletteIndex(card)}`;
  const date = formatDate(card.createTime);
  const mainText = card.kind === "highlight" ? card.quote ?? "" : card.thought ?? "";

  async function copyQuote() {
    const parts = [
      card.quote ? `「${card.quote}」` : null,
      card.kind !== "highlight" && card.thought ? card.thought : null,
      `——《${displayTitle(card.book.title)}》${card.book.author ? " " + card.book.author : ""}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 剪贴板不可用时静默失败
    }
  }

  return (
    <article
      className={`${palette} card-in relative overflow-hidden rounded-2xl px-6 pb-5 pt-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(43,38,32,0.25)]`}
      style={{
        background: "var(--card-bg)",
        color: "var(--card-ink)",
        animationDelay: `${Math.min(index, 4) * 90}ms`,
      }}
    >
      {/* 顶部：类型标签 + 原始日期 */}
      <header className="flex items-baseline justify-between text-[11px] tracking-[0.2em]" style={{ color: "var(--card-muted)" }}>
        <span
          className="rounded-full border px-2.5 py-0.5"
          style={{ borderColor: "var(--card-accent)", color: "var(--card-accent)" }}
        >
          {KIND_LABEL[card.kind]}
        </span>
        {date && <time>{date}</time>}
      </header>

      {/* 装饰引号 */}
      <div
        aria-hidden
        className="pointer-events-none select-none font-serif text-[3.2rem] font-black leading-none"
        style={{ color: "var(--card-accent)", opacity: 0.5, marginTop: "0.4rem", marginBottom: "-0.6rem" }}
      >
        「
      </div>

      {/* 正文 */}
      {card.kind === "highlight" ? (
        <p className={`font-serif ${quoteSizeClass(mainText)} whitespace-pre-wrap`}>
          {mainText}
        </p>
      ) : (
        <div className="space-y-4">
          {card.quote && (
            <blockquote
              className="border-l-2 pl-3 font-serif text-[0.95rem] leading-[1.9]"
              style={{ borderColor: "var(--card-accent)", color: "var(--card-muted)" }}
            >
              {card.quote}
            </blockquote>
          )}
          <p className={`font-serif ${quoteSizeClass(mainText)} whitespace-pre-wrap`}>
            {mainText}
          </p>
          {card.star !== undefined && card.star > 0 && (
            <div className="text-sm tracking-[0.3em]" style={{ color: "var(--card-accent)" }}>
              {"★".repeat(card.star)}
              <span style={{ opacity: 0.3 }}>{"★".repeat(5 - card.star)}</span>
            </div>
          )}
        </div>
      )}

      {/* 分隔线 */}
      <div className="stitch mt-6" style={{ color: "var(--card-ink)" }} />

      {/* 底部：书籍信息 + 操作 */}
      <footer className="mt-4 flex items-center gap-3">
        {card.book.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- 外链封面域名不固定，尺寸极小
          <img
            src={card.book.cover}
            alt=""
            className="h-12 w-9 shrink-0 rounded-[3px] object-cover shadow-sm"
          />
        ) : (
          <div
            className="flex h-12 w-9 shrink-0 items-center justify-center rounded-[3px] font-serif text-sm font-semibold"
            style={{ background: "var(--card-accent)", color: "var(--card-bg)" }}
          >
            {card.book.title.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate font-serif text-[0.95rem] font-semibold"
            title={card.book.title}
          >
            《{displayTitle(card.book.title)}》
          </p>
          <p className="truncate text-xs" style={{ color: "var(--card-muted)" }}>
            {[card.book.author, card.chapterTitle].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={copyQuote}
            aria-label="复制"
            className="rounded-full p-2 text-xs transition-opacity active:opacity-50"
            style={{ color: "var(--card-muted)" }}
          >
            {copied ? (
              <span style={{ color: "var(--card-accent)" }}>已复制</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
          {!card.book.bookId.startsWith("demo-") && (
            <a
              href={deepLink(card)}
              aria-label="在微信读书中打开"
              className="rounded-full p-2 transition-opacity active:opacity-50"
              style={{ color: "var(--card-muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M2 6s2-2 5-2 5 2 5 2v14s-2-2-5-2-5 2-5 2V6Z" />
                <path d="M22 6s-2-2-5-2-5 2-5 2v14s2-2 5-2 5 2 5 2V6Z" />
              </svg>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
