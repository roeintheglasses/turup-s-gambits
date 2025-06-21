import { GameRoom, Player, GameState, Card, Suit, Rank } from "../app/types/game";

/**
 * GameManager - Singleton class responsible for managing game rooms and game logic
 * Handles room creation, player management, game flow, and card dealing
 */
export class GameManager {
  private rooms: Map<string, GameRoom>;
  private static instance: GameManager;

  private constructor() {
    this.rooms = new Map();
  }

  /**
   * Get singleton instance of GameManager
   */
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Get all active rooms
   */
  public getRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Create a new game room with default state
   */
  private createNewRoom(): GameRoom {
    const roomId = this.generateRoomId();
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
        leadSuit: null,
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
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  /**
   * Find an available room or create a new one
   */
  public findOrCreateRoom(): GameRoom {
    // Find a room with less than 4 players in waiting state
    for (const room of this.rooms.values()) {
      if (room.players.length < 4 && room.gameState.gamePhase === "waiting") {
        return room;
      }
    }
    // If no suitable room found, create a new one
    return this.createNewRoom();
  }

  /**
   * Add a player to a specific room
   */
  public addPlayerToRoom(
    roomId: string,
    playerName: string,
    playerId?: string,
    isBot: boolean = false
  ): Player {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length >= 4) {
      throw new Error("Room is full");
    }

    // Check if player already exists in the room
    const existingPlayer = room.players.find((p) => {
      // For bots, check by ID since bot names might be reused
      if (isBot && playerId) {
        return p.id === playerId;
      }
      // For human players, check by name
      return p.name === playerName;
    });

    if (existingPlayer) {
      console.log(
        `Player ${playerName} (${playerId}) already exists in room ${roomId}`
      );
      return existingPlayer;
    }

    // Generate a deterministic ID if not provided
    const id =
      playerId ||
      `player_${playerName.replace(/\s+/g, "_").toLowerCase()}_${Math.random()
        .toString(36)
        .substring(2, 6)}`;

    // Check if this is the first player (should be host)
    const isFirstPlayer = room.players.length === 0;

    const newPlayer: Player = {
      id,
      name: playerName,
      hand: [],
      score: 0,
      isReady: false,
      isHost: isFirstPlayer,
      isBot,
    };

    console.log(
      `Adding player ${playerName} to room ${room.id}, isHost: ${isFirstPlayer}, isBot: ${isBot}`
    );

    room.players.push(newPlayer);
    room.lastActivity = Date.now();
    return newPlayer;
  }

  /**
   * Remove a player from a room
   */
  public removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivity = Date.now();

    // If room is empty, remove it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return;
    }

    // Assign new host if needed
    const hasHost = room.players.some((p) => p.isHost);
    if (!hasHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }
  }

  /**
   * Get a specific room by ID
   */
  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Update the game state of a room
   */
  public updateGameState(roomId: string, gameState: Partial<GameState>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState = { ...room.gameState, ...gameState };
    room.lastActivity = Date.now();
  }

  /**
   * Clean up stale rooms based on inactivity
   */
  public cleanupStaleRooms(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Generate a complete deck of cards
   */
  private generateDeck(): Card[] {
    const deck: Card[] = [];
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}`,
        });
      }
    }

    return deck;
  }

  /**
   * Shuffle a deck of cards using Fisher-Yates algorithm
   */
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Start a new game in the specified room
   */
  public startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length !== 4) {
      throw new Error("Game requires exactly 4 players");
    }

    // Reset game state
    this.resetGameState(room);

    // Generate and shuffle deck
    const deck = this.shuffleDeck(this.generateDeck());
    room.deck = deck;

    // Assign teams (partners sit opposite each other)
    room.gameState.teams = {
      royals: [room.players[0].id, room.players[2].id],
      rebels: [room.players[1].id, room.players[3].id],
    };

    // Set dealer and trump caller
    const dealerIndex = Math.floor(Math.random() * 4);
    const trumpCallerIndex = (dealerIndex + 1) % 4;
    
    room.gameState.dealerIndex = dealerIndex;
    room.gameState.trumpCaller = room.players[trumpCallerIndex].id;

    // Deal initial 5 cards to each player
    this.dealInitialCards(room, deck);

    // Set up for trump selection
    room.gameState.gamePhase = "initial_deal";
    room.gameState.currentTurn = room.players[trumpCallerIndex].id;
    room.gameState.remainingDeck = deck.slice(20); // Save remaining cards

    room.lastActivity = Date.now();
  }

  /**
   * Reset game state for a new game
   */
  private resetGameState(room: GameRoom): void {
    // Clear player hands and reset ready status
    room.players.forEach(player => {
      player.hand = [];
      player.score = 0;
    });

    // Reset game state
    room.gameState = {
      currentTurn: null,
      trumpSuit: null,
      currentBid: 0,
      currentBidder: null,
      trickCards: {},
      roundNumber: 1,
      gamePhase: "waiting",
      leadSuit: null,
      teams: { royals: [], rebels: [] },
      scores: { royals: 0, rebels: 0 },
      consecutiveTricks: { royals: 0, rebels: 0 },
      lastTrickWinner: null,
      dealerIndex: 0,
      trumpCaller: null,
      trumpVotes: {},
      playersVoted: [],
    };

    // Clear deck reference
    delete room.gameState.remainingDeck;
    delete room.deck;
  }

  /**
   * Deal initial 5 cards to each player
   */
  private dealInitialCards(room: GameRoom, deck: Card[]): void {
    let currentCardIndex = 0;
    for (let round = 0; round < 5; round++) {
      for (let playerOffset = 0; playerOffset < 4; playerOffset++) {
        const playerIndex = (room.gameState.dealerIndex + 1 + playerOffset) % 4;
        const player = room.players[playerIndex];
        player.hand.push(deck[currentCardIndex]);
        currentCardIndex++;
      }
    }
  }

  /**
   * Handle trump voting
   */
  public voteForTrump(roomId: string, playerId: string, suit: Suit): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.gameState.gamePhase !== "initial_deal") {
      console.log(`Cannot vote for trump in phase ${room.gameState.gamePhase}`);
      return;
    }

    // Initialize voting structures if needed
    if (!room.gameState.trumpVotes) {
      room.gameState.trumpVotes = {};
    }
    if (!room.gameState.playersVoted) {
      room.gameState.playersVoted = [];
    }

    // Record the vote
    room.gameState.trumpVotes[playerId] = suit;
    
    if (!room.gameState.playersVoted.includes(playerId)) {
      room.gameState.playersVoted.push(playerId);
    }

    // Check if all players have voted
    if (room.gameState.playersVoted.length >= room.players.length) {
      this.resolveTrumpVoting(room);
    }

    room.lastActivity = Date.now();
  }

  /**
   * Resolve trump voting and determine winning suit
   */
  private resolveTrumpVoting(room: GameRoom): void {
    if (!room.gameState.trumpVotes) return;

    // Count votes for each suit
    const voteCount: Record<Suit, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    };

    for (const playerId in room.gameState.trumpVotes) {
      const votedSuit = room.gameState.trumpVotes[playerId];
      voteCount[votedSuit]++;
    }

    // Find the suit with the most votes
    let maxVotes = 0;
    let winningSuit: Suit | null = null;

    for (const suit in voteCount) {
      const votes = voteCount[suit as Suit];
      if (votes > maxVotes) {
        maxVotes = votes;
        winningSuit = suit as Suit;
      }
    }

         // In case of a tie, the trump caller's vote wins
     if (maxVotes === 1 && room.players.length === 4 && room.gameState.trumpCaller) {
       winningSuit = room.gameState.trumpVotes[room.gameState.trumpCaller] || null;
     }

    // Set the trump suit and proceed to final deal
    room.gameState.trumpSuit = winningSuit;
    this.dealRemainingCards(room);
  }

  /**
   * Deal remaining 8 cards to each player after trump selection
   */
  private dealRemainingCards(room: GameRoom): void {
    if (!room.gameState.trumpSuit || !room.gameState.remainingDeck) {
      throw new Error("Cannot deal remaining cards without trump suit or remaining deck");
    }

    room.gameState.gamePhase = "final_deal";

    let currentCardIndex = 0;
    for (let round = 0; round < 8; round++) {
      for (let playerOffset = 0; playerOffset < 4; playerOffset++) {
        const playerIndex = (room.gameState.dealerIndex + 1 + playerOffset) % 4;
        const player = room.players[playerIndex];
        player.hand.push(room.gameState.remainingDeck[currentCardIndex]);
        currentCardIndex++;
      }
    }

    // Sort all player hands
    room.players.forEach(player => this.sortPlayerHand(player));

    // Clean up and start playing phase
    delete room.gameState.remainingDeck;
    delete room.deck;
    
    this.startPlayingPhase(room);
    room.lastActivity = Date.now();
  }

  /**
   * Start the playing phase after final deal
   */
  private startPlayingPhase(room: GameRoom): void {
    if (room.gameState.gamePhase !== "final_deal") {
      throw new Error("Cannot start playing before final deal");
    }

    room.gameState.gamePhase = "playing";
    room.gameState.currentTurn = room.gameState.trumpCaller;
    room.gameState.leadSuit = null;
  }

  /**
   * Handle a player playing a card
   */
  public playCard(roomId: string, playerId: string, card: Card): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.gameState.gamePhase !== "playing") {
      throw new Error("Cannot play card when game is not in playing phase");
    }

    if (room.gameState.currentTurn !== playerId) {
      throw new Error("Not your turn");
    }

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }

    const player = room.players[playerIndex];

    // Validate card play
    this.validateCardPlay(player, card, room.gameState);

    // If this is the first card played in the trick, set the lead suit
    if (Object.keys(room.gameState.trickCards).length === 0) {
      room.gameState.leadSuit = card.suit;
    }

    // Remove card from player's hand and add to trick
    player.hand = player.hand.filter((c) => c.id !== card.id);
    room.gameState.trickCards[playerId] = card;

    // Check if trick is complete
    if (Object.keys(room.gameState.trickCards).length === 4) {
      this.resolveTrick(room);
    } else {
      // Move to next player
      const nextPlayerIndex = (playerIndex + 1) % 4;
      room.gameState.currentTurn = room.players[nextPlayerIndex].id;
    }

    room.lastActivity = Date.now();
  }

  /**
   * Validate if a card play is legal
   */
  private validateCardPlay(player: Player, card: Card, gameState: GameState): void {
    // Check if player has the card
    const hasCard = player.hand.some((c) => c.id === card.id);
    if (!hasCard) {
      throw new Error("Player does not have this card");
    }

    // Check if player must follow suit
    if (gameState.leadSuit && card.suit !== gameState.leadSuit) {
      const hasSuit = player.hand.some((c) => c.suit === gameState.leadSuit);
      if (hasSuit) {
        throw new Error("Must follow suit");
      }
    }
  }

  /**
   * Resolve a completed trick and determine winner
   */
  private resolveTrick(room: GameRoom): void {
    const { trickCards, leadSuit, trumpSuit, teams } = room.gameState;
    const trickEntries = Object.entries(trickCards);

    // Find the winning card and player
    const winningEntry = this.findTrickWinner(trickEntries, leadSuit, trumpSuit);
    const winningPlayerId = winningEntry[0];

    // Update scores and check for game end conditions
    this.updateScoresAndCheckGameEnd(room, winningPlayerId, teams);

    // Prepare for next trick if game continues
    if (room.gameState.gamePhase === "playing") {
      this.prepareNextTrick(room, winningPlayerId);
    }
  }

  /**
   * Find the winner of a trick
   */
  private findTrickWinner(
    trickEntries: [string, Card][],
    leadSuit: Suit | null | undefined,
    trumpSuit: Suit | null
  ): [string, Card] {
    let winningEntry = trickEntries[0];
    let winningCard = winningEntry[1];

    for (let i = 1; i < trickEntries.length; i++) {
      const [playerId, card] = trickEntries[i];

      // Trump beats all non-trump cards
      if (trumpSuit && card.suit === trumpSuit && winningCard.suit !== trumpSuit) {
        winningEntry = [playerId, card];
        winningCard = card;
        continue;
      }

      // If both cards are trump, higher trump wins
      if (trumpSuit && card.suit === trumpSuit && winningCard.suit === trumpSuit) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
        continue;
      }

      // If no trumps involved, higher card of lead suit wins
      if (leadSuit && card.suit === leadSuit && winningCard.suit === leadSuit) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
      }
    }

    return winningEntry;
  }

  /**
   * Update scores and check for game end conditions
   */
  private updateScoresAndCheckGameEnd(
    room: GameRoom,
    winningPlayerId: string,
    teams: GameState['teams']
  ): void {
    const winningTeam = teams.royals.includes(winningPlayerId) ? "royals" : "rebels";
    const losingTeam = winningTeam === "royals" ? "rebels" : "royals";

    // Update scores
    room.gameState.scores[winningTeam]++;

    // Update consecutive tricks
    this.updateConsecutiveTricks(room.gameState, winningTeam, losingTeam);

    // Check win conditions
    if (this.checkGameEndConditions(room.gameState)) {
      room.gameState.gamePhase = "finished";
    }
  }

  /**
   * Update consecutive tricks tracking
   */
  private updateConsecutiveTricks(
    gameState: GameState,
    winningTeam: "royals" | "rebels",
    losingTeam: "royals" | "rebels"
  ): void {
    const lastWinnerInSameTeam = gameState.lastTrickWinner && 
      gameState.teams[winningTeam].includes(gameState.lastTrickWinner);

    if (lastWinnerInSameTeam) {
      gameState.consecutiveTricks[winningTeam]++;
    } else {
      gameState.consecutiveTricks[winningTeam] = 1;
      gameState.consecutiveTricks[losingTeam] = 0;
    }
  }

  /**
   * Check various game end conditions
   */
  private checkGameEndConditions(gameState: GameState): boolean {
    // Check for 7 consecutive tricks (baazi)
    if (gameState.consecutiveTricks.royals >= 7 || gameState.consecutiveTricks.rebels >= 7) {
      return true;
    }

    // Check for 7 total tricks
    if (gameState.scores.royals >= 7 || gameState.scores.rebels >= 7) {
      return true;
    }

    // Check if all 13 tricks have been played
    const totalTricks = gameState.scores.royals + gameState.scores.rebels;
    return totalTricks >= 13;
  }

  /**
   * Prepare for the next trick
   */
  private prepareNextTrick(room: GameRoom, winningPlayerId: string): void {
    room.gameState.lastTrickWinner = winningPlayerId;
    room.gameState.trickCards = {};
    room.gameState.leadSuit = null;
    room.gameState.currentTurn = winningPlayerId;

    // Check if all cards have been played
    const allCardsPlayed = room.players.every((p) => p.hand.length === 0);
    if (allCardsPlayed) {
      room.gameState.gamePhase = "finished";
    }
  }

  /**
   * Get numeric value of a card for comparison
   */
  private getCardValue(card: Card): number {
    const rankValues: Record<Rank, number> = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };
    return rankValues[card.rank];
  }

  /**
   * Sort a player's hand by suit and rank
   */
  private sortPlayerHand(player: Player): void {
    player.hand.sort((a, b) => {
      if (a.suit !== b.suit) {
        const suitOrder: Record<Suit, number> = {
          hearts: 0,
          diamonds: 1,
          clubs: 2,
          spades: 3,
        };
        return suitOrder[a.suit] - suitOrder[b.suit];
      } else {
        return this.getCardValue(b) - this.getCardValue(a);
      }
    });
  }

  /**
   * Bot method to automatically vote for trump
   */
  public botVoteForTrump(roomId: string, botId: string): void {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState.gamePhase !== "initial_deal") {
      return;
    }

    if (room.gameState.playersVoted?.includes(botId)) {
      return;
    }

    // Choose a random suit for bot
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    
    this.voteForTrump(roomId, botId, randomSuit);
  }

  /**
   * Trigger bot actions based on current game phase
   */
  public triggerBotActions(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const bots = room.players.filter((p) => p.isBot);
    if (bots.length === 0) return;

    switch (room.gameState.gamePhase) {
      case "initial_deal":
        bots.forEach(bot => {
          if (!room.gameState.playersVoted?.includes(bot.id)) {
            setTimeout(() => {
              this.botVoteForTrump(roomId, bot.id);
            }, 1000 + Math.random() * 2000);
          }
        });
        break;
      // Add more bot behaviors for other phases as needed
    }
  }
}
