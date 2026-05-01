import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { scoreQuiz } from "@/lib/quiz";
import { getCuratedJobsByCategory, getCuratedJobs } from "@/lib/curatedJob";

export const dynamic = "force-dynamic";

const schema = z.object({
  // Optional — when supplied, suggestions match the top archetype.
  // When omitted, returns the full curated catalog so the player can
  // browse all hand-crafted personalities.
  quizAnswers: z.record(z.string()).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser().catch((r) => r);
  if (user instanceof Response) return user;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "bad input" }, { status: 400 });

  let archetype: string | null = null;
  let jobs;
  if (parsed.data.quizAnswers && Object.keys(parsed.data.quizAnswers).length > 0) {
    const result = scoreQuiz(parsed.data.quizAnswers);
    archetype = result.topArchetype;
    jobs = await getCuratedJobsByCategory(archetype);
  } else {
    jobs = await getCuratedJobs();
  }

  return NextResponse.json({
    archetype,
    candidates: jobs.map((j) => ({
      name: j.name,
      category: j.category,
      rank: j.rank,
      description: j.description,
      quirk: j.quirk,
      signatureOutfit: j.signatureOutfit,
      signatureBio: j.signatureBio,
      skills: j.skills.map((s) => ({
        name: s.name,
        description: s.description,
        type: s.type,
        element: s.element,
        cost: s.cost,
      })),
    })),
  });
}
