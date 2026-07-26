"use client";

import { useState } from "react";
import { setApiKey, validateKey, WeReadError } from "@/lib/weread";

/** 遮罩用的小圆点：比周围字符更小更疏，视觉上更轻 */
function Dots({ count }: { count: number }) {
  return (
    <span className="mx-[0.25em] text-[0.7em] tracking-[0.35em]">
      {"•".repeat(count)}
    </span>
  );
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        {/* 输入框本身的字形、光标、placeholder 全部透明，可见内容由下面那层
            遮罩渲染：这样字号可以自由控制（输入框必须保持 ≥16px，否则 iOS
            聚焦时会放大页面），Key 再长也不会溢出。
            展示方式参照微信读书自己的做法：保留首尾，中间用小圆点。 */}
        <div className="relative mt-2">
          <input
            id="apikey"
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder="wrk-"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-mono text-base text-transparent caret-transparent outline-none transition-colors placeholder:text-transparent focus:border-accent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center px-4 font-mono text-sm"
          >
            {key ? (
              <span className="text-muted">
                {key.length <= 12 ? (
                  <Dots count={key.length} />
                ) : (
                  <>
                    {key.slice(0, 8)}
                    <Dots count={12} />
                    {key.slice(-4)}
                  </>
                )}
              </span>
            ) : (
              <span className="text-muted/50">
                wrk-
                <Dots count={8} />
              </span>
            )}
          </div>
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
