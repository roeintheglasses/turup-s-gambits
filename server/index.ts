import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";

const port = process.env.COLYSEUS_PORT || 2567;
const app = express();

// Colyseus server
const gameServer = new Server({
  server: createServer(app),
});

// Register game room
gameServer.define("game_room", GameRoom);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

gameServer.listen(port);
console.log(`🎮 Colyseus game server listening on ws://localhost:${port}`);
