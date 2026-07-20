import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { initSocketServer, setIoInstance } from "./src/lib/chat/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
  });

  initSocketServer(io);
  setIoInstance(io);

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port} (WebSocket: /api/socketio)`);
  });
});
