"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NoteCard from "@/components/NoteCard";
import Onboarding from "@/components/Onboarding";
import SettingsSheet from "@/components/SettingsSheet";
import { assignPalettes, drawOne, loadDayState, saveDayState } from "@/lib/daily";
import type { DayState, NotebookEntry, NoteCardData } from "@/lib/types";
import { fetchAllNotebooks, getApiKey, WeReadError } from "@/lib/weread";

const INITIAL_CARDS = 3;

type Phase = "booting" | "onboarding" | "loading" | "ready" | "error";

function todayLabel(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function advance(state: DayState, card: NoteCardData): DayState {
  return {
    ...state,
    cards: [...state.cards, card],
    usedIds: [...state.usedIds, card.id],
    drawCount: state.drawCount + 1,
  };
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="skeleton h-56 rounded-2xl bg-surface"
      style={{ animationDelay: `${index * 200}ms` }}
    />
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("booting");
  const [day, setDay] = useState<DayState | null>(null);
  const [busy, setBusy] = useState<"more" | "shuffle" | null>(null);
  const [deckEmpty, setDeckEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notebooksRef = useRef<NotebookEntry[]>([]);

  /** 逐张抽卡直到凑满三张，卡片依次浮现；返回最终状态 */
  const fillToInitial = useCallback(
    async (notebooks: NotebookEntry[], start: DayState): Promise<DayState> => {
      let state = start;
      while (state.cards.length < INITIAL_CARDS) {
        const card = await drawOne(notebooks, state);
        if (!card) {
          if (state.cards.length === 0) setDeckEmpty(true);
          break;
        }
        state = advance(state, card);
        saveDayState(state);
        setDay(state);
      }
      return state;
    },
    []
  );

  const init = useCallback(async () => {
    if (!getApiKey()) {
      setPhase("onboarding");
      return;
    }
    setPhase("loading");
    setError(null);
    setDeckEmpty(false);
    try {
      const notebooks = await fetchAllNotebooks();
      notebooksRef.current = notebooks;
      if (notebooks.length === 0) {
        setDay(loadDayState());
        setPhase("ready");
        setDeckEmpty(true);
        return;
      }
      const state = loadDayState();
      setDay(state);
      setPhase("ready");
      await fillToInitial(notebooks, state);
    } catch (err) {
      setError(
        err instanceof WeReadError ? err.message : "加载失败，请检查网络后重试"
      );
      setPhase("error");
    }
  }, [fillToInitial]);

  useEffect(() => {
    // 推迟到下一个 tick，先让骨架屏完成首帧渲染
    const t = setTimeout(init, 0);
    return () => clearTimeout(t);
  }, [init]);

  async function drawMore() {
    if (busy || !day) return;
    setBusy("more");
    try {
      const card = await drawOne(notebooksRef.current, day);
      if (!card) {
        setDeckEmpty(true);
        return;
      }
      const next = advance(day, card);
      saveDayState(next);
      setDay(next);
    } catch (err) {
      setError(
        err instanceof WeReadError ? err.message : "加载失败，请检查网络后重试"
      );
      setPhase("error");
    } finally {
      setBusy(null);
    }
  }

  /** 换一批：清空当前卡片重抽三张；保留已抽记录所以不会重复，全部看完则重新开一轮 */
  async function reshuffle() {
    if (busy || !day) return;
    setBusy("shuffle");
    setDeckEmpty(false);
    try {
      let state: DayState = { ...day, cards: [] };
      saveDayState(state);
      setDay(state);
      state = await fillToInitial(notebooksRef.current, state);
      if (state.cards.length === 0 && state.usedIds.length > 0) {
        setDeckEmpty(false);
        state = { ...state, usedIds: [] };
        await fillToInitial(notebooksRef.current, state);
      }
    } catch (err) {
      setError(
        err instanceof WeReadError ? err.message : "加载失败，请检查网络后重试"
      );
      setPhase("error");
    } finally {
      setBusy(null);
    }
  }

  if (phase === "onboarding") {
    return <Onboarding onDone={init} />;
  }

  if (phase === "error") {
    return (
      <main className="fade-up mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
        <p className="font-serif text-4xl" aria-hidden>
          ✳
        </p>
        <p className="mt-6 font-serif text-lg leading-relaxed">{error}</p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={init}
            className="rounded-full border border-hairline px-6 py-2.5 text-sm active:opacity-60"
          >
            重试
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full border border-hairline px-6 py-2.5 text-sm text-muted active:opacity-60"
          >
            设置
          </button>
        </div>
        <SettingsSheet
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onKeyCleared={() => setPhase("onboarding")}
          onRefresh={init}
        />
      </main>
    );
  }

  const cards = day?.cards ?? [];
  const palettes = assignPalettes(cards);
  const loading = phase === "booting" || phase === "loading";

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-14 pt-[max(env(safe-area-inset-top),1.5rem)]">
      {/* 页眉 */}
      <header className="fade-up flex items-end justify-between px-1">
        <div>
          <p className="text-[11px] tracking-[0.35em] text-muted">
            {todayLabel()}
          </p>
          <h1 className="mt-1.5 font-serif text-[2rem] font-black leading-none tracking-wide">
            重逢
          </h1>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="设置"
          className="mb-1 rounded-full p-2 text-muted active:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="2.6" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.02A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.02a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z" />
          </svg>
        </button>
      </header>
      <p
        className="fade-up mt-2 px-1 font-serif text-sm text-muted"
        style={{ animationDelay: "80ms" }}
      >
        与你划线的句子再见一面。
      </p>

      {/* 卡片流 */}
      <section className="mt-7 space-y-5">
        {cards.map((card, i) => (
          <NoteCard key={card.id} card={card} index={i} paletteIndex={palettes[i]} />
        ))}
        {(loading || busy === "shuffle") &&
          cards.length < INITIAL_CARDS &&
          Array.from({ length: INITIAL_CARDS - cards.length }, (_, i) => (
            <SkeletonCard key={`s${i}`} index={i} />
          ))}
      </section>

      {/* 空状态 */}
      {!loading && cards.length === 0 && (
        <div className="fade-up mt-16 text-center font-serif leading-loose text-muted">
          <p className="text-3xl" aria-hidden>
            ⌘
          </p>
          <p className="mt-4">
            还没有找到你的笔记。
            <br />
            去微信读书里划几条线，明天来重逢。
          </p>
        </div>
      )}

      {/* 抽更多 / 换一批 */}
      {cards.length > 0 && (
        <footer className="mt-9 flex flex-col items-center gap-3">
          {deckEmpty && (
            <p className="font-serif text-sm text-muted">
              今天的书签都翻完了，换一批会重新开始。
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={reshuffle}
              disabled={busy !== null || loading}
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3 font-serif text-[0.95rem] tracking-[0.2em] text-muted transition-opacity active:opacity-60 disabled:opacity-40"
            >
              <svg
                className={busy === "shuffle" ? "spin-slow" : undefined}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              >
                <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              换一批
            </button>
            {!deckEmpty && (
              <button
                onClick={drawMore}
                disabled={busy !== null || loading}
                aria-busy={busy === "more"}
                className="relative rounded-full border border-hairline bg-surface px-8 py-3 font-serif text-[0.95rem] tracking-[0.25em] shadow-sm transition-opacity active:opacity-60 disabled:opacity-40"
              >
                {/* 文字始终占位以固定按钮尺寸；loading 时隐藏文字、居中叠加旋转图标 */}
                <span className={busy === "more" ? "invisible" : undefined}>
                  再拾一张
                </span>
                {busy === "more" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="spin-slow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                    </svg>
                  </span>
                )}
              </button>
            )}
          </div>
          <p className="text-[11px] tracking-[0.2em] text-muted/70">
            今日已拾 {day?.usedIds.length ?? cards.length} 张
          </p>
        </footer>
      )}

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onKeyCleared={() => {
          setDay(null);
          setPhase("onboarding");
        }}
        onRefresh={init}
      />
    </main>
  );
}
