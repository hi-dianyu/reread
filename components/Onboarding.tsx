"use client";

import { useState } from "react";
import { setApiKey, validateKey, WeReadError } from "@/lib/weread";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 输入框横向滚动位置，用于让星号遮罩跟随长 Key 一起滚动 */
  const [maskScroll, setMaskScroll] = useState(0);

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await validateKey(trimmed);
      setApiKey(trimmed);
      onDone();
    } catch (err) {
      setError(
        err instanceof WeReadError ? err.message : "校验失败，请检查网络后重试"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fade-up mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-8 pb-10 pt-[max(env(safe-area-inset-top),2rem)]">
      <p className="text-[11px] tracking-[0.5em] text-muted">RE·READ</p>
      <h1 className="mt-3 font-serif text-5xl font-black tracking-wide">再读</h1>
      <p className="mt-5 font-serif text-[1.05rem] leading-[1.9] text-muted">
        每天三条你在微信读书划线过的句子
      </p>

      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault();
          submit(key);
        }}
      >
        <label htmlFor="apikey" className="text-xs tracking-[0.2em] text-muted">
          粘贴你的微信读书 API Key
        </label>
        {/* 原生 password 只能渲染圆点（CSS text-security 无星号选项），
            所以让真实输入框的字形透明，上面叠一层同字体同字距的 ★，
            这样粘贴/光标/全选等原生行为不变，视觉上是柔和的星号。 */}
        <div className="relative mt-2">
          <input
            id="apikey"
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder="wrk-········"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onScroll={(e) => setMaskScroll(e.currentTarget.scrollLeft)}
            /* 字号必须 ≥16px：iOS Safari 聚焦小于 16px 的输入框会自动放大页面 */
            className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-mono text-base tracking-[0.1em] text-transparent caret-foreground outline-none transition-colors placeholder:text-muted/50 focus:border-accent"
          />
          {key && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
            >
              <div
                className="flex h-full items-center whitespace-pre px-4 font-mono text-base tracking-[0.1em] text-muted"
                style={{ transform: `translateX(${-maskScroll}px)` }}
              >
                {"★".repeat(key.length)}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-accent">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !key.trim()}
          className="mt-4 w-full rounded-xl bg-foreground py-3.5 font-serif text-[1.05rem] font-semibold tracking-[0.3em] text-background transition-opacity active:opacity-70 disabled:opacity-40"
        >
          {busy ? "正在校验…" : "开 始"}
        </button>
      </form>

      {/* 取 Key 的步骤 */}
      <ol className="mt-6 space-y-3 rounded-xl border border-hairline bg-surface px-5 py-4">
        {[
          "打开微信读书 App，进入「设置」",
          "打开「微信读书 Skill」",
          "选择「复制 Key」",
        ].map((step, i) => (
          <li key={i} className="flex items-baseline gap-3 text-sm leading-relaxed">
            <span className="shrink-0 font-serif text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
