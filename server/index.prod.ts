import { Server } from "colyseus";
import { createServer } from "http";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);

const gameServer = new Server({
  server: createServer(),
});

gameServer.define("game_room", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`🎮 Colyseus Game Server is running on port ${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}`);
}).catch((err) => {
  console.error("❌ Failed to start Colyseus server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully...");
  gameServer.gracefullyShutdown().then(() => {
    console.log("✅ Server shut down successfully");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully...");
  gameServer.gracefullyShutdown().then(() => {
    console.log("✅ Server shut down successfully");
    process.exit(0);
  });
});
