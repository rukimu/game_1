import { NextResponse, type NextRequest } from "next/server";

// Cycle 40-5 (Phase 1): 封印対象 route への直 URL アクセスを /town に
// redirect する。
// Cycle 54 (Phase 4-c): 全 route にセキュリティレスポンスヘッダを付与する
// レイヤを追加 (CSP / X-Frame-Options / Referrer-Policy 等)。
const PHASE_1_LOCKED_PREFIXES = [
  "/mastery",
  "/canon",
  "/pvp",
  "/boss",
  "/siege",
  "/raid",
  "/auction",
  "/abyss",
  "/ascension",
];

// Phase 4-c: 公開時に最低限欲しいセキュリティヘッダ。Stripe / Socket.io /
// 自前 CDN を考慮して default-src は self、script は self + inline (Next.js
// の hydration script を許可) のみ。dev 中は CSP 違反で hot reload が
// 死にやすいので NODE_ENV=production の時だけ強めに付ける。
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  if (process.env.NODE_ENV === "production") {
    // 簡易 CSP: 自分のドメインのみ。Socket.io は同居なので 'self' のみで OK。
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return res;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locked = PHASE_1_LOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
  if (locked) {
    const url = request.nextUrl.clone();
    url.pathname = "/town";
    url.search = "";
    return applySecurityHeaders(NextResponse.redirect(url));
  }
  return applySecurityHeaders(NextResponse.next());
}

// 全 route で middleware を発火させてセキュリティヘッダを付与する。
// 静的アセット (_next/static, /favicon.ico, /icons) は実体が CDN cache 想定で
// あり、また高頻度アクセスなので除外して overhead を避ける。
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons/.*).*)",
  ],
};
