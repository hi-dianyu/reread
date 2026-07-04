import { NextRequest, NextResponse } from "next/server";

const GATEWAY = "https://i.weread.qq.com/api/agent/gateway";
const SKILL_VERSION = "1.0.3";

/**
 * 只代理本应用需要的只读接口。
 * 浏览器无法直接跨域访问微信读书网关，这里做一层纯转发：
 * Key 由客户端每次随请求携带，服务端不存储。
 */
const ALLOWED_APIS = new Set([
  "/user/notebooks",
  "/book/bookmarklist",
  "/review/list/mine",
]);

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-weread-key");
  if (!key || !key.startsWith("wrk-")) {
    return NextResponse.json({ error: "缺少有效的 API Key" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const apiName = body.api_name;
  if (typeof apiName !== "string" || !ALLOWED_APIS.has(apiName)) {
    return NextResponse.json({ error: "不支持的接口" }, { status: 400 });
  }

  try {
    const upstream = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, skill_version: SKILL_VERSION }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[weread-proxy]", apiName, err);
    return NextResponse.json(
      { error: "连接微信读书服务失败，请稍后再试" },
      { status: 502 }
    );
  }
}
