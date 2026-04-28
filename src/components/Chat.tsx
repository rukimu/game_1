"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Msg = { id: string; senderName: string; body: string; createdAt: string };

let sharedSocket: Socket | null = null;
function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
  }
  return sharedSocket;
}

export default function Chat({ channel, title }: { channel: string; title: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/chat/${encodeURIComponent(channel)}`).then((r) => r.json()).then((d) => {
      if (cancel) return;
      if (d.messages) setMsgs(d.messages);
    });
    const s = getSocket();
    s.emit("join", channel);
    const handler = (m: Msg) => setMsgs((prev) => [...prev, m]);
    s.on("chat:new", handler);
    return () => {
      cancel = true;
      s.off("chat:new", handler);
      s.emit("leave", channel);
    };
  }, [channel]);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!text.trim()) return;
    const res = await fetch(`/api/chat/${encodeURIComponent(channel)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (res.ok) setText("");
    else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "送信失敗");
    }
  }

  return (
    <div className="panel">
      <div className="font-bold text-yellow-200 mb-2 text-sm">{title}</div>
      <div ref={ref} className="scrollbar-y h-64 mb-2 border border-yellow-900/40 rounded p-2 bg-black/30">
        {msgs.map((m) => (
          <div key={m.id} className="log-line">
            <span className="text-yellow-300">{m.senderName}</span>: {m.body}
          </div>
        ))}
        {msgs.length === 0 && <div className="text-yellow-200/40 text-xs">まだ発言はありません。</div>}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="メッセージを入力" />
        <button className="btn-primary">送信</button>
      </form>
      {err && <div className="text-red-400 text-xs mt-1">{err}</div>}
    </div>
  );
}
