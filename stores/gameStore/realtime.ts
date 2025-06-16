import { useAuthStore } from "../authStore";
import { useUIStore } from "../uiStore";
import { determineTrickWinner } from "./cardUtils";
import { GameStoreState } from "./types";
import { Player, Card, Suit, GameState } from "@/app/types/game";
import { supabase } from "@/lib/supabase";

export const createRealtimeFunctions = (
  get: () => GameStoreState,
  set: (
    partial:
      | Partial<GameStoreState>
      | ((state: GameStoreState) => Partial<GameStoreState>),
    replace?: boolean
  ) => void
) => ({
  sendMessage: async (message: any): Promise<boolean> => {
    console.log("[GameStore] Sending message:", message);

    // Get current room ID and user info
    const { roomId } = get();
    const user = useAuthStore.getState().user;
    const { showToast } = useUIStore.getState();

    if (!roomId) {
      console.error("[GameStore] Cannot send message: No active room ID");
      showToast("Cannot send message: No active room", "error");
      return false;
    }

    if (!user || !user.id) {
      console.error(
        "[GameStore] Cannot send message: No authenticated user or missing user ID"
      );
      showToast("Cannot send message: Authentication issue", "error");
      return false;
    }

    try {
      // Ensure proper payload structure based on message type
      let enhancedPayload = {
        ...message.payload,
        roomId: message.payload?.roomId || roomId,
      };

      // Only add player info if this is not a bot message
      if (!message.payload?.isBot) {
        enhancedPayload.playerName =
          message.payload?.playerName || user.username || "Player";
        enhancedPayload.playerId = message.payload?.playerId || user.id;
      }

      // For player:joined messages, ensure player object is properly structured
      if (message.type === "player:joined") {
        // For bot messages, don't add a player object to avoid confusion
        if (
          !message.payload?.isBot &&
          (!enhancedPayload.player ||
            typeof enhancedPayload.player !== "object")
        ) {
          // Make sure we have valid player ID and name
          const playerId = enhancedPayload.playerId || user.id;
          const playerName =
            enhancedPayload.playerName || user.username || "Player";

          if (!playerId) {
            console.error(
              "[GameStore] Cannot create player object: Missing player ID"
            );
            return false;
          }

          enhancedPayload.player = {
            id: playerId,
            name: playerName,
            isHost: enhancedPayload.isHost || false,
            isBot: enhancedPayload.isBot || false,
            isReady: true,
            hand: [],
            score: 0,
          };
        }
      }

      // Create the enhanced message with proper payload
      const enhancedMessage = {
        type: message.type,
        payload: enhancedPayload,
      };

      // Use supabase directly for real-time communication
      const { supabase } = await import("@/lib/supabase");

      // First attempt: send via API endpoint for security-critical operations
      const requiresServerProcessing =
        message.type === "room:create" ||
        message.type.includes("auth:") ||
        message.type === "game:end";

      let success = false;

      if (requiresServerProcessing) {
        // Use the server API for critical operations that need validation
        const response = await fetch("/api/realtime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(enhancedMessage),
        });

        if (response.ok) {
          success = true;
          console.log("[GameStore] Message sent successfully via API");
        } else {
          console.error("[GameStore] API error:", await response.text());
        }
      } else {
        // Use Supabase Realtime directly for non-critical operations
        try {
          // Create channel name based on room ID
          const channelName = `room:${roomId}`;
          const channel = supabase.channel(channelName);

          // Send message directly through Supabase Realtime
          const result = await channel.send({
            type: "broadcast",
            event: "message",
            payload: enhancedMessage,
          });

          if (result === "ok") {
            success = true;
            console.log(
              "[GameStore] Message sent successfully via Supabase Realtime"
            );
          } else {
            console.error("[GameStore] Failed to send via Supabase Realtime");

            // Fallback to API if direct channel send fails
            const response = await fetch("/api/realtime", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(enhancedMessage),
            });

            if (response.ok) {
              success = true;
              console.log(
                "[GameStore] Message sent successfully via API (fallback)"
              );
            }
          }
        } catch (error) {
          console.error("[GameStore] Error with Supabase Realtime:", error);
        }
      }

      // Update connection status based on message success
      if (!success) {
        set({ isConnected: false });
        // Show a connection lost toast
        const uiStore = useUIStore.getState();
        uiStore.showToast("Connection issue. Please try again.", "error");
      }

      return success;
    } catch (error) {
      console.error("[GameStore] Error sending message:", error);
      const uiStore = useUIStore.getState();
      uiStore.showToast("Error sending message. Please try again.", "error");
      return false;
    }
  },

  syncGameStateToDatabase: async () => {
    const {
      roomId,
      gameStatus,
      trumpSuit,
      currentTrick,
      scores,
      currentPlayer,
      players,
      teamAssignments,
    } = get();

    if (!roomId) {
      console.error("[GameStore] Cannot sync game state: No active room ID");
      return false;
    }

    try {
      // Import the database service
      const { SupabaseDatabase } = await import(
        "@/lib/services/supabase-database"
      );

      // Prepare the game state object to be stored in the database
      const gameState: GameState = {
        gamePhase: gameStatus,
        trumpSuit,
        currentTurn: currentPlayer,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        teams: {
          royals: [],
          rebels: [],
        },
        scores,
        consecutiveTricks: {
          royals: 0,
          rebels: 0,
        },
        lastTrickWinner: null,
        dealerIndex: 0,
        trumpCaller: null,
        // Store current trick in remainingDeck temporarily
        remainingDeck: currentTrick,
        // Store team assignments in trumpVotes temporarily
        trumpVotes: teamAssignments as unknown as { [playerId: string]: Suit },
        playersVoted: [],
      };

      console.log("[GameStore] Syncing game state to database:", gameState);

      // Use the database service to update the game state
      const success = await SupabaseDatabase.updateGameState(roomId, gameState);

      if (!success) {
        console.error("[GameStore] Error syncing game state to database");
        return false;
      }

      console.log("[GameStore] Game state synced to database successfully");
      return true;
    } catch (error) {
      console.error("[GameStore] Error syncing game state to database:", error);
      return false;
    }
  },

  subscribeToRealtime: async () => {
    const { roomId } = get();

    if (!roomId) {
      console.error("[GameStore] Cannot subscribe: No active room ID");
      return;
    }

    try {
      // Import dynamically to avoid server-side import issues
      const { supabase } = await import("@/lib/supabase");

      // Create and subscribe to the room channel
      const channelName = `room:${roomId}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: "" }, // Enable presence for connection reliability
        },
      });

      // Subscribe to database changes for game_rooms table
      // This allows us to sync game state between players
      const gameRoomChannel = supabase
        .channel(`game_room:${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "game_rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            console.log("[GameStore] Received game room update:", payload);

            // Extract the new game state from the payload
            const newGameState = payload.new?.game_state;

            if (newGameState) {
              console.log(
                "[GameStore] Updating game state from database:",
                newGameState
              );

              // Update the local game state with the new state from the database
              set((state) => ({
                ...state,
                gameStatus: newGameState.gamePhase || state.gameStatus,
                trumpSuit: newGameState.trumpSuit || state.trumpSuit,
                currentTrick: newGameState.currentTrick || state.currentTrick,
                scores: newGameState.scores || state.scores,
                currentPlayer: newGameState.currentTurn || state.currentPlayer,
                players: newGameState.players || state.players,
                teamAssignments:
                  newGameState.teamAssignments || state.teamAssignments,
              }));
            }
          }
        )
        .subscribe();

      // Handle different message types
      channel.on("broadcast", { event: "message" }, (payload) => {
        try {
          if (!payload || !payload.payload) {
            console.warn("[GameStore] Received empty broadcast payload");
            return;
          }

          const message = payload.payload;
          console.log("[GameStore] Received realtime message:", message);

          // Check for valid message structure before processing
          if (!message || typeof message !== "object") {
            console.warn(
              "[GameStore] Received empty or invalid message payload:",
              payload
            );
            return;
          }

          // Check for valid message type
          if (!message.type || typeof message.type !== "string") {
            console.warn("[GameStore] Message missing type property:", message);
            return;
          }

          // Set connected status to true since we're receiving messages
          set({ isConnected: true });

          // Process message based on type
          switch (message.type) {
            case "player:joined":
              // Enhanced safety check for message payload structure
              // The payload can either be a player object directly or contain a nested player property
              let playerObject = null;
              let preservedGameState = false;

              // Check if we have a valid payload
              if (!message.payload) {
                console.warn(
                  "[GameStore] Received player:joined message with empty payload:",
                  message
                );
                break;
              }

              // Check if this message contains preserved game state
              if (message.payload.preservedState === true) {
                console.log(
                  "[GameStore] Player rejoined with preserved state:",
                  message.payload.currentGameStatus
                );
                preservedGameState = true;
              }

              // Handle both payload formats: direct player object or nested player object
              if (
                message.payload.player &&
                typeof message.payload.player === "object"
              ) {
                // If payload has a player field, use it
                playerObject = message.payload.player;
              } else if (message.payload.id && message.payload.name) {
                // If payload itself has player properties, treat it as the player
                playerObject = message.payload;
              } else {
                console.warn(
                  "[GameStore] Invalid player:joined message format:",
                  message
                );
                break;
              }

              // Ensure the player has an id before attempting to filter
              if (!playerObject.id) {
                console.warn(
                  "[GameStore] Player object is missing id:",
                  playerObject
                );
                break;
              }

              // Check if we have team assignments but the new player doesn't have one
              if (
                Object.keys(get().teamAssignments).length > 0 &&
                playerObject &&
                playerObject.name &&
                !get().teamAssignments[playerObject.name]
              ) {
                // Get current players in each team
                const royalPlayers = Object.entries(
                  get().teamAssignments
                ).filter(([_, team]) => team === "royals").length;
                const rebelPlayers = Object.entries(
                  get().teamAssignments
                ).filter(([_, team]) => team === "rebels").length;

                // Assign to the team with fewer players, or if equal, alternate
                const team =
                  royalPlayers < rebelPlayers
                    ? "royals"
                    : royalPlayers > rebelPlayers
                    ? "rebels"
                    : Object.keys(get().teamAssignments).length % 2 === 0
                    ? "royals"
                    : "rebels";

                // Update team assignments
                set((state) => ({
                  teamAssignments: {
                    ...state.teamAssignments,
                    [playerObject.name]: team,
                  },
                }));

                console.log(
                  `[GameStore] Assigned player ${playerObject.name} to team ${team}`
                );
              }

              set((state) => {
                // Additional safety check for state.players
                const currentPlayers = Array.isArray(state.players)
                  ? state.players
                  : [];

                // Check if player already exists
                const playerExists = currentPlayers.some(
                  (p) => p && p.id && p.id === playerObject.id
                );

                // If player already exists, don't add them again
                if (playerExists) {
                  console.log(
                    `[GameStore] Player ${playerObject.name} already exists, not adding duplicate`
                  );
                  return state; // Return unchanged state
                }

                // If player has rejoined with preserved state, respect their current game status
                const updatedState: Partial<GameStoreState> = {
                  players: [...currentPlayers, playerObject],
                };

                // If player rejoined with preserved state and this is not the first player,
                // update our game state to match if it's in a more advanced phase
                if (preservedGameState && message.payload.currentGameStatus) {
                  const currentStatus = state.gameStatus;
                  const incomingStatus = message.payload.currentGameStatus;

                  // Game Status priority: finished > playing > final_deal > bidding > initial_deal > waiting
                  const statusPriority: Record<string, number> = {
                    waiting: 0,
                    initial_deal: 1,
                    bidding: 2,
                    final_deal: 3,
                    playing: 4,
                    finished: 5,
                  };

                  // Only update if incoming status has higher priority
                  if (
                    statusPriority[incomingStatus] >
                    statusPriority[currentStatus]
                  ) {
                    console.log(
                      `[GameStore] Updating game status from ${currentStatus} to ${incomingStatus} based on rejoined player state`
                    );
                    updatedState.gameStatus = incomingStatus as any;
                  }
                }

                return updatedState;
              });
              break;

            case "player:left":
              // Safety check for playerId
              const playerId = message.payload?.playerId;
              if (!playerId) {
                console.error(
                  "[GameStore] Missing playerId in player:left message:",
                  message
                );
                break;
              }

              set((state) => {
                // Additional safety check for state.players
                const currentPlayers = Array.isArray(state.players)
                  ? state.players
                  : [];

                return {
                  players: currentPlayers.filter(
                    (p) => p && p.id && p.id !== playerId
                  ),
                };
              });
              break;

            case "game:start":
              // Handle game start message
              set({
                gameStatus: "initial_deal",
                showShuffleAnimation: true,
                initialCardsDeal: true,
                statusMessage: "Game starting... Dealing initial cards",
              });

              // Check if the message contains team assignments
              if (message.payload.teamAssignments) {
                console.log(
                  "[GameStore] Received team assignments from host:",
                  message.payload.teamAssignments
                );
                set({ teamAssignments: message.payload.teamAssignments });
              }

              // Deal initial cards to players logic is now in gameActions.startGame
              break;

            case "game:play-card":
            case "game:card-played":
              // Update current trick when a card is played
              const playedCard = message.payload.card;
              if (!playedCard) {
                console.error(
                  "[GameStore] Received card played message without card:",
                  message
                );
                break;
              }

              // Check if this card is already in the current trick
              const isDuplicatePlay = get().currentTrick.some(
                (c) =>
                  c.id === playedCard.id &&
                  c.suit === playedCard.suit &&
                  c.rank === playedCard.rank
              );

              if (isDuplicatePlay) {
                console.log(
                  "[GameStore] Duplicate card play detected, ignoring:",
                  playedCard
                );
                break;
              }

              console.log(
                "[GameStore] Adding card to current trick:",
                playedCard
              );

              // Create a deep copy of the current trick to avoid race conditions
              const updatedTrick = [...get().currentTrick, playedCard];

              // Get current player information
              const currentUser = useAuthStore.getState().user;
              const isCurrentUserPlaying =
                currentUser &&
                (message.payload.playerId === currentUser.id ||
                  message.payload.playerName === currentUser.username);

              // Update player hands and the game state in one atomic operation
              set((state) => {
                // 1. Create updated player list with card removed from hand
                const updatedPlayers = state.players.map((p) => {
                  // If this is the player who played the card, remove it from their hand
                  if (
                    p.id === message.payload.playerId ||
                    p.name === message.payload.playerName
                  ) {
                    console.log(
                      `[GameStore] Removing card ${playedCard.id} from ${p.name}'s hand`
                    );
                    return {
                      ...p,
                      hand: Array.isArray(p.hand)
                        ? p.hand.filter((c) => c.id !== playedCard.id)
                        : [],
                    };
                  }
                  return p;
                });

                // 2. Return a single atomic state update
                return {
                  // Update the current trick with the played card
                  currentTrick: updatedTrick,
                  // Update the players array with the modified hand
                  players: updatedPlayers,
                };
              });

              // Reset UI state for card play
              if (isCurrentUserPlaying) {
                const uiStore = useUIStore.getState();
                uiStore.setPlayingCardId(null);
                uiStore.setCardPlayLoading(false);
              }

              // Update the game state in the database
              get().syncGameStateToDatabase();

              // Process trick completion logic
              if (updatedTrick.length === 4) {
                console.log("[GameStore] Trick complete, resolving winner");

                // Simple trick resolution logic - just pick a winner
                const trickWinner = determineTrickWinner(
                  updatedTrick,
                  get().trumpSuit
                );

                setTimeout(() => {
                  set({
                    currentTrick: [],
                    statusMessage: `${trickWinner.playerName} won the trick!`,
                  });

                  // Move to the next player (in a real game, this would be the trick winner)
                  const nextPlayerName = currentUser?.username || "";

                  setTimeout(() => {
                    set({
                      currentPlayer: nextPlayerName,
                      statusMessage: `Your turn to play!`,
                    });

                    // Clear status after a delay
                    setTimeout(() => {
                      set({ statusMessage: null });
                    }, 2000);
                  }, 1500);
                }, 1500);
              } else {
                // Set current player to the current user's username
                const currentUser = useAuthStore.getState().user;

                // DO NOT create a test deck - use the player's existing hand
                // Just update the game status and current player
                set({
                  gameStatus: "playing",
                  statusMessage: "Game started! Your turn to play...",
                  // Set current player to actual username instead of "Player 1"
                  currentPlayer: currentUser?.username || "",
                });
              }
              break;

            case "game:select-trump":
            case "game:trump-vote":
              // Update trump suit when selected
              const selectedSuit = message.payload.suit;
              set({
                trumpSuit: selectedSuit,
                votingComplete: true,
              });
              break;

            case "game:trump-selected":
              // Trump has been selected by all players
              if (message.payload && message.payload.suit) {
                set({
                  trumpSuit: message.payload.suit,
                  votingComplete: true,
                  gameStatus: "bidding",
                });
              }
              break;

            case "game:update":
            case "game:state-updated":
              // Generic game state update
              if (message.payload.gameState) {
                // If we received a nested gameState object
                get().updateGameState(message.payload.gameState);
              } else if (
                message.payload &&
                typeof message.payload === "object"
              ) {
                // If we received the gameState directly
                get().updateGameState(message.payload);
              } else {
                console.error(
                  "[GameStore] Received invalid game state update:",
                  message.payload
                );
              }
              break;

            case "game:started":
              // Safety check for game data
              if (!message.payload) {
                console.error(
                  "[GameStore] Received empty game:started message"
                );
                break;
              }

              console.log(
                "[GameStore] Received game:started message:",
                message.payload
              );

              // Handle both formats: either the room object directly or a nested game object
              if (message.payload.gameState) {
                // If we received the full room object
                set((state: GameStoreState) => ({
                  ...state,
                  currentRoom: message.payload,
                  gameStatus: "initial_deal",
                  showShuffleAnimation: true,
                  initialCardsDeal: true,
                  statusMessage: "Game starting... Dealing initial cards",
                  isGameBoardReady: true,
                }));
              } else if (message.payload.game) {
                // If we received a nested game object
                set((state: GameStoreState) => ({
                  ...state,
                  currentRoom: {
                    ...state.currentRoom,
                    gameState: message.payload.game,
                  } as any,
                  isGameBoardReady: true,
                }));
              } else {
                console.error(
                  "[GameStore] Received invalid game:started message format:",
                  message.payload
                );
              }
              break;

            case "game:updated":
              // Safety check for game data
              if (!message.payload) {
                console.error(
                  "[GameStore] Received empty game:updated message"
                );
                break;
              }

              console.log(
                "[GameStore] Received game:updated message:",
                message.payload
              );

              // Handle both formats: either the room object directly or a nested game object
              if (message.payload.gameState) {
                // If we received the full room object
                set((state: GameStoreState) => ({
                  ...state,
                  currentRoom: message.payload,
                }));
              } else if (message.payload.game) {
                // If we received a nested game object
                const updatedGame = message.payload.game;
                set((state: GameStoreState) => ({
                  ...state,
                  currentRoom: {
                    ...state.currentRoom,
                    gameState: updatedGame,
                  } as any,
                }));
              } else {
                console.error(
                  "[GameStore] Received invalid game:updated message format:",
                  message.payload
                );
              }
              break;

            case "game:final-deal":
              // Final cards have been dealt
              set({
                gameStatus: "final_deal",
                initialCardsDeal: false,
                statusMessage: "All cards dealt. Game starting soon...",
              });

              // Show toast notification
              useUIStore
                .getState()
                .showToast("All cards dealt. Game starting soon...", "info");

              // Deal the remaining 8 cards to each player from the remainingDeck
              const remainingCards = get().remainingDeck;
              if (remainingCards && remainingCards.length >= 32) {
                // 8 cards * 4 players = 32
                console.log(
                  "[GameStore] Dealing remaining 8 cards to each player"
                );

                // Get all players
                const allPlayers = get().players;

                // Create object to hold the additional cards for each player
                const additionalCards: Record<string, any[]> = {};

                // Deal 8 more cards to each player
                allPlayers.forEach((player, playerIndex) => {
                  additionalCards[player.id] = remainingCards.slice(
                    playerIndex * 8,
                    (playerIndex + 1) * 8
                  );
                  console.log(
                    `[GameStore] Dealing 8 more cards to ${player.name} (ID: ${player.id})`
                  );
                });

                // Update players with their complete hands (5 initial + 8 more = 13 total)
                set((state) => {
                  const updatedPlayers = state.players.map((player) => {
                    const playerAdditionalCards =
                      additionalCards[player.id] || [];
                    const updatedHand = [
                      ...player.hand,
                      ...playerAdditionalCards,
                    ];
                    console.log(
                      `[GameStore] Updated ${player.name}'s hand: ${player.hand.length} + ${playerAdditionalCards.length} = ${updatedHand.length} cards`
                    );
                    return {
                      ...player,
                      hand: updatedHand,
                    };
                  });

                  return {
                    players: updatedPlayers,
                    // Clear the remaining deck as it's now been dealt
                    remainingDeck: undefined,
                  };
                });
              } else {
                console.error(
                  "[GameStore] No remaining cards to deal or insufficient cards",
                  remainingCards
                );
              }

              // Automatically transition to playing phase after a delay
              setTimeout(() => {
                // First check if we're still in final_deal phase (to avoid race conditions)
                if (get().gameStatus === "final_deal") {
                  set({
                    gameStatus: "playing",
                    statusMessage: "Game started! Your turn to play...",
                  });

                  // Show toast notification
                  useUIStore
                    .getState()
                    .showToast("Game started! Your turn to play...", "success");

                  // Clear status message after a delay
                  setTimeout(() => {
                    set({ statusMessage: null });
                  }, 2000);
                }
              }, 5000); // Increased delay to ensure all transitions complete
              break;

            case "game:playing-started":
              // Game has started playing phase
              console.log("[GameStore] Received game:playing-started message");

              // Only update if we're not already in playing phase
              if (get().gameStatus !== "playing") {
                // Set current player to the current user's username
                const currentUser = useAuthStore.getState().user;

                // Just update the game status and current player
                set((state) => {
                  // Log the current player hands to verify they have the correct number of cards
                  console.log(
                    "[GameStore] Player hands when entering playing phase:",
                    state.players.map((p) => ({
                      id: p.id,
                      name: p.name,
                      handLength: p.hand?.length || 0,
                    }))
                  );

                  return {
                    gameStatus: "playing",
                    initialCardsDeal: false, // Important: Explicitly set initialCardsDeal to false
                    statusMessage: "Game started! Your turn to play...",
                    // Set current player to actual username instead of "Player 1"
                    currentPlayer: currentUser?.username || "",
                  };
                });

                // Force a refresh of the game board via a custom event
                // This needs to run on the client side only
                try {
                  if (typeof window !== "undefined") {
                    console.log(
                      "[GameStore] Dispatching force refresh event for playing state"
                    );
                    window.dispatchEvent(
                      new CustomEvent("game:refreshState", {
                        detail: {
                          source: "realtime",
                          phase: "playing",
                        },
                      })
                    );
                  }
                } catch (error) {
                  console.error(
                    "[GameStore] Error dispatching refresh event:",
                    error
                  );
                }
              }
              break;

            case "game:over":
              // Game has ended
              set({
                gameStatus: "finished",
                statusMessage: message.payload?.winner
                  ? `Game over! ${
                      message.payload.winner === "royals" ? "Royals" : "Rebels"
                    } win!`
                  : "Game over!",
              });
              break;

            default:
              console.log("[GameStore] Unhandled message type:", message.type);
          }
        } catch (error) {
          console.error(
            "[GameStore] Error processing realtime message:",
            error
          );
        }
      });

      // Handle presence updates (players online status)
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        console.log("[GameStore] Presence state updated:", state);
      });

      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log("[GameStore] Channel subscription status:", status);

        if (status === "SUBSCRIBED") {
          set({ isConnected: true });
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "CLOSED" ||
          status === "TIMED_OUT"
        ) {
          set({ isConnected: false });
        }
      });
    } catch (error) {
      console.error("[GameStore] Error subscribing to realtime:", error);
      set({ isConnected: false });
    }
  },
});
