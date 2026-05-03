"use client";
import { useEffect, useState } from "react";

// Cycle 35-d: text-only mode toggle. Persists to localStorage and
// flips the .no-icons class on <html>; globals.css then hides every
// .game-icon element. No round-trip to the server, so the toggle is
// instant and survives page reloads.
const KEY = "icons:hidden";

export default function IconsToggle() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const v = typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
    setHidden(v);
    document.documentElement.classList.toggle("no-icons", v);
  }, []);
  function toggle() {
    const next = !hidden;
    setHidden(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* SSR / private mode */ }
    document.documentElement.classList.toggle("no-icons", next);
  }
  return (
    <button
      onClick={toggle}
      className="text-[10px] text-yellow-300/60 hover:text-yellow-200 underline"
      title="アイコンの表示・非表示を切り替え"
    >
      {hidden ? "アイコン表示" : "アイコン非表示"}
    </button>
  );
}
