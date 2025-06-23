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

// Common utility functions for handlers
const createStateUpdater = (updates: Partial<GameStoreState>) => (state: GameStoreState): GameStoreState => ({
  ...state,
  ...updates
});

const updateCurrentRoom = (updates: any) => (state: GameStoreState): GameStoreState => ({
  ...state,
  currentRoom: {
    ...state.currentRoom,
    ...updates
  } as any
});

const updateGameState = (gameStateUpdates: any) => (state: GameStoreState): GameStoreState => ({
  ...state,
  currentRoom: {
    ...state.currentRoom,
    gameState: {
      ...state.currentRoom?.gameState,
      ...gameStateUpdates
    }
  } as any
});

const showStatusMessage = (message: string, set: SetStateFn, duration = TIMING.STATUS_MESSAGE_CLEAR_DELAY) => {
  set({ statusMessage: message });
  setTimeout(() => set({ statusMessage: null }), duration);
};

const validatePayload = (payload: any, requiredFields: string[]): boolean => {
  if (!payload) {
    logger.warn("Received message with empty payload");
    return false;
  }
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      logger.error(`Missing required field: ${field}`, payload);
      return false;
    }
  }
  
  return true;
};

// Player Management Handlers
const handlePlayerJoined: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, [])) return;

  const playerObject = extractPlayerObject(message.payload);
  if (!playerObject?.id) {
    logger.warn("Player object is missing id:", playerObject);
    return;
  }

  logger.info(`Player ${playerObject.name} joined the game`);
  
  const { teamAssignments } = get();
  
  // Handle team assignment
  if (Object.keys(teamAssignments).length > 0 && !teamAssignments[playerObject.name]) {
    const team = determineTeamForPlayer(playerObject.name, teamAssignments);
    set(createStateUpdater({
      teamAssignments: { ...teamAssignments, [playerObject.name]: team }
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

    const updates: Partial<GameStoreState> = {
      players: [...currentPlayers, playerObject],
    };

    // Handle preserved state for rejoining players
    const { preservedState, currentGameStatus } = message.payload;
    if (preservedState && currentGameStatus && shouldUpdateGameStatus(state.gameStatus, currentGameStatus)) {
      logger.info(`Updating game status from ${state.gameStatus} to ${currentGameStatus}`);
      updates.gameStatus = currentGameStatus;
    }

    return { ...state, ...updates };
  });
};

const handlePlayerLeft: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['playerId'])) return;
  
  const { playerId } = message.payload;
  logger.info(`Player with ID ${playerId} left the game`);
  
  set((state) => ({
    ...state,
    players: (state.players || []).filter(p => p?.id !== playerId),
  }));
};

// Game Flow Handlers
const handleGameStart: MessageHandler = (message, get, set) => {
  logger.info("Game starting...");
  
  const updates: Partial<GameStoreState> = {
    gameStatus: "initial_deal",
    showShuffleAnimation: true,
    initialCardsDeal: true,
    statusMessage: "Game starting... Dealing initial cards",
  };

  if (message.payload?.teamAssignments) {
    logger.info("Received team assignments from host:", message.payload.teamAssignments);
    updates.teamAssignments = message.payload.teamAssignments;
  }

  set(createStateUpdater(updates));
};

const handleGameStarted: MessageHandler = (message, get, set) => {
  if (!message.payload) {
    logger.error("Received empty game:started message");
    return;
  }

  logger.info("Received game:started message:", message.payload);

  const baseUpdates = {
    gameStatus: "initial_deal" as const,
    showShuffleAnimation: true,
    initialCardsDeal: true,
    statusMessage: "Game starting... Dealing initial cards",
    isGameBoardReady: true,
  };

  if (message.payload.gameState) {
    set(createStateUpdater({ ...baseUpdates, currentRoom: message.payload }));
  } else if (message.payload.game) {
    set(updateCurrentRoom({ gameState: message.payload.game }));
    set(createStateUpdater(baseUpdates));
  } else {
    logger.error("Received invalid game:started message format:", message.payload);
  }
};

const handleGameOver: MessageHandler = (message, get, set) => {
  const winner = message.payload?.winner;
  const winnerText = winner === "royals" ? "Royals" : winner === "rebels" ? "Rebels" : "Unknown";
  
  logger.info(`Game over! Winner: ${winnerText}`);
  
  const message_text = winner ? `Game over! ${winnerText} win!` : "Game over!";
  set(createStateUpdater({
    gameStatus: "finished",
    statusMessage: message_text,
  }));

  showToast(message_text, "success");
};

// Bidding Phase Handlers
const handleBidPlaced: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['playerId', 'bid', 'playerName'])) return;
  
  const { playerId, bid, playerName } = message.payload as BidPlacedPayload;
  
  if (bid < 7 || bid > 13) {
    logger.error("Invalid bid received:", bid);
    return;
  }

  logger.info(`Player ${playerName} placed bid: ${bid}`);
  
  const statusMsg = `${playerName} bid ${bid} tricks`;
  set(updateGameState({ currentBid: bid, currentBidder: playerId }));
  showStatusMessage(statusMsg, set);
  showToast(statusMsg, "info");
};

const handleBiddingComplete: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['finalBid', 'winningBidder'])) return;
  
  const { finalBid, winningBidder } = message.payload;
  logger.info(`Bidding complete. Winning bid: ${finalBid} by ${winningBidder}`);
  
  const statusMsg = `Bidding complete! ${winningBidder} won with ${finalBid} tricks`;
  set(createStateUpdater({ gameStatus: "final_deal", statusMessage: statusMsg }));
  showToast("Bidding complete! Final deal starting...", "success");
  
  setTimeout(() => set({ statusMessage: null }), TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

// Card Play Handlers
const handleCardPlayed: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['card', 'playerId', 'playerName'])) return;
  
  const { card: playedCard, playerId, playerName } = message.payload as CardPlayedPayload;
  
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

    return { ...state, currentTrick: updatedTrick, players: updatedPlayers };
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
    const statusMsg = `${trickWinner.playerName} won the trick!`;
    set(createStateUpdater({ currentTrick: [], statusMessage: statusMsg }));

    const currentUser = getCurrentUser();
    const nextPlayerName = currentUser?.username || "";

    setTimeout(() => {
      set(createStateUpdater({
        currentPlayer: nextPlayerName,
        statusMessage: "Your turn to play!",
      }));

      setTimeout(() => set({ statusMessage: null }), TIMING.STATUS_MESSAGE_CLEAR_DELAY);
    }, TIMING.TRICK_RESOLUTION_DELAY);
  }, TIMING.TRICK_RESOLUTION_DELAY);
};

const updateCurrentPlayerAfterCardPlay = (get: () => GameStoreState, set: SetStateFn) => {
  const currentUser = getCurrentUser();
  
  set(createStateUpdater({
    gameStatus: "playing",
    statusMessage: "Game started! Your turn to play...",
    currentPlayer: currentUser?.username || "",
  }));
};

// Trick Management Handlers
const handleTrickComplete: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['winner'])) return;
  
  const { trickCards, winner } = message.payload as TrickCompletePayload;
  logger.info(`Trick completed. Winner: ${winner}`);
  
  const statusMsg = `${winner} won the trick!`;
  set(createStateUpdater({ currentTrick: [], statusMessage: statusMsg }));

  // Update scores
  const { teamAssignments, scores } = get();
  const winnerTeam = teamAssignments[winner];
  
  if (winnerTeam) {
    const newScores = { ...scores, [winnerTeam]: scores[winnerTeam] + 1 };
    set({ scores: newScores });
    
    // Check for game end
    if (newScores[winnerTeam] >= 7) {
      setTimeout(() => {
        const teamName = winnerTeam === "royals" ? "Royals" : "Rebels";
        set(createStateUpdater({
          gameStatus: "finished",
          statusMessage: `Game over! ${teamName} win!`,
        }));
      }, TIMING.TRICK_RESOLUTION_DELAY);
    }
  }

  setTimeout(() => set({ statusMessage: null }), TIMING.STATUS_MESSAGE_CLEAR_DELAY);
};

const handleTrickWinner: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['winner'])) return;
  
  const { winner, team, trickCount } = message.payload;
  
  showToast(`${winner} (${team}) won the trick!`, "success");
  showStatusMessage(`${winner} won the trick!`, set);
  set({ currentPlayer: winner });
};

// Trump Selection Handlers
const handleTrumpSelection: MessageHandler = (message, get, set) => {
  const { suit: selectedSuit } = message.payload as TrumpSelectionPayload;
  
  if (!selectedSuit) {
    logger.warn("Received trump selection without suit");
    return;
  }

  logger.info(`Trump suit selected: ${selectedSuit}`);

  const updates: Partial<GameStoreState> = {
    trumpSuit: selectedSuit,
    votingComplete: true,
  };

  if (message.type === "game:trump-selected") {
    updates.gameStatus = "bidding";
  }

  set(createStateUpdater(updates));
  showToast(`Trump suit selected: ${selectedSuit}`, "info");
};

const handleForceBotVotes: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['roomId', 'hostId'])) return;
  
  const { roomId, hostId } = message.payload;
  logger.info(`Host ${hostId} is forcing bot votes in room ${roomId}`);
  
  showToast("Forcing bots to vote...", "info");
  showStatusMessage("Host is forcing bots to vote...", set);
};

// Room State Handlers
const handleRoomJoined: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  
  if (roomState?.players) {
    logger.info("Room joined, updating state with players:", roomState.players);
    set(createStateUpdater({
      currentRoom: roomState,
      players: roomState.players,
      isConnected: true,
    }));
  }
};

const handleRoomUpdated: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  
  if (roomState) {
    logger.info("Room updated:", roomState);
    set(createStateUpdater({
      currentRoom: roomState,
      players: roomState.players || get().players,
      gameStatus: roomState.gameState?.gamePhase || get().gameStatus,
    }));
  }
};

const handleRoomFullState: MessageHandler = (message, get, set) => {
  const roomState = message.payload;
  logger.info("Received full room state:", roomState);
  
  set(createStateUpdater({
    currentRoom: roomState,
    players: roomState.players || [],
    gameStatus: roomState.gameState?.gamePhase || "waiting",
    trumpSuit: roomState.gameState?.trumpSuit || null,
    scores: roomState.gameState?.scores || { royals: 0, rebels: 0 },
    teamAssignments: roomState.gameState?.teamAssignments || {},
  }));
};

// Social Features
const handleEmote: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['emoji', 'playerName'])) return;
  
  const { emoji, playerId, playerName } = message.payload as EmotePayload;
  logger.info(`Player ${playerName} sent emote: ${emoji}`);
  showToast(`${playerName}: ${emoji}`, "info");
};

// Frenzy Mode Handlers
const handleFrenzyPowerUsed: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['powerType', 'playerId'])) return;
  
  const { powerType, playerId, playerName, data } = message.payload;
  logger.info(`Player ${playerName} used frenzy power: ${powerType}`);
  
  // Update power usage state
  set((state) => ({
    ...state,
    frenzyPowers: {
      ...state.frenzyPowers,
      [playerId]: {
        ...state.frenzyPowers?.[playerId],
        [powerType]: {
          used: true,
          lastUsed: Date.now(),
          usageCount: (state.frenzyPowers?.[playerId]?.[powerType]?.usageCount || 0) + 1,
        },
      },
    },
  }));

  // Show appropriate toast based on power type
  const powerMessages: Record<string, string> = {
    extra_points: `${playerName} activated Extra Heart Points!`,
    free_lead: `${playerName} can now lead with any card!`,
    peek_card: `${playerName} peeked at an opponent's card!`,
    out_of_turn: `${playerName} can play out of turn!`,
  };
  
  const messageText = powerMessages[powerType] || `${playerName} used ${powerType} power!`;
  showToast(messageText, "info");
};

const handleFrenzyPowerEffect: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['effectType'])) return;
  
  const { effectType, targetPlayer, data } = message.payload;
  logger.info(`Frenzy power effect: ${effectType}`, data);
  
  // Handle different power effects
  const effectHandlers: Record<string, () => void> = {
    reveal_card: () => {
      if (data?.card && targetPlayer) {
        showToast(`${targetPlayer}'s card revealed: ${data.card.value} of ${data.card.suit}`, "info");
      }
    },
    extra_points_scored: () => {
      if (data?.points) {
        showToast(`Extra points scored from hearts: +${data.points}`, "success");
      }
    }
  };

  const handler = effectHandlers[effectType];
  if (handler) {
    handler();
  } else {
    logger.warn(`Unknown frenzy power effect: ${effectType}`);
  }
};

// Game Phase Handlers
const handleFinalDeal: MessageHandler = (message, get, set) => {
  logger.info("Starting final deal phase");
  
  set(createStateUpdater({
    gameStatus: "final_deal",
    initialCardsDeal: false,
    statusMessage: "All cards dealt. Game starting soon...",
  }));

  showToast("All cards dealt. Game starting soon...", "info");
  dealRemainingCards(get, set);
  schedulePlayingPhaseTransition(get, set);
};

const dealRemainingCards = (get: () => GameStoreState, set: SetStateFn) => {
  const { remainingDeck: remainingCards, players: allPlayers } = get();
  
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

    return { ...state, players: updatedPlayers, remainingDeck: undefined };
  });
};

const schedulePlayingPhaseTransition = (get: () => GameStoreState, set: SetStateFn) => {
  setTimeout(() => {
    if (get().gameStatus === "final_deal") {
      const statusMsg = "Game started! Your turn to play...";
      set(createStateUpdater({ gameStatus: "playing", statusMessage: statusMsg }));
      showToast(statusMsg, "success");
      setTimeout(() => set({ statusMessage: null }), TIMING.STATUS_MESSAGE_CLEAR_DELAY);
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

      return createStateUpdater({
        gameStatus: "playing",
        initialCardsDeal: false,
        statusMessage: "Game started! Your turn to play...",
        currentPlayer: currentUser?.username || "",
      })(state);
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
    set(updateCurrentRoom(message.payload));
  } else if (message.payload.game) {
    set(updateCurrentRoom({ gameState: message.payload.game }));
  } else {
    logger.error("Received invalid game:updated message format:", message.payload);
  }
};

// Presence handlers
const handlePresenceSync: MessageHandler = (message, get, set) => {
  const presenceState = message.payload;
  logger.info("Presence sync received:", presenceState);
  
  const { players } = get();
  const updatedPlayers = players.map(player => ({
    ...player,
    isConnected: presenceState[player.id]?.connectionStatus === "connected" || false,
  }));
  
  set({ players: updatedPlayers });
};

const handlePresenceJoin: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['userId', 'username'])) return;
  
  const { userId, username } = message.payload;
  logger.info(`Player ${username} connected`);
  showToast(`${username} connected`, "info");
  
  set((state) => ({
    ...state,
    players: state.players.map(p => 
      p.id === userId ? { ...p, isConnected: true } : p
    ),
  }));
};

const handlePresenceLeave: MessageHandler = (message, get, set) => {
  if (!validatePayload(message.payload, ['userId', 'username'])) return;
  
  const { userId, username } = message.payload;
  logger.info(`Player ${username} disconnected`);
  showToast(`${username} disconnected`, "error");
  
  set((state) => ({
    ...state,
    players: state.players.map(p => 
      p.id === userId ? { ...p, isConnected: false } : p
    ),
  }));
};

// Replay handler
const handleReplayAvailable: MessageHandler = (message, get, set) => {
  const { replayData } = message.payload || {};
  
  logger.info("Replay data available:", replayData);
  showToast("Game replay is now available!", "success");
  
  set(updateCurrentRoom({ replayData }));
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
  "game:force-bot-votes": handleForceBotVotes,
  
  // Game phases
  "game:final-deal": handleFinalDeal,
  "game:playing-started": handlePlayingStarted,
  
  // Game state updates
  "game:update": handleGameUpdate,
  "game:state-updated": handleGameUpdate,
  
  // Social features
  "game:emote": handleEmote,
  
  // Frenzy mode powers
  "game:frenzy-power": handleFrenzyPowerUsed,
  "game:frenzy-effect": handleFrenzyPowerEffect,
  
  // Presence tracking
  "presence:sync": handlePresenceSync,
  "presence:join": handlePresenceJoin,
  "presence:leave": handlePresenceLeave,
  
  // Replay system
  "game:replay-available": handleReplayAvailable,
}; 