import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin().catch((r) => r);
  if (admin instanceof Response) return admin;
  const [users, characters, chats, generated, battles, trades, auctions, season] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.character.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.generatedContent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.battle.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
    prisma.trade.findMany({ include: { from: true, to: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.auctionListing.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.season.findFirst({ where: { isCurrent: true } }),
  ]);
  return NextResponse.json({ users, characters, chats, generated, battles, trades, auctions, season });
}
