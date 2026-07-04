"use client";

import { clearDayState } from "@/lib/daily";
import { clearApiKey, clearDataCache, getApiKey, isDemoKey } from "@/lib/weread";

export default function SettingsSheet({
  open,
  onClose,
  onKeyCleared,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onKeyCleared: () => void;
  onRefresh: () => void;
}) {
  if (!open) return null;

  const key = getApiKey();
  const masked = isDemoKey(key)
    ? "体验模式（示例笔记）"
    : key
      ? `${key.slice(0, 8)}····${key.slice(-4)}`
      : "未设置";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="设置"
        className="fade-up w-full max-w-md rounded-t-3xl bg-surface px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-hairline" />
        <h2 className="font-serif text-lg font-semibold">设置</h2>

        <dl className="mt-4 rounded-xl border border-hairline px-4 py-3">
          <dt className="text-xs tracking-[0.2em] text-muted">API KEY</dt>
          <dd className="mt-1 font-mono text-sm">{masked}</dd>
        </dl>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              clearDataCache();
              clearDayState();
              onClose();
              onRefresh();
            }}
            className="w-full rounded-xl border border-hairline py-3 text-sm transition-opacity active:opacity-60"
          >
            清除本地缓存并重新加载
          </button>
          <button
            onClick={() => {
              clearApiKey();
              clearDataCache();
              clearDayState();
              onClose();
              onKeyCleared();
            }}
            className="w-full rounded-xl border border-hairline py-3 text-sm text-accent transition-opacity active:opacity-60"
          >
            更换 API Key
          </button>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          重逢 ReRead · 与你划过的句子再见一面
          <br />
          数据仅保存在本机浏览器
        </p>
      </div>
    </div>
  );
}
