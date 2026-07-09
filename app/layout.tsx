import type { Metadata, Viewport } from "next";
import "./globals.css";

// 自托管的中文字体（朱雀仿宋，OFL-1.1）：完整 CJK 覆盖、按 unicode-range 分片按需加载，
// 不依赖 Google Fonts（对国内用户不可达）。产物在 public/fonts/zhuque/，
// 用 <link> 而非 JS import，让分片 CSS 中的相对 url() 按静态资源路径解析。
const ZHUQUE_FANGSONG_CSS = "/fonts/zhuque/zhuque-fangsong.css";

export const metadata: Metadata = {
  title: "重逢 ReRead",
  description: "每天从你的微信读书划线里，随机挑三条给你看。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "重逢",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1815" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* React 19 原生 <link> 资源提示：自动去重并提升到 <head>，
          无需手写 <head>（根 layout 里手写 head 是反模式，见 Next.js 文档） */}
      <link rel="stylesheet" href={ZHUQUE_FANGSONG_CSS} precedence="default" />
      <html lang="zh-CN" className="h-full antialiased">
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </>
  );
}
