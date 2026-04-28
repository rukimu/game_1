import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const COOKIE = "rpg_char";

export function setActiveCharacterCookie(characterId: string) {
  cookies().set(COOKIE, characterId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });
}

export function clearActiveCharacterCookie() {
  cookies().delete(COOKIE);
}

export async function getActiveCharacter() {
  const user = await getCurrentUser();
  if (!user) return null;
  const id = cookies().get(COOKIE)?.value;
  if (!id) return null;
  const c = await prisma.character.findFirst({
    where: { id, userId: user.id },
    include: {
      user: true,
      jobHistory: { include: { job: true } },
      partyMembers: { include: { party: true } },
      guildMember: { include: { guild: true } },
    },
  });
  return c;
}

export async function requireActiveCharacter() {
  const c = await getActiveCharacter();
  if (!c) throw new Response("character not selected", { status: 400 });
  return c;
}
