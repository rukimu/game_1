"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TownActions({ townId }: { townId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function rest() {
    setLoading("rest");
    await fetch(`/api/towns/${townId}/rest`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }
  async function listenRumor() {
    setLoading("rumor");
    await fetch(`/api/towns/${townId}/rumors/generate`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }
  async function generateQuest() {
    setLoading("quest");
    await fetch(`/api/quests/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ townId }) });
    setLoading(null);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn" onClick={rest} disabled={loading !== null}>{loading === "rest" ? "..." : "宿屋で休む"}</button>
      <button className="btn" onClick={listenRumor} disabled={loading !== null}>{loading === "rumor" ? "..." : "酒場で噂を聞く"}</button>
      <button className="btn" onClick={generateQuest} disabled={loading !== null}>{loading === "quest" ? "..." : "新しいクエストを掲示"}</button>
    </div>
  );
}
