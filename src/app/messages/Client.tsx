"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Thread = {
  otherId: string;
  otherName: string;
  otherLevel: number | null;
  lastBody: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
};
type Message = {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

let sharedSocket: Socket | null = null;
function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
  }
  return sharedSocket;
}

export default function MessagesClient({
  myCharacterId,
  threads,
  activeOther,
  messages,
}: {
  myCharacterId: string;
  threads: Thread[];
  activeOther: { id: string; name: string; level: number } | null;
  messages: Message[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  // Listen for live "dm:new" pushes for the current character. When a new
  // message arrives for the active thread we refresh; for any other thread
  // we still refresh so the sidebar badge updates.
  useEffect(() => {
    const s = getSocket();
    const room = `dm:${myCharacterId}`;
    s.emit("join", room);
    const onNew = () => router.refresh();
    s.on("dm:new", onNew);
    return () => {
      s.off("dm:new", onNew);
      s.emit("leave", room);
    };
  }, [myCharacterId, router]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeOther?.id]);

  async function send() {
    if (!activeOther || !body.trim()) return;
    setSending(true);
    setErr(null);
    const r = await fetch(`/api/dm/${activeOther.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!r.ok) {
      setErr((await r.json().catch(() => ({}))).error ?? "送信に失敗しました");
      setSending(false);
      return;
    }
    setBody("");
    setSending(false);
    router.refresh();
  }

  async function startNewThread() {
    if (!recipientName.trim()) return;
    setErr(null);
    const lookup = await fetch(`/api/characters/by-name?name=${encodeURIComponent(recipientName.trim())}`);
    if (!lookup.ok) {
      setErr("そのキャラクターが見つかりません");
      return;
    }
    const data = await lookup.json();
    if (!data.id || data.id === myCharacterId) {
      setErr("自分宛のDMは送れません");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("with", data.id);
    router.push(url.pathname + url.search);
  }

  function selectThread(otherId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("with", otherId);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <aside className="md:col-span-1 border border-yellow-900/40 rounded p-2 bg-black/20">
        <div className="mb-2">
          <div className="text-xs font-bold text-yellow-300/80 mb-1">新規メッセージ</div>
          <div className="flex gap-1">
            <input
              className="input flex-1"
              placeholder="相手の名前"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <button className="btn" onClick={startNewThread}>選択</button>
          </div>
        </div>
        <div className="text-xs font-bold text-yellow-300/80 mb-1">スレッド</div>
        {threads.length === 0 && <div className="text-yellow-200/50 text-xs">まだ誰ともやり取りしていません。</div>}
        <ul className="space-y-1">
          {threads.map((t) => {
            const active = activeOther?.id === t.otherId;
            return (
              <li key={t.otherId}>
                <button
                  onClick={() => selectThread(t.otherId)}
                  className={`w-full text-left rounded p-2 text-sm border ${active ? "bg-yellow-900/40 border-yellow-700/70" : "bg-black/30 border-yellow-900/40 hover:bg-yellow-900/30"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-yellow-100">
                      {t.otherName}
                      {t.otherLevel !== null && <span className="text-yellow-200/60 text-xs"> Lv{t.otherLevel}</span>}
                    </span>
                    {t.unread > 0 && (
                      <span className="text-[10px] bg-red-700 text-white rounded px-1.5 py-0.5">{t.unread}</span>
                    )}
                  </div>
                  <div className="text-xs text-yellow-200/60 truncate mt-0.5">
                    {t.lastFromMe && <span className="text-yellow-300/60">→ </span>}
                    {t.lastBody}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className="md:col-span-2 border border-yellow-900/40 rounded p-2 bg-black/20 flex flex-col" style={{ minHeight: "24rem" }}>
        {!activeOther ? (
          <div className="flex-1 flex items-center justify-center text-yellow-200/50 text-sm">
            相手を選ぶか、相手の名前で新規スレッドを開いてください。
          </div>
        ) : (
          <>
            <div className="text-sm font-bold text-yellow-200 border-b border-yellow-900/40 pb-1 mb-2">
              {activeOther.name} <span className="text-xs text-yellow-200/60">Lv{activeOther.level}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {messages.length === 0 && (
                <div className="text-yellow-200/50 text-xs">最初のメッセージを送りましょう。</div>
              )}
              {messages.map((m) => {
                const fromMe = m.fromCharacterId === myCharacterId;
                return (
                  <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded p-2 max-w-[85%] text-sm ${
                        fromMe
                          ? "bg-yellow-800/40 border border-yellow-700/40"
                          : "bg-black/40 border border-yellow-900/40"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="text-[10px] text-yellow-200/40 mt-0.5">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={listEndRef} />
            </div>
            <div className="mt-2 flex gap-1">
              <input
                className="input flex-1"
                placeholder="メッセージを入力（最大500文字）"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !sending) {
                    e.preventDefault();
                    send();
                  }
                }}
                maxLength={500}
              />
              <button className="btn-primary" onClick={send} disabled={sending || !body.trim()}>送信</button>
            </div>
            {err && <div className="text-red-400 text-xs mt-1">{err}</div>}
          </>
        )}
      </section>
    </div>
  );
}
