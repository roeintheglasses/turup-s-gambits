import { 
  MessageHandler, 
  RealtimeMessage, 
  GameStoreState, 
  SetStateFn,
  PlayerJoinedPayload,
  CardPlayedPayload,
  BidPlacedPayload,
  TrickCompletePayload,
  TrumpSelectionPayload,
  EmotePayload
} from "./types";
import { 
  showToast, 
  getCurrentUser, 
  extractPlayerObject, 
  isCardAlreadyPlayed,
  shouldUpdateGameStatus,
  dispatchGameRefreshEvent,
  determineTeamForPlayer,
  logger 
} from "./utils";
import { determineTrickWinner } from "../cardUtils";
import { TIMING, GAME_STATUS_PRIORITY } from "./constants";
import { useUIStore } from "../../uiStore";

// Player Management Handlers
const handlePlayerJoined: MessageHandler = (message, get, set) => {
  if (!message.payload) {
    logger.warn("Received player:joined message with empty payload:", message);
    return;
  }

  const playerObject = extractPlayerObject(message.payload);
  if (!playerObject?.id) {
    logger.warn("Player object is missing id:", playerObject);
    return;
  }

  logger.info(`Player ${playerObject.name} joined the game`);
  
  // Handle team assignment
  const { teamAssignments } = get();
  if (Object.keys(teamAssignments).length > 0 && !teamAssignments[playerObject.name]) {
    const team = determineTeamForPlayer(playerObject.name, teamAssignments);
    
    set((state) => ({
      teamAssignments: {
        ...state.teamAssignments,
        [playerObject.name]: team,
      },
    }));

    logger.info(`Assigned player ${playerObject.name} to team ${team}`);
  }

  // Add player to game
  set((state) => {
    const currentPlayers = Array.isArray(state.players) ? state.players : [];
    
    if (currentPlayers.some(p => p?.id === playerObject.id)) {
      logger.info(`Player ${playerObject.name} already exists, not adding duplicate`);
      return state;
    }

    const updatedState: Partial<GameStoreState> = {
      players: [...currentPlayers, playerObject],
    };

    // Handle preserved state for rejoining players
    const { preservedState, currentGameStatus } = message.payload;
    if (preservedState && currentGameStatus) {
      if (shouldUpdateGameStatus(state.gameStatus, currentGameStatus)) {
        logger.info(`Updating game status from ${state.gameStatus} to ${currentGameStatus}`);
        updatedState.gameStatus = currentGameStatus;
      }
    }

    return updatedState;
  });
};

const handlePlayerLeft: MessageHandler = (message, get, set) => {
  const playerId = message.payload?.playerId;
  if (!playerId) {
    logger.error("Missing playerId in player:left message:", message);
    return;
  }

  logger.info(`Player with ID ${playerId} left the game`);
  
  set((state) => ({
    players: (state.players || []).filter(p => p?.id !== playerId),
  }));
};

// Game Flow Handlers
const handleGameStart: MessageHandler = (message, get, set) => {
  logger.info("Game starting...");
  
  set({
    gameStatus: "initial_deal",
    showShuffleAnimation: true,
    initialCardsDeal: true,
    statusMessage: "Game starting... Dealing initial cards",
  });

  if (message.payload.teamAssignments) {
    logger.info("Received team assignments from host:", message.payload.teamAssignments);
    set({ teamAssignments: message.payload.teamAssignments });
  }
};

const handleGameStarted: MessageHandler = (message, get, set) => {
  if (!message.payload) {
    logger.error("Received empty game:started message");
    return;
  }

  logger.info("Received game:started message:", message.payload);

  const stateUpdate = {
    gameStatus: "initial_deal" as const,
    showShuffleAnimation: true,
    initialCardsDeal: true,
    statusMessage: "Game starting... Dealing initial cards",
    isGameBoardReady: true,
  };

  if (message.payload.gameState) {
    set((state: GameStoreState) => ({
      ...state,
      ...stateUpdate,
      currentRoom: message.payload,
    }));
  } else if (message.payload.game) {
    set((state: GameStoreState) => ({
      ...state,
      ...stateUpdate,
      currentRoom: {
        ...state.currentRoom,
        gameState: message.payload.game,
      } as any,
    }));
  } else {
    logger.error("Received invalid game:started message format:", message.payload);
  }
};

const handleGameOver: MessageHandler = (message, get, set) => {
  const winner = message.payload?.winner;
  const winnerText = winner === "royals" ? "Royals" : winner === "rebels" ? "Rebels" : "Unknown";
  
  logger.info(`Game over! Winner: ${winnerText}`);
  
  set({
    gameStatus: "finished",
    statusMessage: winner ? `Game over! ${winnerText} win!` : "Game over!",
  });

  showToast(`Game over! ${winnerText} win!`, "success");
};

// Bidding Phase Handlers
const handleBidPlaced: MessageHandler = (message, get, set) => {
  const { playerId, bid, playerName } = message.payload as BidPlacedPayload;
  
  if (!bid || bid < 7 || bid > 13) {
    logger.error("Invalid bid received:", bid);
    return;
  }

  logger.info(`Player ${playerName} placed bid: ${bid}`);
  
  set((state) => ({
    statusMessage: `${playerName} bid ${bid} tricks`,
    currentRoom: {
      ...state.currentRoom,
      gameState: {
        ...state.currentRoom?.gameState,
        currentBid: bid,
        currentBidder: playerId,
      },
    } as any,
  }));

  showToast(`${playerName} bid ${bid} tricks`, "info");
  
  // Clear status message after delay
  setTimeout(() => {
    set({ statusMessage: null });
  }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

const handleBiddingComplete: MessageHandler = (message, get, set) => {
  const { finalBid, winningBidder } = message.payload;
  
  logger.info(`Bidding complete. Winning bid: ${finalBid} by ${winningBidder}`);
  
  set({
    gameStatus: "final_deal",
    statusMessage: `Bidding complete! ${winningBidder} won with ${finalBid} tricks`,
  });

  showToast("Bidding complete! Final deal starting...", "success");
  
  setTimeout(() => {
    set({ statusMessage: null });
  }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

// Card Play Handlers
const handleCardPlayed: MessageHandler = (message, get, set) => {
  const { card: playedCard, playerId, playerName } = message.payload as CardPlayedPayload;
  
  if (!playedCard) {
    logger.error("Received card played message without card:", message);
    return;
  }

  if (isCardAlreadyPlayed(playedCard, get().currentTrick)) {
    logger.info("Duplicate card play detected, ignoring:", playedCard);
    return;
  }

  logger.info(`Player ${playerName} played card:`, playedCard);

  const updatedTrick = [...get().currentTrick, playedCard];
  updateGameStateForCardPlay(playedCard, updatedTrick, message.payload, get, set);
  
  // Sync to database
  get().syncGameStateToDatabase();

  if (updatedTrick.length === 4) {
    handleTrickCompletion(updatedTrick, get, set);
  } else {
    updateCurrentPlayerAfterCardPlay(get, set);
  }
};

const updateGameStateForCardPlay = (
  playedCard: any, 
  updatedTrick: any[], 
  payload: any, 
  get: () => GameStoreState, 
  set: SetStateFn
) => {
  const currentUser = getCurrentUser();
  const isCurrentUserPlaying = currentUser && (
    payload.playerId === currentUser.id || 
    payload.playerName === currentUser.username
  );

  set((state) => {
    const updatedPlayers = state.players.map(p => {
      if (p.id === payload.playerId || p.name === payload.playerName) {
        logger.info(`Removing card ${playedCard.id} from ${p.name}'s hand`);
        return {
          ...p,
          hand: Array.isArray(p.hand) ? p.hand.filter(c => c.id !== playedCard.id) : [],
        };
      }
      return p;
    });

    return {
      currentTrick: updatedTrick,
      players: updatedPlayers,
    };
  });

  if (isCurrentUserPlaying) {
    const uiStore = useUIStore.getState();
    uiStore.setPlayingCardId(null);
    uiStore.setCardPlayLoading(false);
  }
};

const handleTrickCompletion = (updatedTrick: any[], get: () => GameStoreState, set: SetStateFn) => {
  logger.info("Trick complete, resolving winner");
  
  const trickWinner = determineTrickWinner(updatedTrick, get().trumpSuit);
  
  setTimeout(() => {
    set({
      currentTrick: [],
      statusMessage: `${trickWinner.playerName} won the trick!`,
    });

    const currentUser = getCurrentUser();
    const nextPlayerName = currentUser?.username || "";

    setTimeout(() => {
      set({
        currentPlayer: nextPlayerName,
        statusMessage: "Your turn to play!",
      });

      setTimeout(() => {
        set({ statusMessage: null });
      }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
    }, TIMING.TRICK_RESOLUTION_DELAY);
  }, TIMING.TRICK_RESOLUTION_DELAY);
};

const updateCurrentPlayerAfterCardPlay = (get: () => GameStoreState, set: SetStateFn) => {
  const currentUser = getCurrentUser();
  
  set({
    gameStatus: "playing",
    statusMessage: "Game started! Your turn to play...",
    currentPlayer: currentUser?.username || "",
  });
};

// Trick Management Handlers
const handleTrickComplete: MessageHandler = (message, get, set) => {
  const { trickCards, winner } = message.payload as TrickCompletePayload;
  
  logger.info(`Trick completed. Winner: ${winner}`);
  
  set({
    currentTrick: [],
    statusMessage: `${winner} won the trick!`,
  });

  // Update scores
  const { teamAssignments, scores } = get();
  const winnerTeam = teamAssignments[winner];
  
  if (winnerTeam) {
    const newScores = {
      ...scores,
      [winnerTeam]: scores[winnerTeam] + 1,
    };
    
    set({ scores: newScores });
    
    // Check for game end
    if (newScores[winnerTeam] >= 7) {
      setTimeout(() => {
        set({
          gameStatus: "finished",
          statusMessage: `Game over! ${winnerTeam === "royals" ? "Royals" : "Rebels"} win!`,
        });
      }, TIMING.TRICK_RESOLUTION_DELAY);
    }
  }

  setTimeout(() => {
    set({ statusMessage: null });
  }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

const handleTrickWinner: MessageHandler = (message, get, set) => {
  const { winner, team, trickCount } = message.payload;
  
  showToast(`${winner} (${team}) won the trick!`, "success");
  
  set({
    statusMessage: `${winner} won the trick!`,
    currentPlayer: winner,
  });
  
  setTimeout(() => {
    set({ statusMessage: null });
  }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

// Trump Selection Handlers
const handleTrumpSelection: MessageHandler = (message, get, set) => {
  const { suit: selectedSuit } = message.payload as TrumpSelectionPayload;
  
  if (!selectedSuit) {
    logger.warn("Received trump selection without suit");
    return;
  }

  logger.info(`Trump suit selected: ${selectedSuit}`);

  set({
    trumpSuit: selectedSuit,
    votingComplete: true,
    ...(message.type === "game:trump-selected" && { gameStatus: "bidding" }),
  });

  showToast(`Trump suit selected: ${selectedSuit}`, "info");
};

// Room State Handlers
const handleRoomJoined: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  
  if (roomState && roomState.players) {
    logger.info("Room joined, updating state with players:", roomState.players);
    
    set({
      currentRoom: roomState,
      players: roomState.players,
      isConnected: true,
    });
  }
};

const handleRoomUpdated: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  
  if (roomState) {
    logger.info("Room updated:", roomState);
    
    set((state) => ({
      currentRoom: roomState,
      players: roomState.players || state.players,
      gameStatus: roomState.gameState?.gamePhase || state.gameStatus,
    }));
  }
};

const handleRoomFullState: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  
  logger.info("Received full room state:", roomState);
  
  set({
    currentRoom: roomState,
    players: roomState.players || [],
    gameStatus: roomState.gameState?.gamePhase || "waiting",
    trumpSuit: roomState.gameState?.trumpSuit || null,
    scores: roomState.gameState?.scores || { royals: 0, rebels: 0 },
    teamAssignments: roomState.gameState?.teamAssignments || {},
  });
};

// Social Features
const handleEmote: MessageHandler = (message, get, set) => {
  const { emoji, playerId, playerName } = message.payload as EmotePayload;
  
  if (!emoji || !playerName) {
    logger.error("Invalid emote message:", message.payload);
    return;
  }

  logger.info(`Player ${playerName} sent emote: ${emoji}`);
  showToast(`${playerName}: ${emoji}`, "info");
};

// Game Phase Handlers
const handleFinalDeal: MessageHandler = (message, get, set) => {
  logger.info("Starting final deal phase");
  
  set({
    gameStatus: "final_deal",
    initialCardsDeal: false,
    statusMessage: "All cards dealt. Game starting soon...",
  });

  showToast("All cards dealt. Game starting soon...", "info");
  dealRemainingCards(get, set);
  schedulePlayingPhaseTransition(get, set);
};

const dealRemainingCards = (get: () => GameStoreState, set: SetStateFn) => {
  const remainingCards = get().remainingDeck;
  const allPlayers = get().players;
  
  if (!remainingCards || remainingCards.length < 32) {
    logger.error("No remaining cards to deal or insufficient cards", remainingCards);
    return;
  }

  logger.info("Dealing remaining 8 cards to each player");

  const additionalCards: Record<string, any[]> = {};
  allPlayers.forEach((player, playerIndex) => {
    additionalCards[player.id] = remainingCards.slice(
      playerIndex * 8,
      (playerIndex + 1) * 8
    );
    logger.info(`Dealing 8 more cards to ${player.name} (ID: ${player.id})`);
  });

  set((state) => {
    const updatedPlayers = state.players.map((player) => {
      const playerAdditionalCards = additionalCards[player.id] || [];
      const updatedHand = [...player.hand, ...playerAdditionalCards];
      
      logger.info(
        `Updated ${player.name}'s hand: ${player.hand.length} + ${playerAdditionalCards.length} = ${updatedHand.length} cards`
      );
      
      return { ...player, hand: updatedHand };
    });

    return {
      players: updatedPlayers,
      remainingDeck: undefined,
    };
  });
};

const schedulePlayingPhaseTransition = (get: () => GameStoreState, set: SetStateFn) => {
  setTimeout(() => {
    if (get().gameStatus === "final_deal") {
      set({
        gameStatus: "playing",
        statusMessage: "Game started! Your turn to play...",
      });

      showToast("Game started! Your turn to play...", "success");

      setTimeout(() => {
        set({ statusMessage: null });
      }, TIMING.STATUS_MESSAGE_CLEAR_DELAY);
    }
  }, TIMING.FINAL_DEAL_TRANSITION_DELAY);
};

const handlePlayingStarted: MessageHandler = (message, get, set) => {
  logger.info("Received game:playing-started message");

  if (get().gameStatus !== "playing") {
    const currentUser = getCurrentUser();

    set((state) => {
      logger.info(
        "Player hands when entering playing phase:",
        state.players.map((p) => ({
          id: p.id,
          name: p.name,
          handLength: p.hand?.length || 0,
        }))
      );

      return {
        gameStatus: "playing",
        initialCardsDeal: false,
        statusMessage: "Game started! Your turn to play...",
        currentPlayer: currentUser?.username || "",
      };
    });

    dispatchGameRefreshEvent("playing");
  }
};

// Generic handlers
const handleGameUpdate: MessageHandler = (message, get, set) => {
  const gameState = message.payload.gameState || message.payload;
  
  if (gameState && typeof gameState === "object") {
    get().updateGameState(gameState);
  } else {
    logger.error("Received invalid game state update:", message.payload);
  }
};

const handleGameUpdated: MessageHandler = (message, get, set) => {
  if (!message.payload) {
    logger.error("Received empty game:updated message");
    return;
  }

  logger.info("Received game:updated message:", message.payload);

  if (message.payload.gameState) {
    set((state: GameStoreState) => ({
      ...state,
      currentRoom: message.payload,
    }));
  } else if (message.payload.game) {
    set((state: GameStoreState) => ({
      ...state,
      currentRoom: {
        ...state.currentRoom,
        gameState: message.payload.game,
      } as any,
    }));
  } else {
    logger.error("Received invalid game:updated message format:", message.payload);
  }
};

// Presence handlers
const handlePresenceSync: MessageHandler = (message, get, set) => {
  const presenceState = message.payload;
  
  logger.info("Presence sync received:", presenceState);
  
  // Update connection status for all players
  const { players } = get();
  const updatedPlayers = players.map(player => {
    const presence = presenceState[player.id];
    return {
      ...player,
      isConnected: presence ? presence.connectionStatus === "connected" : false,
    };
  });
  
  set({ players: updatedPlayers });
};

const handlePresenceJoin: MessageHandler = (message, get, set) => {
  const { userId, username } = message.payload;
  
  logger.info(`Player ${username} connected`);
  showToast(`${username} connected`, "info");
  
  // Update player connection status
  set((state) => ({
    players: state.players.map(p => 
      p.id === userId ? { ...p, isConnected: true } : p
    ),
  }));
};

const handlePresenceLeave: MessageHandler = (message, get, set) => {
  const { userId, username } = message.payload;
  
  logger.info(`Player ${username} disconnected`);
  showToast(`${username} disconnected`, "error");
  
  // Update player connection status
  set((state) => ({
    players: state.players.map(p => 
      p.id === userId ? { ...p, isConnected: false } : p
    ),
  }));
};

// Replay handler
const handleReplayAvailable: MessageHandler = (message, get, set) => {
  const { replayData } = message.payload;
  
  logger.info("Replay data available:", replayData);
  showToast("Game replay is now available!", "success");
  
  // Store replay data in state if needed
  set((state) => ({
    currentRoom: {
      ...state.currentRoom,
      replayData,
    } as any,
  }));
};

// Export message handlers registry
export const messageHandlers: Record<string, MessageHandler> = {
  // Player management
  "player:joined": handlePlayerJoined,
  "player:left": handlePlayerLeft,
  
  // Room management
  "room:joined": handleRoomJoined,
  "room:updated": handleRoomUpdated,
  "room:full-state": handleRoomFullState,
  
  // Game flow
  "game:start": handleGameStart,
  "game:started": handleGameStarted,
  "game:updated": handleGameUpdated,
  "game:over": handleGameOver,
  
  // Bidding phase
  "game:bid": handleBidPlaced,
  "game:bid-placed": handleBidPlaced,
  "game:bidding-complete": handleBiddingComplete,
  
  // Card play
  "game:play-card": handleCardPlayed,
  "game:card-played": handleCardPlayed,
  
  // Trick management
  "game:trick-complete": handleTrickComplete,
  "game:trick-winner": handleTrickWinner,
  
  // Trump selection
  "game:select-trump": handleTrumpSelection,
  "game:trump-vote": handleTrumpSelection,
  "game:trump-selected": handleTrumpSelection,
  
  // Game phases
  "game:final-deal": handleFinalDeal,
  "game:playing-started": handlePlayingStarted,
  
  // Game state updates
  "game:update": handleGameUpdate,
  "game:state-updated": handleGameUpdate,
  
  // Social features
  "game:emote": handleEmote,
  
  // Presence tracking
  "presence:sync": handlePresenceSync,
  "presence:join": handlePresenceJoin,
  "presence:leave": handlePresenceLeave,
  
  // Replay system
  "game:replay-available": handleReplayAvailable,
}; 