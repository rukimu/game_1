import { NextResponse } from "next/server";
import { QUIZ } from "@/lib/quiz";

export async function GET() {
  const safe = QUIZ.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
  }));
  return NextResponse.json({ questions: safe });
}
