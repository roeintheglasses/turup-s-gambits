import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GameManager } from "@/app/lib/game-manager";
import { GameRoom, Player } from "@/app/types/game";

const gameManager = GameManager.getInstance();

// Cache to track recently processed requests to prevent duplicates
const processedRequests = new Map<string, number>();

// Store pending messages for clients that might reconnect
const pendingMessages = new Map<
  string,
  Array<{ timestamp: number; message: any }>
>();

// Maximum age for pending messages (5 minutes)
const MAX_PENDING_MESSAGE_AGE = 5 * 60 * 1000;

// Maximum time to wait for subscription (3 seconds)
const SUBSCRIPTION_TIMEOUT = 3000;

// Helper function to broadcast a message to a room
async function broadcastToRoom(roomId: string, message: any) {
  try {
    // Generate a unique ID for this message
    const messageId = JSON.stringify({
      roomId,
      type: message.type,
      payload: message.payload,
    });

    // Check if we've recently processed this exact message
    const now = Date.now();
    const lastProcessed = processedRequests.get(messageId);
    if (lastProcessed && now - lastProcessed < 5000) {
      // 5 second deduplication window
      console.log(`[Realtime API] Skipping duplicate message: ${message.type}`);
      return true; // Pretend we sent it
    }

    // Mark this message as processed
    processedRequests.set(messageId, now);

    // Clean up old entries
    if (processedRequests.size > 100) {
      // Keep only recent entries
      const cutoff = now - 60000; // 1 minute
      for (const [key, timestamp] of processedRequests.entries()) {
        if (timestamp < cutoff) {
          processedRequests.delete(key);
        }
      }
    }

    // Store the message in pending messages for this room
    if (!pendingMessages.has(roomId)) {
      pendingMessages.set(roomId, []);
    }

    // Add message to pending list with timestamp
    pendingMessages.get(roomId)!.push({
      timestamp: now,
      message: message,
    });

    // Clean up old messages
    pendingMessages.set(
      roomId,
      pendingMessages
        .get(roomId)!
        .filter((item) => now - item.timestamp < MAX_PENDING_MESSAGE_AGE)
    );

    // Try to use Supabase Realtime with a timeout
    let realtimeSuccess = false;
    try {
      const channelName = `room:${roomId}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: "" }, // Enable presence to improve connection reliability
        },
      });

      // Subscribe to the channel with a timeout
      const subscriptionPromise = new Promise<boolean>((resolve) => {
        channel.subscribe((status) => {
          console.log(`[Realtime API] Channel ${channelName} status:`, status);
          if (status === "SUBSCRIBED") {
            resolve(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            resolve(false);
          }
        });
      });

      // Add a timeout to the subscription promise
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), SUBSCRIPTION_TIMEOUT);
      });

      // Wait for either subscription or timeout
      realtimeSuccess = await Promise.race([
        subscriptionPromise,
        timeoutPromise,
      ]);

      if (realtimeSuccess) {
        // Then send the message
        await channel.send({
          type: "broadcast",
          event: "message",
          payload: message,
        });

        console.log(
          `[Realtime API] Broadcasted to room ${roomId}:`,
          message.type
        );
      } else {
        console.log(
          `[Realtime API] Failed to subscribe to channel ${channelName}, falling back to REST API`
        );
      }

      // Unsubscribe after sending
      setTimeout(() => {
        channel.unsubscribe();
      }, 1000);
    } catch (realtimeError) {
      console.error(
        `[Realtime API] Error with Supabase Realtime for room ${roomId}:`,
        realtimeError
      );
      realtimeSuccess = false;
    }

    // If Realtime failed, we'll rely on the REST API and client polling
    // The message is already stored in pendingMessages, so it will be delivered
    // when the client reconnects or polls for updates

    return true; // We consider the operation successful even if Realtime failed
  } catch (error) {
    console.error(
      `[Realtime API] Error broadcasting to room ${roomId}:`,
      error
    );
    return false;
  }
}

// Helper function to get pending messages for a room - used by the GET endpoint
async function getPendingMessagesForRoom(roomId: string) {
  if (!pendingMessages.has(roomId)) {
    return [];
  }

  // Return messages but don't clear the list - they'll be cleared after a timeout
  return pendingMessages.get(roomId)!.map((item) => item.message);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    // Generate a unique ID for this request
    const requestId = JSON.stringify({ type, payload });

    // Check if we've recently processed this exact request
    const now = Date.now();
    const lastProcessed = processedRequests.get(requestId);
    if (lastProcessed && now - lastProcessed < 5000) {
      // 5 second deduplication window
      console.log(`[Realtime API] Skipping duplicate request: ${type}`);
      return NextResponse.json({ success: true, deduplicated: true });
    }

    // Mark this request as processed
    processedRequests.set(requestId, now);

    console.log(`[Realtime API] Received ${type} request:`, payload);

    switch (type) {
      case "player:joined": {
        const { playerName } = payload;
        const roomId =
          payload.roomId ||
          (typeof payload === "object" && "roomId" in payload
            ? payload.roomId
            : null);

        if (!roomId || !playerName) {
          return NextResponse.json(
            { error: "Missing roomId or playerName" },
            { status: 400 }
          );
        }

        // Get or create room
        let roomState: GameRoom;
        const existingGameRoom = gameManager.getRoom(roomId);
        const existingPlayer = existingGameRoom?.players.find(
          (p) => p.name === playerName
        );

        if (!existingPlayer) {
          // Create room if it doesn't exist
          if (!existingGameRoom) {
            // Create a new room with the specified ID instead of generating a new one
            const newRoom: GameRoom = {
              id: roomId,
              players: [],
              gameState: {
                currentTurn: null,
                trumpSuit: null,
                currentBid: 0,
                currentBidder: null,
                trickCards: {},
                roundNumber: 0,
                gamePhase: "waiting",
              },
              createdAt: Date.now(),
              lastActivity: Date.now(),
            };
            gameManager.getRooms().set(roomId, newRoom);
            roomState = newRoom;
            console.log(`[Realtime API] Created new room with ID ${roomId}`);
          } else {
            gameManager.addPlayerToRoom(roomId, playerName);
            roomState = gameManager.getRoom(roomId)!;
          }
          console.log(
            `[Realtime API] Player ${playerName} added to GameManager for room ${roomId}`
          );
        } else {
          if (!existingGameRoom) {
            throw new Error("Unexpected state: existingGameRoom is undefined");
          }
          roomState = existingGameRoom;
          console.log(
            `[Realtime API] Player ${playerName} already exists in GameManager for room ${roomId}`
          );
        }

        // Broadcast to the room - only send player:joined if this is a new player
        // First, send a room:joined message with the current state
        await broadcastToRoom(roomId, {
          type: "room:joined",
          payload: roomState,
        });

        // Then send a room:updated message with the current state
        await broadcastToRoom(roomId, {
          type: "room:updated",
          payload: roomState,
        });

        // Always send a player:joined message to ensure all clients are in sync
        // This ensures all players see each other
        console.log(
          `[Realtime API] Broadcasting player:joined for ${playerName}`
        );

        // Find the player object with complete information
        const playerInfo = roomState.players.find((p) => p.name === playerName);

        await broadcastToRoom(roomId, {
          type: "player:joined",
          payload: {
            name: playerName,
            id: playerInfo?.id || Math.random().toString(36).substring(2, 9),
            isHost: playerInfo?.isHost || false,
            roomId: roomId,
          },
        });

        // Send a full room state update to ensure all clients have the complete player list
        await broadcastToRoom(roomId, {
          type: "room:full-state",
          payload: roomState,
        });

        // Also send individual player:joined messages for all existing players to ensure everyone is in sync
        if (roomState.players.length > 0) {
          console.log(
            `[Realtime API] Broadcasting all players in room ${roomId}`
          );

          // For each player in the room, send a player:joined message
          for (const player of roomState.players) {
            console.log(
              `[Realtime API] Broadcasting player:joined for ${player.name}`
            );

            await broadcastToRoom(roomId, {
              type: "player:joined",
              payload: {
                name: player.name,
                id: player.id,
                isHost: player.isHost,
                roomId: roomId,
              },
            });
          }
        }

        return NextResponse.json({ success: true, roomState });
      }

      case "room:join": {
        const { roomId, playerName } = payload;
        if (!roomId || !playerName) {
          return NextResponse.json(
            { error: "Missing roomId or playerName" },
            { status: 400 }
          );
        }

        // Get or create room
        let roomState: GameRoom;
        const existingGameRoom = gameManager.getRoom(roomId);
        const existingPlayer = existingGameRoom?.players.find(
          (p) => p.name === playerName
        );

        if (!existingPlayer) {
          // Create room if it doesn't exist
          if (!existingGameRoom) {
            // Create a new room with the specified ID instead of generating a new one
            const newRoom: GameRoom = {
              id: roomId,
              players: [],
              gameState: {
                currentTurn: null,
                trumpSuit: null,
                currentBid: 0,
                currentBidder: null,
                trickCards: {},
                roundNumber: 0,
                gamePhase: "waiting",
              },
              createdAt: Date.now(),
              lastActivity: Date.now(),
            };
            gameManager.getRooms().set(roomId, newRoom);
            roomState = newRoom;
            console.log(`[Realtime API] Created new room with ID ${roomId}`);
          } else {
            gameManager.addPlayerToRoom(roomId, playerName);
            roomState = gameManager.getRoom(roomId)!;
          }
          console.log(
            `[Realtime API] Player ${playerName} added to GameManager for room ${roomId}`
          );
        } else {
          if (!existingGameRoom) {
            throw new Error("Unexpected state: existingGameRoom is undefined");
          }
          roomState = existingGameRoom;
          console.log(
            `[Realtime API] Player ${playerName} already exists in GameManager for room ${roomId}`
          );
        }

        // Broadcast to the room
        await broadcastToRoom(roomId, {
          type: "room:joined",
          payload: roomState,
        });
        await broadcastToRoom(roomId, {
          type: "room:updated",
          payload: roomState,
        });

        // Send complete player information for the newly joined player
        const playerInfo = roomState.players.find((p) => p.name === playerName);

        // Broadcast player:joined for the new player to everyone
        await broadcastToRoom(roomId, {
          type: "player:joined",
          payload: {
            name: playerName,
            id: playerInfo?.id || Math.random().toString(36).substring(2, 9),
            isHost: playerInfo?.isHost || false,
            roomId: roomId,
          },
        });

        // Important: Send a full room state update to ensure all clients have the complete player list
        await broadcastToRoom(roomId, {
          type: "room:full-state",
          payload: roomState,
        });

        // Also broadcast all existing players to ensure everyone is in sync
        if (roomState.players.length > 0) {
          console.log(
            `[Realtime API] Broadcasting all players in room ${roomId}`
          );

          // For each player in the room, send a player:joined message
          for (const player of roomState.players) {
            if (player.name !== playerName) {
              // Skip the player who just joined as we already sent their info
              console.log(
                `[Realtime API] Broadcasting player:joined for ${player.name}`
              );

              await broadcastToRoom(roomId, {
                type: "player:joined",
                payload: {
                  name: player.name,
                  id: player.id,
                  isHost: player.isHost,
                  roomId: roomId,
                },
              });
            }
          }
        }

        // We've already broadcast all players above, so no need to do it again

        // Start game if room is full
        if (roomState.players.length === 4) {
          console.log(`[Realtime API] Room ${roomId} is full, starting game`);
          gameManager.startGame(roomId);
          const finalRoomState = gameManager.getRoom(roomId);
          if (finalRoomState) {
            await broadcastToRoom(roomId, {
              type: "game:started",
              payload: finalRoomState,
            });
            await broadcastToRoom(roomId, {
              type: "game:state-updated",
              payload: finalRoomState.gameState,
            });
          }
        }

        return NextResponse.json({ success: true, roomState });
      }

      case "room:leave": {
        const { roomId, playerName } = payload;
        if (!roomId || !playerName) {
          return NextResponse.json(
            { error: "Missing roomId or playerName" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        const player = room.players.find((p) => p.name === playerName);
        if (!player) {
          return NextResponse.json(
            { error: "Player not found" },
            { status: 404 }
          );
        }

        gameManager.removePlayerFromRoom(roomId, player.id);
        const updatedRoom = gameManager.getRoom(roomId);

        // Broadcast to the room if it still exists
        if (updatedRoom) {
          await broadcastToRoom(roomId, {
            type: "room:updated",
            payload: updatedRoom,
          });
          await broadcastToRoom(roomId, {
            type: "player:left",
            payload: playerName,
          });
        }

        return NextResponse.json({ success: true });
      }

      case "game:ready": {
        const { roomId } = payload;
        if (!roomId) {
          return NextResponse.json(
            { error: "Missing roomId" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        // Start the game
        gameManager.startGame(roomId);
        const updatedRoom = gameManager.getRoom(roomId);

        if (updatedRoom) {
          await broadcastToRoom(roomId, {
            type: "game:started",
            payload: updatedRoom,
          });
          await broadcastToRoom(roomId, {
            type: "game:state-updated",
            payload: updatedRoom.gameState,
          });
        }

        return NextResponse.json({ success: true });
      }

      case "game:play-card": {
        const { roomId, card } = payload;
        if (!roomId || !card) {
          return NextResponse.json(
            { error: "Missing roomId or card" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        // Update game state with the played card
        // This would need to be implemented in the GameManager
        // For now, just broadcast the event
        await broadcastToRoom(roomId, {
          type: "game:card-played",
          payload: { roomId, card },
        });

        return NextResponse.json({ success: true });
      }

      case "game:bid": {
        const { roomId, bid } = payload;
        if (!roomId || bid === undefined) {
          return NextResponse.json(
            { error: "Missing roomId or bid" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        // Update game state with the bid
        // This would need to be implemented in the GameManager
        // For now, just broadcast the event
        await broadcastToRoom(roomId, {
          type: "game:bid-placed",
          payload: { roomId, bid },
        });

        return NextResponse.json({ success: true });
      }

      case "game:select-trump": {
        const { roomId, suit, botId } = payload;
        if (!roomId || !suit) {
          return NextResponse.json(
            { error: "Missing roomId or suit" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        // Broadcast the vote to all clients
        await broadcastToRoom(roomId, {
          type: "game:trump-vote",
          payload: { roomId, suit, botId },
        });

        // Only process the trump selection for human players to avoid multiple selections
        if (!botId) {
          // Update the game state with the trump suit
          gameManager.updateGameState(roomId, {
            trumpSuit: suit,
            gamePhase: "playing", // Move to playing phase after trump selection
          });
          const updatedRoom = gameManager.getRoom(roomId);

          if (updatedRoom) {
            // After a delay, broadcast that the trump suit has been selected
            setTimeout(async () => {
              await broadcastToRoom(roomId, {
                type: "game:trump-selected",
                payload: { roomId, suit },
              });
              await broadcastToRoom(roomId, {
                type: "game:state-updated",
                payload: updatedRoom.gameState,
              });
            }, 3000); // Add a delay to allow for animations
          }
        }

        return NextResponse.json({ success: true });
      }

      case "room:request-state": {
        const { roomId } = payload;
        if (!roomId) {
          return NextResponse.json(
            { error: "Missing roomId" },
            { status: 400 }
          );
        }

        const room = gameManager.getRoom(roomId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }

        // Send the complete room state to all clients
        await broadcastToRoom(roomId, {
          type: "room:full-state",
          payload: room,
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: "Unknown message type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Realtime API] Error handling request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if the API is running or retrieve pending messages
export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = url.searchParams.get("roomId");

  // If roomId is provided, return pending messages for that room
  if (roomId) {
    const messages = await getPendingMessagesForRoom(roomId);
    return NextResponse.json({ messages });
  }

  // Otherwise, just return API status
  return NextResponse.json({ status: "Realtime API is running" });
}
