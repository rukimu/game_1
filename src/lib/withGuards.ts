// Cycle 52 (Phase 4-b): API route 共通ガード。Next.js App Router の
// `route.ts` ハンドラを薄くラップし、認証 / レート制限 / Mute 判定 /
// audit log を 1 行で適用できるようにする。
//
// 採用方針:
// - 個別の helper (requireUserOrThrow / requireNotMutedOrThrow /
//   applyRateLimitOrThrow) を export し、呼び出し側で必要な分だけ
//   選んで使えるようにする。
// - 加えて高階関数 `withGuards(handler, opts)` を提供し、典型的な
//   組み合わせ (rateLimit + audit + requireMute) を 1 行で適用可能。
// - 副作用 (audit) は best-effort で握り潰す。`/* non-fatal */` の濫用
//   を避けるため、エラーは console.error に明示的に残す (CLAUDE.md §10.6
//   禁止事項に対応)。

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS, type RateLimitConfig } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

export type GuardUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

// 認証チェック。失敗時は 401 Response を throw。成功時はユーザを返す。
export async function requireUserOrThrow(): Promise<GuardUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  return { id: user.id, email: user.email, isAdmin: user.isAdmin };
}

// 管理者チェック。普通のユーザの場合は 403 Response を throw。
export async function requireAdminOrThrow(): Promise<GuardUser> {
  const user = await requireUserOrThrow();
  if (!user.isAdmin) {
    throw NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }
  return user;
}

// 現時点で発効中の Mute があるかを返す (期限切れは無視)。
export async function isUserMuted(userId: string): Promise<boolean> {
  const now = new Date();
  const active = await prisma.mute.findFirst({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  return active != null;
}

// Mute 中のユーザは投稿系 API を実行不可。403 Response を throw。
export async function requireNotMutedOrThrow(userId: string): Promise<void> {
  if (await isUserMuted(userId)) {
    throw NextResponse.json({ error: "ミュート中です" }, { status: 403 });
  }
}

// レート制限。超過時は 429 Response を throw。
export function applyRateLimitOrThrow(key: string, cfg: RateLimitConfig): void {
  if (!checkRateLimit(key, cfg)) {
    throw NextResponse.json({ error: "リクエストが集中しています" }, { status: 429 });
  }
}

export type GuardOptions = {
  // 認証 (default: true)
  requireAuth?: boolean;
  requireAdmin?: boolean;
  // ミュート判定 (chat 系 endpoint で true にする)
  requireNotMuted?: boolean;
  // レート制限
  rateLimit?: {
    preset: keyof typeof RATE_LIMITS;
    // ユーザ毎 or キャラ毎で別 bucket を切る場合に追加 suffix を渡す
    keyExtra?: (req: AnyReq) => string | null;
  };
  // 監査ログ (成功時のみ記録)
  audit?: {
    action: string;
    targetType?: string;
    // payload を post 解決して詰めたい場合
    extractTargetId?: (req: AnyReq) => string | null;
  };
};

// Next.js App Router は Request / NextRequest どちらでも受けられるよう
// 型を緩めにしておく。第二引数 ctx は params 等 Next.js が渡すもの。
type AnyReq = Request | NextRequest;
type RouteCtx = { params: Record<string, string | string[]> };
type RouteHandler<R extends AnyReq = AnyReq> = (req: R, ctx: RouteCtx) => Promise<Response>;

// 高階関数: 既存ハンドラを共通ガードでラップする。失敗時は対応する
// HTTP Response を返し、成功時のみ handler を呼ぶ。
export function withGuards<R extends AnyReq>(
  handler: RouteHandler<R>,
  opts: GuardOptions = {},
): RouteHandler<R> {
  return async (req, ctx) => {
    let user: GuardUser | null = null;
    try {
      // 1. 認証
      if (opts.requireAdmin) {
        user = await requireAdminOrThrow();
      } else if (opts.requireAuth ?? true) {
        user = await requireUserOrThrow();
      }
      // 2. ミュート
      if (opts.requireNotMuted && user) {
        await requireNotMutedOrThrow(user.id);
      }
      // 3. レート制限
      if (opts.rateLimit) {
        const presetCfg = RATE_LIMITS[opts.rateLimit.preset];
        const userKey = user?.id ?? "anonymous";
        const extra = opts.rateLimit.keyExtra?.(req) ?? "";
        const key = `${opts.rateLimit.preset}:${userKey}:${extra}`;
        applyRateLimitOrThrow(key, presetCfg);
      }
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }

    // 4. ハンドラ実行
    const response = await handler(req, ctx);

    // 5. 監査ログ (成功時のみ、async で fire-and-forget)
    if (opts.audit && response.ok && user) {
      const targetId = opts.audit.extractTargetId?.(req) ?? null;
      recordAudit({
        actorType: "user",
        actorId: user.id,
        action: opts.audit.action,
        targetType: opts.audit.targetType ?? null,
        targetId,
      }).catch((err) => {
        console.error("[audit] recordAudit failed:", err);
      });
    }

    return response;
  };
}
