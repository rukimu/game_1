// Custom server combining Next.js + Socket.io
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsed = parse(req.url, true);
    handle(req, res, parsed);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Make io available to API routes via globalThis
  global.__io = io;

  io.on("connection", (socket) => {
    socket.on("join", (room) => {
      if (typeof room === "string" && room.length < 200) socket.join(room);
    });
    socket.on("leave", (room) => {
      if (typeof room === "string") socket.leave(room);
    });
    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
