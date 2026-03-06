import { Room, Client } from "colyseus";
import { GameState, Player, Card, Trick } from "../schema/GameState";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  validateCardPlay,
  determineTrickWinner,
} from "../utils/cardUtils";
import {
  GAME_CONFIG,
  MEDIEVAL_BOT_NAMES,
  CARD_SUITS,
  GamePhase,
} from "../../lib/constants";
import { saveGameResult, GameResult, GameResultPlayer } from "../utils/gameResultsStore";
import {
  CardTracker,
  chooseBotCard,
  BotDifficulty,
  TrickContext,
} from "../utils/botStrategy";

interface JoinOptions {
  userId: string;
  name: string;
}

export class GameRoom extends Room<GameState> {
  maxClients = GAME_CONFIG.MAX_PLAYERS;
  private deck: Card[] = [];
  private botSessionIds: Set<string> = new Set();
  private usedBotNames: Set<string> = new Set();
  private playerUserIds: Map<string, string> = new Map(); // sessionId -> userId
  private scheduledBotActions: Set<string> = new Set(); // Prevent duplicate bot action scheduling
  private disposalTimer: any = null;
  private trumpSelectionStartedAt: number = 0;
  private firstLeadPosition: number = 0;
  private playingPhaseStartedAt: number = 0;
  private cardTracker: CardTracker = new CardTracker();
  private botDifficulty: BotDifficulty = "hard";

  onCreate(options: any) {
    this.setState(new GameState(this.roomId));
    this.state.isPublic = options.isPublic !== false;
    this.state.gameMode = options.gameMode || "classic";

    console.log(`🎮 Room ${this.roomId} created`);

    // Register message handlers
    this.onMessage("start_game", (client) => this.handleStartGame(client));
    this.onMessage("add_bots", (client) => this.handleAddBots(client));
    this.onMessage("vote_trump", (client, data) => this.handleTrumpVote(client, data));
    this.onMessage("play_card", (client, data) => this.handlePlayCard(client, data));
    this.onMessage("ready", (client) => this.handlePlayerReady(client));
    this.onMessage("request_rematch", (client) => this.handleRematchRequest(client));

    // Ping-pong for latency measurement
    this.onMessage("ping", (client, data) => {
      client.send("pong", { timestamp: data.timestamp });
    });

    // Turn timer - checks for timeouts and disconnected players
    this.clock.setInterval(() => {
      this.checkTurnState();
    }, GAME_CONFIG.TURN_CHECK_INTERVAL_MS);

    // Trump selection timeout timer
    this.clock.setInterval(() => {
      this.checkTrumpVotingTimeout();
    }, GAME_CONFIG.TURN_CHECK_INTERVAL_MS);
  }

  /**
   * Check turn state and handle timeouts or disconnected players
   */
  private checkTurnState() {
    if (this.state.phase !== GamePhase.PLAYING || !this.state.currentTurn) return;

    const currentPlayer = this.state.players.get(this.state.currentTurn);
    if (!currentPlayer) return;

    const elapsed = Date.now() - this.state.turnStartedAt;

    // Disconnected players get auto-played immediately (after 2 second grace period)
    if (!currentPlayer.isConnected && !this.botSessionIds.has(this.state.currentTurn)) {
      if (elapsed > 2000) {
        this.handleTurnTimeout(this.state.currentTurn);
      }
      return;
    }

    // Normal timeout for connected players
    if (elapsed > GAME_CONFIG.TURN_TIMEOUT_MS) {
      this.handleTurnTimeout(this.state.currentTurn);
    }
  }

  /**
   * Check if trump voting has timed out and auto-vote for non-voters
   */
  private checkTrumpVotingTimeout() {
    if (this.state.phase !== GamePhase.TRUMP_SELECTION) return;

    const elapsed = Date.now() - this.trumpSelectionStartedAt;
    if (elapsed < GAME_CONFIG.TURN_TIMEOUT_MS) return;

    // Auto-vote for players who haven't voted
    this.state.players.forEach((player, sessionId) => {
      if (!player.hasVoted && !this.botSessionIds.has(sessionId)) {
        // Auto-vote for their most common suit
        const suitCounts: Record<string, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        player.hand.forEach((card) => {
          suitCounts[card.suit]++;
        });
        const autoSuit = Object.entries(suitCounts).reduce((a, b) =>
          a[1] > b[1] ? a : b
        )[0];

        this.broadcast("trump_vote_timeout", { playerId: sessionId, playerName: player.name });
        this.handleTrumpVote({ sessionId } as Client, { suit: autoSuit });
      }
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    // Check if this userId is already in the room (prevent duplicates)
    const existingPlayer = this.findPlayerByUserId(options.userId);
    if (existingPlayer) {
      // If reconnecting to an existing player slot
      if (!existingPlayer.isConnected) {
        const oldSessionId = existingPlayer.id; // Store old ID before updating

        existingPlayer.isConnected = true;
        existingPlayer.id = client.sessionId; // Update session ID
        this.playerUserIds.delete(oldSessionId);
        this.playerUserIds.set(client.sessionId, options.userId);

        // Update the map key - delete old, add new
        this.state.players.delete(oldSessionId);
        this.state.players.set(client.sessionId, existingPlayer);

        // If this player was the host, update hostId
        if (this.state.hostId === oldSessionId) {
          this.state.hostId = client.sessionId;
        }

        // If it was this player's turn, update currentTurn
        if (this.state.currentTurn === oldSessionId) {
          this.state.currentTurn = client.sessionId;
        }

        // Update stale session IDs in the current trick
        for (let i = 0; i < this.state.currentTrick.playedBy.length; i++) {
          if (this.state.currentTrick.playedBy[i] === oldSessionId) {
            this.state.currentTrick.playedBy[i] = client.sessionId;
          }
        }
        if (this.state.currentTrick.winnerId === oldSessionId) {
          this.state.currentTrick.winnerId = client.sessionId;
        }

        // Transfer trump vote to new session ID
        if (this.state.trumpVotes.has(oldSessionId)) {
          const vote = this.state.trumpVotes.get(oldSessionId)!;
          this.state.trumpVotes.delete(oldSessionId);
          this.state.trumpVotes.set(client.sessionId, vote);
        }

        // Transfer rematch vote to new session ID
        if (this.state.rematchVotes.has(oldSessionId)) {
          const vote = this.state.rematchVotes.get(oldSessionId)!;
          this.state.rematchVotes.delete(oldSessionId);
          this.state.rematchVotes.set(client.sessionId, vote);
        }

        this.broadcast("player_reconnected", {
          playerId: client.sessionId,
          name: existingPlayer.name,
          position: existingPlayer.position,
        });
        console.log(`🔄 Player ${existingPlayer.name} reconnected`);
        return;
      } else {
        throw new Error("You are already in this room");
      }
    }

    const position = this.state.players.size;

    if (position >= this.maxClients) {
      throw new Error("Room is full");
    }

    // Team assignment: 0, 2 = Royals (team 0), 1, 3 = Rebels (team 1)
    const team = position % 2;

    const player = new Player(
      client.sessionId,
      options.name || `Player ${position + 1}`,
      options.userId,
      position,
      team
    );

    // First player is host
    if (position === 0) {
      player.isHost = true;
      this.state.hostId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
    this.playerUserIds.set(client.sessionId, options.userId);

    this.broadcast("player_joined", {
      playerId: client.sessionId,
      name: player.name,
      position,
      team,
    });
  }

  /**
   * Find a player by their userId (not sessionId)
   */
  private findPlayerByUserId(userId: string): Player | undefined {
    for (const [, player] of this.state.players) {
      if (player.userId === userId) {
        return player;
      }
    }
    return undefined;
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.isConnected = false;

      // If game hasn't started, remove player immediately
      if (this.state.phase === GamePhase.WAITING) {
        this.state.players.delete(client.sessionId);
        this.playerUserIds.delete(client.sessionId);

        // Reassign positions for remaining players to avoid gaps
        this.reassignPositions();

        // Reassign host if needed
        if (client.sessionId === this.state.hostId && this.state.players.size > 0) {
          const newHost = Array.from(this.state.players.values())[0];
          newHost.isHost = true;
          this.state.hostId = newHost.id;
          this.broadcast("host_changed", { newHostId: newHost.id, newHostName: newHost.name });
        }

        this.broadcast("player_left", { playerId: client.sessionId, playerName: player.name });
      } else {
        // Game is in progress - allow reconnection window
        this.broadcast("player_disconnected", {
          playerId: client.sessionId,
          playerName: player.name,
        });

        // If it's their turn, the checkTurnState timer will handle auto-play
        // They have a chance to reconnect before being auto-played

        // If player consented to leave (closed tab intentionally),
        // check if all human players have left
        if (consented) {
          const connectedHumans = Array.from(this.state.players.values()).filter(
            p => p.isConnected && !this.botSessionIds.has(p.id)
          );

          if (connectedHumans.length === 0 && this.state.phase !== GamePhase.ENDED) {
            // All humans left, end the game
            console.log(`🚪 All players left, ending game in room ${this.roomId}`);
            this.endGameDueToDisconnection();
          }
        }
      }

      // If no connected human players remain, dispose room
      const connectedHumanPlayers = Array.from(this.state.players.values()).filter(
        p => p.isConnected && !this.botSessionIds.has(p.id)
      );
      if (connectedHumanPlayers.length === 0) {
        if (this.state.phase !== GamePhase.ENDED && this.state.phase !== GamePhase.WAITING) {
          this.endGameDueToDisconnection();
        } else {
          this.disconnect();
        }
      }
    }
  }

  /**
   * Reassign player positions to avoid gaps (only in waiting room)
   */
  private reassignPositions() {
    const players = Array.from(this.state.players.values()).sort(
      (a, b) => a.position - b.position
    );
    players.forEach((player, index) => {
      if (player.position !== index) {
        player.position = index;
        player.team = index % 2;
      }
    });
  }

  /**
   * End game when all players have disconnected
   */
  private endGameDueToDisconnection() {
    this.state.phase = GamePhase.ENDED;
    this.state.winner = ""; // No winner

    this.broadcast("game_ended", {
      winner: null,
      reason: "all_players_left",
      royalsTricks: this.state.royalsTricks,
      rebelsTricks: this.state.rebelsTricks,
    });

    // Persist game results even for disconnection (if playing phase was reached)
    if (this.playingPhaseStartedAt > 0) {
      this.persistGameResult("disconnection");
    }

    this.clock.setTimeout(() => {
      this.disconnect();
    }, 5000); // Shorter timeout since everyone left
  }

  onDispose() {
    console.log(`🗑️  Room ${this.roomId} disposed`);
  }

  // ==================== GAME FLOW HANDLERS ====================

  private handleStartGame(client: Client) {
    const player = this.state.players.get(client.sessionId);

    if (!player?.isHost) {
      this.sendClientError(client, 0, "Only host can start the game");
      return;
    }

    if (this.state.players.size < 4) {
      this.sendClientError(client, 0, "Need 4 players to start");
      return;
    }

    if (this.state.phase !== GamePhase.WAITING) {
      this.sendClientError(client, 0, "Game already started");
      return;
    }

    this.startInitialDeal();
  }

  private handleAddBots(client: Client) {
    const player = this.state.players.get(client.sessionId);

    if (!player?.isHost) {
      this.sendClientError(client, 0, "Only host can add bots");
      return;
    }

    if (this.state.phase !== GamePhase.WAITING) {
      this.sendClientError(client, 0, "Can only add bots before game starts");
      return;
    }

    const botsNeeded = 4 - this.state.players.size;
    if (botsNeeded <= 0) {
      this.sendClientError(client, 0, "Room is already full");
      return;
    }


    for (let i = 0; i < botsNeeded; i++) {
      if (this.state.players.size >= 4) break;
      const position = this.state.players.size;
      const team = position % 2;
      const botId = `bot_${Date.now()}_${position}`;

      const botPlayer = new Player(
        botId,
        this.getRandomBotName(),
        botId,
        position,
        team
      );

      this.state.players.set(botId, botPlayer);
      this.botSessionIds.add(botId);

      this.broadcast("player_joined", {
        playerId: botId,
        name: botPlayer.name,
        position,
        team,
      });

    }
  }

  private getRandomBotName(): string {
    const availableNames = MEDIEVAL_BOT_NAMES.filter(
      name => !this.usedBotNames.has(name)
    );

    if (availableNames.length === 0) {
      this.usedBotNames.clear();
      return MEDIEVAL_BOT_NAMES[0];
    }

    const randomIndex = Math.floor(Math.random() * availableNames.length);
    const selectedName = availableNames[randomIndex];
    this.usedBotNames.add(selectedName);

    return selectedName;
  }

  private startInitialDeal() {
    this.state.phase = GamePhase.INITIAL_DEAL;
    this.state.startedAt = Date.now();

    // Create and shuffle deck
    this.deck = shuffleDeck(createDeck());

    // Deal 5 cards to each player
    const hands = dealCards(this.deck, 4, 5);
    const playerArray = Array.from(this.state.players.values()).sort(
      (a, b) => a.position - b.position
    );

    playerArray.forEach((player, index) => {
      player.hand.push(...hands[index]);
    });

    this.broadcast("initial_deal_complete", {
      phase: "initial_deal",
    });

    // Move to trump selection
    this.clock.setTimeout(() => {
      this.state.phase = GamePhase.TRUMP_SELECTION;
      this.trumpSelectionStartedAt = Date.now();
      this.broadcast("phase_changed", { phase: GamePhase.TRUMP_SELECTION });
      this.triggerBotActions();
    }, GAME_CONFIG.PHASE_TRANSITION_DELAY_MS);
  }

  private sendClientError(client: Client, code: number, message: string) {
    if (typeof client.error === "function") {
      client.error(code, message);
    }
  }

  private handleTrumpVote(client: Client, data: { suit: string }) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;

    if (this.state.phase !== GamePhase.TRUMP_SELECTION) {
      this.sendClientError(client, 0, "Not in trump selection phase");
      return;
    }

    if (player.hasVoted) {
      this.sendClientError(client, 0, "Already voted");
      return;
    }

    const validSuits = CARD_SUITS.map(s => s.toString());
    if (!validSuits.includes(data.suit)) {
      this.sendClientError(client, 0, "Invalid suit");
      return;
    }

    player.trumpVote = data.suit;
    player.hasVoted = true;
    this.state.trumpVotes.set(client.sessionId, data.suit);

    this.broadcast("trump_vote_received", {
      playerId: client.sessionId,
      votesRemaining: GAME_CONFIG.MAX_PLAYERS - this.state.trumpVotes.size,
    });

    if (this.state.trumpVotes.size === GAME_CONFIG.MAX_PLAYERS) {
      this.determineTrumpSuit();
    }
  }

  private determineTrumpSuit() {
    // Count votes
    const votes: { [suit: string]: number } = {};
    this.state.trumpVotes.forEach((suit) => {
      votes[suit] = (votes[suit] || 0) + 1;
    });

    // Find suit with most votes
    let maxVotes = 0;
    let winningSuits: string[] = [];

    Object.entries(votes).forEach(([suit, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningSuits = [suit];
      } else if (count === maxVotes) {
        winningSuits.push(suit);
      }
    });

    // If tie, pick random
    this.state.trumpSuit = winningSuits[Math.floor(Math.random() * winningSuits.length)];

    this.broadcast("trump_selected", {
      trumpSuit: this.state.trumpSuit,
      votes,
    });

    this.clock.setTimeout(() => {
      this.startFinalDeal();
    }, GAME_CONFIG.PHASE_TRANSITION_DELAY_MS);
  }

  private startFinalDeal() {
    this.state.phase = GamePhase.FINAL_DEAL;

    // Deal remaining 8 cards to each player
    const hands = dealCards(this.deck, 4, 8);
    const playerArray = Array.from(this.state.players.values()).sort(
      (a, b) => a.position - b.position
    );

    playerArray.forEach((player, index) => {
      player.hand.push(...hands[index]);
    });

    this.broadcast("final_deal_complete", {
      phase: "final_deal",
    });

    this.clock.setTimeout(() => {
      this.startPlayingPhase();
    }, GAME_CONFIG.PHASE_TRANSITION_DELAY_MS);
  }

  private startPlayingPhase() {
    this.state.phase = GamePhase.PLAYING;
    this.playingPhaseStartedAt = Date.now();
    // Player at firstLeadPosition leads the first trick (rotates on rematch)
    const firstPlayer = Array.from(this.state.players.values()).sort(
      (a, b) => a.position - b.position
    )[this.firstLeadPosition];
    this.state.currentTurn = firstPlayer.id;
    this.state.turnStartedAt = Date.now();
    this.state.currentTrick = new Trick(0);

    this.broadcast("phase_changed", {
      phase: "playing",
      currentTurn: this.state.currentTurn,
    });

    this.triggerBotActions(); // First player might be bot
  }

  private handlePlayCard(client: Client, data: { cardId: string }) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;
    if (this.state.phase !== GamePhase.PLAYING) {
      this.sendClientError(client, 0, "Not in playing phase");
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      this.sendClientError(client, 0, "Not your turn");
      return;
    }

    // Find card in player's hand
    const cardIndex = player.hand.findIndex(c => c.id === data.cardId);
    if (cardIndex === -1) {
      this.sendClientError(client, 0, "Card not in hand");
      return;
    }

    const card = player.hand[cardIndex];

    // Validate card play
    const isValid = validateCardPlay(
      card,
      player.hand.map(c => c),
      this.state.currentTrick.ledSuit
    );

    if (!isValid) {
      this.sendClientError(client, 0, "Must follow suit if possible");
      return;
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

    // Track void detection for in-progress trick
    const isLead = this.state.currentTrick.cards.length === 0;
    this.cardTracker.recordCardInProgress(
      card,
      client.sessionId,
      this.state.currentTrick.ledSuit,
      isLead
    );

    // Add card to trick
    this.state.currentTrick.cards.push(card);
    this.state.currentTrick.playedBy.push(client.sessionId);

    // Set led suit if first card
    if (this.state.currentTrick.cards.length === 1) {
      this.state.currentTrick.ledSuit = card.suit;
    }

    this.broadcast("card_played", {
      playerId: client.sessionId,
      card: { suit: card.suit, value: card.value },
      cardsInTrick: this.state.currentTrick.cards.length,
    });

    // Check if trick is complete (4 cards played)
    if (this.state.currentTrick.cards.length === 4) {
      this.resolveTrick();
    } else {
      this.nextTurn();
    }
  }

  private resolveTrick() {
    // Record completed trick in card tracker
    this.cardTracker.recordTrick(
      this.state.currentTrick.cards.map(c => c),
      this.state.currentTrick.playedBy.map(id => id),
      this.state.currentTrick.ledSuit
    );

    const winnerId = determineTrickWinner(
      this.state.currentTrick.cards.map(c => c),
      this.state.currentTrick.playedBy.map(id => id),
      this.state.trumpSuit,
      this.state.currentTrick.ledSuit
    );

    const winner = this.state.players.get(winnerId);
    if (!winner) return;

    this.state.currentTrick.winnerId = winnerId;
    this.state.currentTrick.winningTeam = winner.team;

    // Update trick counts
    if (winner.team === 0) {
      this.state.royalsTricks++;
    } else {
      this.state.rebelsTricks++;
    }

    this.state.tricksPlayed++;

    this.broadcast("trick_complete", {
      winnerId,
      winningTeam: winner.team === 0 ? "royals" : "rebels",
      royalsTricks: this.state.royalsTricks,
      rebelsTricks: this.state.rebelsTricks,
    });

    // Save the completed trick as lastTrick before creating a new one
    const completedTrick = new Trick(this.state.currentTrick.trickNumber);
    completedTrick.winnerId = winnerId;
    completedTrick.winningTeam = winner.team;
    completedTrick.ledSuit = this.state.currentTrick.ledSuit;
    this.state.currentTrick.cards.forEach((card) => {
      completedTrick.cards.push(new Card(card.suit, card.value, card.id));
    });
    this.state.currentTrick.playedBy.forEach((id) => {
      completedTrick.playedBy.push(id);
    });
    this.state.lastTrick = completedTrick;

    // Check for game end
    if (this.state.royalsTricks >= GAME_CONFIG.TRICKS_TO_WIN ||
        this.state.rebelsTricks >= GAME_CONFIG.TRICKS_TO_WIN ||
        this.state.tricksPlayed >= GAME_CONFIG.TOTAL_TRICKS) {
      this.clock.setTimeout(() => this.endGame(), GAME_CONFIG.TRICK_COMPLETE_DELAY_MS);
    } else {
      this.clock.setTimeout(() => {
        this.state.currentTrick = new Trick(this.state.tricksPlayed);
        this.state.currentTurn = winnerId;
        this.state.turnStartedAt = Date.now();

        this.broadcast("new_trick", {
          trickNumber: this.state.tricksPlayed,
          leadPlayer: winnerId,
        });

        this.triggerBotActions();
      }, GAME_CONFIG.TRICK_COMPLETE_DELAY_MS);
    }
  }

  private endGame() {
    this.state.phase = GamePhase.ENDED;

    if (this.state.royalsTricks > this.state.rebelsTricks) {
      this.state.winner = "royals";
      this.state.isKot = this.state.royalsTricks === GAME_CONFIG.TOTAL_TRICKS;
    } else {
      this.state.winner = "rebels";
      this.state.isKot = this.state.rebelsTricks === GAME_CONFIG.TOTAL_TRICKS;
    }

    this.broadcast("game_ended", {
      winner: this.state.winner,
      isKot: this.state.isKot,
      royalsTricks: this.state.royalsTricks,
      rebelsTricks: this.state.rebelsTricks,
    });

    // Persist game results
    this.persistGameResult("completed");

    this.disposalTimer = this.clock.setTimeout(() => {
      this.disconnect();
    }, GAME_CONFIG.ROOM_DISPOSAL_DELAY_MS);
  }

  private nextTurn() {
    const playerArray = Array.from(this.state.players.values()).sort(
      (a, b) => a.position - b.position
    );

    const currentIndex = playerArray.findIndex(p => p.id === this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % playerArray.length;

    this.state.currentTurn = playerArray[nextIndex].id;
    this.state.turnStartedAt = Date.now();

    this.triggerBotActions(); // Next player might be bot
  }

  private handlePlayerReady(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isReady = true;
      this.broadcast("player_ready", { playerId: client.sessionId });
    }
  }

  private handleTurnTimeout(playerId: string) {
    // Race condition fix: verify player is still current turn
    if (this.state.currentTurn !== playerId) return;
    if (this.state.phase !== GamePhase.PLAYING) return;

    const player = this.state.players.get(playerId);
    if (!player || player.hand.length === 0) return;

    // Reset turnStartedAt to prevent re-triggering
    this.state.turnStartedAt = Date.now();

    // Find first valid card
    let cardToPlay: Card | undefined;
    for (const card of player.hand) {
      if (validateCardPlay(card, player.hand.map(c => c), this.state.currentTrick.ledSuit)) {
        cardToPlay = card;
        break;
      }
    }

    if (cardToPlay) {
      this.broadcast("turn_timeout", { playerId, playerName: player.name });
      this.handlePlayCard(
        { sessionId: playerId } as Client,
        { cardId: cardToPlay.id }
      );
    }
  }

  // ==================== GAME PERSISTENCE ====================

  /**
   * Build and save a GameResult to the database (fire-and-forget).
   */
  private persistGameResult(endReason: "completed" | "disconnection") {
    const now = Date.now();
    const durationSeconds = this.playingPhaseStartedAt > 0
      ? Math.round((now - this.playingPhaseStartedAt) / 1000)
      : 0;

    const players: GameResultPlayer[] = [];
    this.state.players.forEach((player, sessionId) => {
      players.push({
        userId: player.userId,
        name: player.name,
        team: player.team === 0 ? "royals" : "rebels",
        position: player.position,
        isBot: this.botSessionIds.has(sessionId),
      });
    });

    const result: GameResult = {
      roomId: this.roomId,
      gameMode: this.state.gameMode,
      winner: (this.state.winner as "royals" | "rebels" | "") || "",
      royalsTricks: this.state.royalsTricks,
      rebelsTricks: this.state.rebelsTricks,
      isKot: this.state.isKot,
      trumpSuit: this.state.trumpSuit,
      players,
      durationSeconds,
      endedAt: now,
      endReason,
    };

    // Fire-and-forget: don't block game flow on DB writes
    saveGameResult(result).catch((err) => {
      console.error("Failed to persist game result:", err);
    });
  }

  // ==================== BOT AI LOGIC ====================

  private triggerBotActions() {
    const currentTurn = this.state.currentTurn;

    if (currentTurn && this.botSessionIds.has(currentTurn)) {
      // Prevent duplicate scheduling
      const actionKey = `play_${currentTurn}_${this.state.tricksPlayed}_${this.state.currentTrick.cards.length}`;
      if (this.scheduledBotActions.has(actionKey)) return;
      this.scheduledBotActions.add(actionKey);

      const [minDelay, maxDelay] = GAME_CONFIG.BOT_ACTION_DELAY_MS;
      this.clock.setTimeout(() => {
        this.scheduledBotActions.delete(actionKey);
        // Verify it's still this bot's turn
        if (this.state.phase === GamePhase.PLAYING && this.state.currentTurn === currentTurn) {
          this.botPlayCard(currentTurn);
        }
      }, minDelay + Math.random() * (maxDelay - minDelay));
    }

    if (this.state.phase === GamePhase.TRUMP_SELECTION) {
      const [minDelay, maxDelay] = GAME_CONFIG.BOT_VOTE_DELAY_MS;
      this.botSessionIds.forEach((botId) => {
        const bot = this.state.players.get(botId);
        if (bot && !bot.hasVoted) {
          // Prevent duplicate scheduling
          const voteKey = `vote_${botId}`;
          if (this.scheduledBotActions.has(voteKey)) return;
          this.scheduledBotActions.add(voteKey);

          this.clock.setTimeout(() => {
            this.scheduledBotActions.delete(voteKey);
            this.botVoteTrump(botId);
          }, minDelay + Math.random() * (maxDelay - minDelay));
        }
      });
    }
  }

  private botVoteTrump(botId: string) {
    const bot = this.state.players.get(botId);
    if (!bot || bot.hasVoted) return;

    const suitCounts: Record<string, number> = {};
    CARD_SUITS.forEach(suit => { suitCounts[suit] = 0; });

    bot.hand.forEach((card) => {
      suitCounts[card.suit]++;
    });

    const preferredSuit = CARD_SUITS.reduce((a, b) =>
      suitCounts[a] > suitCounts[b] ? a : b
    );

    this.handleTrumpVote({ sessionId: botId } as Client, { suit: preferredSuit });
  }

  private botPlayCard(botId: string) {
    const bot = this.state.players.get(botId);
    if (!bot || bot.hand.length === 0) return;

    const ledSuit = this.state.currentTrick.ledSuit;
    const trumpSuit = this.state.trumpSuit;

    const hand = bot.hand.map(c => c);
    const validCards = hand.filter((card) =>
      validateCardPlay(card, hand, ledSuit)
    );

    if (validCards.length === 0) return;

    // Build player teams map for partner awareness
    const playerTeams = new Map<string, number>();
    this.state.players.forEach((p, id) => {
      playerTeams.set(id, p.team);
    });

    const context: TrickContext = {
      trickCards: this.state.currentTrick.cards.map(c => c),
      trickPlayerIds: this.state.currentTrick.playedBy.map(id => id),
      ledSuit,
      trumpSuit,
      botId,
      botTeam: bot.team,
      playerTeams,
      tricksPlayed: this.state.tricksPlayed,
    };

    const cardToPlay = chooseBotCard(hand, validCards, context, this.cardTracker, this.botDifficulty);

    if (cardToPlay) {
      this.handlePlayCard({ sessionId: botId } as Client, { cardId: cardToPlay.id });
    }
  }

  /**
   * Handle rematch request from a player
   */
  private handleRematchRequest(client: Client) {
    // Only allow rematch requests when game has ended
    if (this.state.phase !== GamePhase.ENDED) {
      client.send("error", { message: "Game is not over yet" });
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Record the vote
    this.state.rematchVotes.set(client.sessionId, true);
    console.log(`🔄 ${player.name} wants a rematch`);

    // Broadcast rematch vote update
    this.broadcast("rematch_vote", {
      playerId: client.sessionId,
      playerName: player.name,
      votesCount: this.state.rematchVotes.size,
      totalPlayers: this.state.players.size,
    });

    // Auto-vote for bots
    this.botSessionIds.forEach((botSessionId) => {
      if (!this.state.rematchVotes.has(botSessionId)) {
        this.state.rematchVotes.set(botSessionId, true);
      }
    });

    // Check if all players want rematch
    const humanPlayers = Array.from(this.state.players.keys()).filter(
      (id) => !this.botSessionIds.has(id)
    );
    const allHumansVoted = humanPlayers.every((id) => this.state.rematchVotes.has(id));

    if (allHumansVoted && this.state.rematchVotes.size === this.state.players.size) {
      this.startRematch();
    }
  }

  /**
   * Start a new game with the same players
   */
  private startRematch() {
    console.log("🔄 Starting rematch!");

    // Cancel disposal timer from previous game
    if (this.disposalTimer) {
      this.disposalTimer.clear();
      this.disposalTimer = null;
    }

    // Broadcast rematch starting
    this.broadcast("rematch_starting", {});

    // Rotate who leads the first trick
    this.firstLeadPosition = (this.firstLeadPosition + 1) % 4;

    // Reset game state while preserving players
    this.state.phase = GamePhase.WAITING;
    this.state.trumpSuit = "";
    this.state.trumpVotes.clear();
    this.state.rematchVotes.clear();
    this.state.currentTurn = "";
    this.state.currentTrick = new Trick(0);
    this.state.lastTrick = null;
    this.state.tricksPlayed = 0;
    this.state.royalsTricks = 0;
    this.state.rebelsTricks = 0;
    this.state.winner = "";
    this.state.isKot = false;
    this.state.startedAt = 0;
    this.state.turnStartedAt = 0;
    this.playingPhaseStartedAt = 0;

    // Reset player states
    this.state.players.forEach((player) => {
      player.hand.clear();
      player.hasVoted = false;
      player.trumpVote = "";
      player.isReady = false;
    });

    // Clear deck and tracking
    this.deck = [];
    this.scheduledBotActions.clear();
    this.cardTracker.reset();

    // Auto-start the new game since all players are already here
    this.clock.setTimeout(() => {
      this.startInitialDeal();
    }, 1500);
  }

}
