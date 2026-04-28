import type { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io: IOServer | undefined;
}

export function setIO(io: IOServer) {
  global.__io = io;
}

export function getIO(): IOServer | undefined {
  return global.__io;
}

export function emitChat(channel: string, payload: any) {
  getIO()?.to(channel).emit("chat:new", payload);
}

export function emitBattle(battleId: string, event: string, payload: any) {
  getIO()?.to(`battle:${battleId}`).emit(event, payload);
}

export function emitTown(townId: string, event: string, payload: any) {
  getIO()?.to(`town:${townId}`).emit(event, payload);
}

export function emitParty(partyId: string, event: string, payload: any) {
  getIO()?.to(`party:${partyId}`).emit(event, payload);
}

export function emitGuild(guildId: string, event: string, payload: any) {
  getIO()?.to(`guild:${guildId}`).emit(event, payload);
}
