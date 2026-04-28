import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

const SESSION_COOKIE = "rpg_session";
const SESSION_DAYS = 30;

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string) {
  const token = randomUUID() + randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const c = cookies().get(SESSION_COOKIE);
  if (c) {
    await prisma.session.deleteMany({ where: { token: c.value } });
    cookies().delete(SESSION_COOKIE);
  }
}

export async function getCurrentUser() {
  const c = cookies().get(SESSION_COOKIE);
  if (!c) return null;
  const session = await prisma.session.findUnique({
    where: { token: c.value },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.isBanned) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Response("Forbidden", { status: 403 });
  return user;
}

export async function getCharacterForUser(characterId: string, userId: string) {
  return prisma.character.findFirst({ where: { id: characterId, userId } });
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
