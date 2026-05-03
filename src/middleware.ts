import { NextResponse, type NextRequest } from "next/server";

// Cycle 40-5 (Phase 1): 封印対象 route への直 URL アクセスを /town に
// redirect する。HudMenu からの導線は 40-2 で断ったが、`/abyss` 等の
// URL を直打ちすれば page が開いてしまう。matcher で対象を限定し、
// 他の route は素通りさせる。
//
// FEATURE_FREEZE_LIST.md の「封印 (Phase 1)」と同期させる。Phase 3 /
// Endgame で機能復活時は、この配列から該当 route を削除する。
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

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locked = PHASE_1_LOCKED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
  if (locked) {
    const url = request.nextUrl.clone();
    url.pathname = "/town";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// 対象 route のみで middleware を発火。それ以外 (/town, /battle, /api/*
// 等) は素通りで影響なし。
export const config = {
  matcher: [
    "/mastery/:path*",
    "/canon/:path*",
    "/pvp/:path*",
    "/boss/:path*",
    "/siege/:path*",
    "/raid/:path*",
    "/auction/:path*",
    "/abyss/:path*",
    "/ascension/:path*",
  ],
};
