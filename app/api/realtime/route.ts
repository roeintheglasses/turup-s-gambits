import { NextResponse } from "next/server";
import { supabase } from "@/lib/services/supabase";
import { GameManager } from "@/lib/game-manager";
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
          presence: { key: channelName }, // Enable presence to improve connection reliability
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
    const {
      type,
      payload,
      roomId: topLevelRoomId,
      playerName: topLevelPlayerName,
    } = body;

    // Extract roomId and playerName from multiple possible locations in the request
    const roomId =
      (payload && typeof payload === "object" && payload.roomId) ||
      topLevelRoomId ||
      (typeof body === "object" && "roomId" in body ? body.roomId : null);

    const playerName =
      (payload && typeof payload === "object" && payload.playerName) ||
      topLevelPlayerName ||
      (typeof body === "object" && "playerName" in body
        ? body.playerName
        : null);

    // Log the received data
    console.log(`[Realtime API] Received ${type} request:`, {
      payload,
      extractedRoomId: roomId,
      extractedPlayerName: playerName,
    });

    if (!roomId) {
      return NextResponse.json(
        {
          error:
            "Missing roomId. Please ensure roomId is included in the request.",
        },
        { status: 400 }
      );
    }

    // Generate a unique ID for this request
    const requestId = JSON.stringify({ type, payload, roomId });

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

    switch (type) {
      case "room:create": {
        const isBot = payload?.isBot || false;

        // Check if the room already exists
        const existingRoom = gameManager.getRoom(roomId);
        if (existingRoom) {
          // Room already exists, this is not an error
          console.log(`[Realtime API] Room ${roomId} already exists`);
          return NextResponse.json({ success: true });
        }

        // Create a new room with the specified ID
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
            teams: {
              royals: [],
              rebels: [],
            },
            scores: {
              royals: 0,
              rebels: 0,
            },
            consecutiveTricks: {
              royals: 0,
              rebels: 0,
            },
            lastTrickWinner: null,
            dealerIndex: 0,
            trumpCaller: null,
          },
          createdAt: Date.now(),
          lastActivity: Date.now(),
        };

        gameManager.getRooms().set(roomId, newRoom);
        console.log(`[Realtime API] Created new room with ID ${roomId}`);

        // If a player name was provided, add them to the room
        if (playerName) {
          gameManager.addPlayerToRoom(roomId, playerName, undefined, isBot);
          console.log(
            `[Realtime API] Added player ${playerName} to new room ${roomId}`
          );
        }

        return NextResponse.json({ success: true });
      }

      case "player:joined": {
        const isBot = payload?.isBot || false;
        const botId = isBot ? payload?.id : null;

        // For bot players, use the bot's name directly from the payload
        const effectivePlayerName = isBot ? payload?.name : playerName;

        console.log(
          `[Realtime API] Processing ${
            isBot ? "bot" : "player"
          } join: ${effectivePlayerName} ${botId ? `(ID: ${botId})` : ""}`
        );

        if (!effectivePlayerName) {
          return NextResponse.json(
            {
              error:
                "Missing player name. Please ensure name is included for bots or playerName for human players.",
            },
            { status: 400 }
          );
        }

        // Get or create room
        let roomState: GameRoom;
        const existingGameRoom = gameManager.getRoom(roomId);
        const existingPlayer = existingGameRoom?.players.find(
          (p) => p.name === effectivePlayerName
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
                teams: {
                  royals: [],
                  rebels: [],
                },
                scores: {
                  royals: 0,
                  rebels: 0,
                },
                consecutiveTricks: {
                  royals: 0,
                  rebels: 0,
                },
                lastTrickWinner: null,
                dealerIndex: 0,
                trumpCaller: null,
              },
              createdAt: Date.now(),
              lastActivity: Date.now(),
            };
            gameManager.getRooms().set(roomId, newRoom);
            roomState = newRoom;
            console.log(`[Realtime API] Created new room with ID ${roomId}`);
          } else {
            gameManager.addPlayerToRoom(
              roomId,
              effectivePlayerName,
              payload?.id,
              isBot
            );
            roomState = gameManager.getRoom(roomId)!;
          }
          console.log(
            `[Realtime API] Player ${effectivePlayerName} added to GameManager for room ${roomId}`
          );
        } else {
          if (!existingGameRoom) {
            throw new Error("Unexpected state: existingGameRoom is undefined");
          }
          roomState = existingGameRoom;
          console.log(
            `[Realtime API] Player ${effectivePlayerName} already exists in GameManager for room ${roomId}`
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
          `[Realtime API] Broadcasting player:joined for ${effectivePlayerName}`
        );

        // Find the player object with complete information
        const playerInfo = roomState.players.find(
          (p) => p.name === effectivePlayerName
        );

        await broadcastToRoom(roomId, {
          type: "player:joined",
          payload: {
            name: effectivePlayerName,
            id:
              playerInfo?.id ||
              payload?.id ||
              Math.random().toString(36).substring(2, 9),
            isHost: playerInfo?.isHost || false,
            isBot: playerInfo?.isBot || isBot || false,
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
                isBot: player.isBot || false,
                roomId: roomId,
              },
            });
          }
        }

        return NextResponse.json({ success: true, roomState });
      }

      case "room:join": {
        const { roomId, playerName, isBot } = payload;
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
                teams: {
                  royals: [],
                  rebels: [],
                },
                scores: {
                  royals: 0,
                  rebels: 0,
                },
                consecutiveTricks: {
                  royals: 0,
                  rebels: 0,
                },
                lastTrickWinner: null,
                dealerIndex: 0,
                trumpCaller: null,
              },
              createdAt: Date.now(),
              lastActivity: Date.now(),
            };
            gameManager.getRooms().set(roomId, newRoom);
            roomState = newRoom;
            console.log(`[Realtime API] Created new room with ID ${roomId}`);
          } else {
            gameManager.addPlayerToRoom(roomId, playerName, undefined, isBot);
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
            isBot: playerInfo?.isBot || isBot || false,
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
                  isBot: player.isBot || false,
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

      case "game:start":
      case "game:ready": {
        const { roomId, gameMode } = payload;
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

        console.log(
          `[Realtime API] Starting game in room ${roomId} with mode ${
            gameMode || "classic"
          }`
        );

        // Start the game
        gameManager.startGame(roomId);
        const updatedRoom = gameManager.getRoom(roomId);

        if (updatedRoom) {
          // Update game mode if provided
          if (gameMode && updatedRoom.gameState) {
            updatedRoom.gameState.gameMode = gameMode;
          }

          console.log(
            `[Realtime API] Broadcasting game:started for room ${roomId}`
          );

          // Send game:started message with the full room data
          await broadcastToRoom(roomId, {
            type: "game:started",
            payload: updatedRoom,
          });

          // Send game:state-updated message with just the game state
          await broadcastToRoom(roomId, {
            type: "game:state-updated",
            payload: updatedRoom.gameState,
          });
        }

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
        const { roomId, suit, playerId, botId } = payload;
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

        // Determine the player ID (use botId if provided, otherwise use playerId)
        const actualPlayerId = botId || playerId;
        if (!actualPlayerId) {
          return NextResponse.json(
            { error: "Missing playerId or botId" },
            { status: 400 }
          );
        }

        try {
          // Check if player has already voted to avoid the error
          const hasVoted =
            room.gameState.playersVoted?.includes(actualPlayerId);

          if (hasVoted) {
            console.log(
              `[Realtime API] Player ${actualPlayerId} has already voted for trump, ignoring duplicate vote`
            );
            // Return success but don't record the vote again
            return NextResponse.json({
              success: true,
              message: "Player has already voted",
              alreadyVoted: true,
            });
          }

          // Record the vote
          gameManager.voteForTrump(roomId, actualPlayerId, suit);

          // Broadcast the vote to all clients
          await broadcastToRoom(roomId, {
            type: "game:trump-vote",
            payload: { roomId, suit, playerId: actualPlayerId, botId },
          });

          // Get the updated room
          const updatedRoom = gameManager.getRoom(roomId);
          if (!updatedRoom) {
            return NextResponse.json(
              { error: "Room not found after vote" },
              { status: 404 }
            );
          }

          // Broadcast the updated game state
          await broadcastToRoom(roomId, {
            type: "game:state-updated",
            payload: updatedRoom.gameState,
          });

          // Check if all players have voted and trump has been selected
          if (
            updatedRoom.gameState.trumpSuit &&
            updatedRoom.gameState.gamePhase === "bidding"
          ) {
            // Broadcast that the trump suit has been selected
            await broadcastToRoom(roomId, {
              type: "game:trump-selected",
              payload: { roomId, suit: updatedRoom.gameState.trumpSuit },
            });

            // After a delay, deal the remaining cards
            setTimeout(async () => {
              gameManager.dealRemainingCards(roomId);
              const roomWithFinalCards = gameManager.getRoom(roomId);

              if (roomWithFinalCards) {
                // Broadcast the updated room state with all cards dealt
                await broadcastToRoom(roomId, {
                  type: "game:final-deal",
                  payload: { roomId },
                });
                await broadcastToRoom(roomId, {
                  type: "game:state-updated",
                  payload: roomWithFinalCards.gameState,
                });

                // Start the playing phase after another delay
                setTimeout(async () => {
                  gameManager.startPlayingPhase(roomId);
                  const playingRoom = gameManager.getRoom(roomId);

                  if (playingRoom) {
                    await broadcastToRoom(roomId, {
                      type: "game:playing-started",
                      payload: { roomId },
                    });
                    await broadcastToRoom(roomId, {
                      type: "game:state-updated",
                      payload: playingRoom.gameState,
                    });
                  }
                }, 2000); // Add a delay before starting the playing phase
              }
            }, 3000); // Add a delay to allow for animations
          }

          return NextResponse.json({ success: true });
        } catch (error: any) {
          return NextResponse.json(
            { error: error.message || "Error processing trump vote" },
            { status: 400 }
          );
        }
      }

      case "game:playing-started": {
        const { roomId, gamePhase } = payload;
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

        // Update the game phase to playing if it's not already
        if (room.gameState.gamePhase !== "playing") {
          gameManager.startPlayingPhase(roomId);
        }

        // Broadcast the playing started message
        await broadcastToRoom(roomId, {
          type: "game:playing-started",
          payload: { roomId, gamePhase: "playing" },
        });

        // Also broadcast the updated game state
        const updatedRoom = gameManager.getRoom(roomId);
        if (updatedRoom) {
          await broadcastToRoom(roomId, {
            type: "game:state-updated",
            payload: updatedRoom.gameState,
          });
        }

        return NextResponse.json({ success: true });
      }

      case "game:play-card": {
        const { roomId, playerId, card } = payload;
        if (!roomId || !playerId || !card) {
          return NextResponse.json(
            { error: "Missing roomId, playerId, or card" },
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

        try {
          // Play the card
          gameManager.playCard(roomId, playerId, card);
          const updatedRoom = gameManager.getRoom(roomId);

          if (updatedRoom) {
            // Broadcast the card played
            await broadcastToRoom(roomId, {
              type: "game:card-played",
              payload: { roomId, playerId, card },
            });

            // Broadcast the updated game state
            await broadcastToRoom(roomId, {
              type: "game:state-updated",
              payload: updatedRoom.gameState,
            });

            // If the game is finished, broadcast the game over event
            if (updatedRoom.gameState.gamePhase === "finished") {
              await broadcastToRoom(roomId, {
                type: "game:over",
                payload: {
                  roomId,
                  scores: updatedRoom.gameState.scores,
                  winner:
                    updatedRoom.gameState.scores.royals >
                    updatedRoom.gameState.scores.rebels
                      ? "royals"
                      : "rebels",
                },
              });
            }
          }

          return NextResponse.json({ success: true });
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Error playing card";
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }
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
          // If the room doesn't exist, create it instead of returning an error
          // This helps prevent the "Room not found" error
          console.log(`[Realtime API] Room ${roomId} not found, creating it`);

          // Create a new room with the specified ID
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
              teams: {
                royals: [],
                rebels: [],
              },
              scores: {
                royals: 0,
                rebels: 0,
              },
              consecutiveTricks: {
                royals: 0,
                rebels: 0,
              },
              lastTrickWinner: null,
              dealerIndex: 0,
              trumpCaller: null,
            },
            createdAt: Date.now(),
            lastActivity: Date.now(),
          };

          gameManager.getRooms().set(roomId, newRoom);

          // Use the new room
          return NextResponse.json({ success: true, roomState: newRoom });
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Realtime API] Error handling request:", error);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
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
