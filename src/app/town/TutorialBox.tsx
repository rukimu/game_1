"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TutorialBox({
  hint,
}: {
  hint: { step: number; title: string; body: string; actionLabel?: string; actionHref?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      await fetch("/api/tutorial/dismiss", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-amber-700/60 bg-amber-900/20 rounded p-3 my-2">
      <div className="flex justify-between items-baseline gap-2">
        <div className="text-sm font-bold text-amber-200">★ {hint.title}</div>
        <button
          className="text-[10px] text-yellow-200/60 hover:text-yellow-100 underline"
          disabled={busy}
          onClick={dismiss}
        >
          ヒントを閉じる
        </button>
      </div>
      <div className="text-xs text-yellow-100/90 mt-1">{hint.body}</div>
      {hint.actionLabel && hint.actionHref && (
        <div className="mt-2">
          <Link href={hint.actionHref} className="btn-primary text-xs">
            {hint.actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
