# 重逢 ReRead

> 那些你在微信读书里划下的句子，值得再见一面。

一个移动端优先的小应用：每天从你的微信读书笔记里随机翻出 **三张卡片**——划线、想法或书评。想多看几张，点「再拾一张」即可。同一天内抽到的卡片保持不变，第二天自动换新。

## 功能

- **每日三张书签卡片**：以日期为随机种子，按书籍笔记数加权抽取，当天不重复
- **三种卡片**：划线（原文）、想法（原文 + 你的批注）、书评（含星级）
- **再拾一张**：无限继续抽，直到当天笔记翻完
- **一键复制**：复制成「引文 ——《书名》作者」的分享格式
- **跳回原文**：通过 `weread://` 深度链接直接在微信读书 App 中打开对应划线
- **体验模式**：没有 Key 也可以先用内置示例笔记预览
- **PWA**：可「添加到主屏幕」当作 App 使用，深色模式自动跟随系统

## 隐私

- API Key 只保存在你手机浏览器的 localStorage 里，**服务端不存储任何数据**
- 服务端只是一层纯转发代理（浏览器无法直接跨域访问微信读书网关），且只允许三个只读接口
- 笔记数据缓存在本机，可在设置中随时清除

## 使用

1. 在微信读书 App 中获取你的 AI 助手 API Key（`wrk-` 开头）
2. 打开应用，粘贴 Key，开始

## 开发

```bash
npm install
npm run dev
```

技术栈：Next.js 16（App Router）+ React 19 + Tailwind CSS v4。中文字体使用自托管的 [霞鹜文楷屏幕阅读版](https://github.com/lxgw/LxgwWenKai-Screen)（按 unicode-range 分片按需加载，不依赖 Google Fonts）。

```
app/
  page.tsx            主页面（抽卡流程与状态机）
  api/weread/route.ts 微信读书网关代理（只读白名单）
components/
  NoteCard.tsx        笔记卡片
  Onboarding.tsx      首次引导 / 输入 Key
  SettingsSheet.tsx   设置面板
lib/
  weread.ts           网关客户端 + 本地缓存
  daily.ts            每日种子随机与抽卡逻辑
  demo.ts             体验模式示例数据
```

## 部署

标准 Next.js 应用，`vercel deploy` 即可，无需任何环境变量。
