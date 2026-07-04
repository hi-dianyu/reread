import type { Metadata, Viewport } from "next";
// 自托管的中文字体：完整 CJK 覆盖、按 unicode-range 分片按需加载，
// 不依赖 Google Fonts（对国内用户不可达，且部分字形缺失导致混排）
import "lxgw-wenkai-screen-webfont/lxgwwenkaiscreen.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "重逢 ReRead",
  description: "每天三张卡片，与你在微信读书划过的句子重逢。",
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
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
