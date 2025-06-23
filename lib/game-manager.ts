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

  /**
   * Start a frenzy game with random trump selection and special powers
   */
  public startFrenzyGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Reset game state for frenzy mode
    this.resetGameState(room);
    
    // Set game mode to frenzy
    room.gameState.gamePhase = "initial_deal";
    
    // Generate and shuffle deck as normal
    const deck = this.generateDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    
    // Deal initial 5 cards
    this.dealInitialCards(room, shuffledDeck);
    
    // Randomly select trump suit for frenzy mode
    const trumpSuits: Suit[] = ["hearts", "spades", "diamonds", "clubs"];
    const randomTrumpSuit = trumpSuits[Math.floor(Math.random() * trumpSuits.length)];
    room.gameState.trumpSuit = randomTrumpSuit;
    
    // Skip bidding phase in frenzy mode - go straight to final deal
    room.gameState.gamePhase = "final_deal";
    
    // Deal remaining cards
    this.dealRemainingCards(room);
    
    // Initialize frenzy powers based on trump suit
    const frenzyPower = this.getFrenzyPowerForSuit(randomTrumpSuit);
    console.log(`Frenzy game started with trump: ${randomTrumpSuit}, power: ${frenzyPower}`);
    
    // Start playing phase immediately
    this.startPlayingPhase(room);
    
    room.lastActivity = Date.now();
  }

  /**
   * Get the frenzy power associated with a trump suit
   */
  private getFrenzyPowerForSuit(suit: Suit): string {
    const powerMap: Record<Suit, string> = {
      hearts: "extra_points", // Extra points for heart tricks
      spades: "free_lead",    // Lead with any card after winning
      diamonds: "peek_card",  // See one opponent's card
      clubs: "out_of_turn",   // Play one card out of turn
    };
    return powerMap[suit];
  }

  /**
   * Use a frenzy power during gameplay
   */
  public useFrenzyPower(
    roomId: string, 
    playerId: string, 
    powerType: string, 
    targetData?: any
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if power can be used
    if (!this.canUseFrenzyPower(roomId, playerId, powerType)) {
      return false;
    }

    // Initialize frenzy powers tracking if not exists
    if (!room.gameState.frenzyPowers) {
      room.gameState.frenzyPowers = {};
    }
    if (!room.gameState.frenzyPowers[playerId]) {
      room.gameState.frenzyPowers[playerId] = {};
    }

    // Record power usage
    room.gameState.frenzyPowers[playerId][powerType] = {
      used: true,
      lastUsed: Date.now(),
      usageCount: (room.gameState.frenzyPowers[playerId][powerType]?.usageCount || 0) + 1,
    };

    // Handle different power types
    switch (powerType) {
      case "peek_card":
        this.handlePeekCardPower(room, playerId, targetData);
        break;
      case "out_of_turn":
        this.handleOutOfTurnPower(room, playerId);
        break;
      case "free_lead":
        // This is handled during trick resolution
        console.log(`Player ${player.name} can now lead with any card after winning`);
        break;
      case "extra_points":
        // This is handled during trick resolution
        console.log(`Player ${player.name} will get extra points for heart tricks`);
        break;
      default:
        console.warn(`Unknown frenzy power: ${powerType}`);
        return false;
    }

    room.lastActivity = Date.now();
    return true;
  }

  /**
   * Check if a player can use a specific frenzy power
   */
  public canUseFrenzyPower(roomId: string, playerId: string, powerType: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState.gamePhase !== "playing") {
      return false;
    }

    const powerLimits: Record<string, { cooldown: number; maxUses: number }> = {
      peek_card: { cooldown: 30000, maxUses: 2 },      // 30 seconds, max 2 uses
      out_of_turn: { cooldown: 45000, maxUses: 1 },    // 45 seconds, max 1 use
      free_lead: { cooldown: 0, maxUses: -1 },         // Passive, unlimited
      extra_points: { cooldown: 0, maxUses: -1 },      // Passive, unlimited
    };

    const limits = powerLimits[powerType];
    if (!limits) return false;

    const playerPowers = room.gameState.frenzyPowers?.[playerId];
    if (!playerPowers) return true; // No powers used yet

    const powerState = playerPowers[powerType];
    if (!powerState) return true; // This power not used yet

    // Check usage limit
    if (limits.maxUses > 0 && powerState.usageCount >= limits.maxUses) {
      return false;
    }

    // Check cooldown
    if (limits.cooldown > 0) {
      const timeSinceLastUse = Date.now() - powerState.lastUsed;
      if (timeSinceLastUse < limits.cooldown) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle peek card power - reveal one opponent's card
   */
  private handlePeekCardPower(room: GameRoom, playerId: string, targetData: any): void {
    const targetPlayerId = targetData?.targetPlayerId;
    if (!targetPlayerId) return;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || targetPlayer.hand.length === 0) return;

    // Select a random card from target's hand
    const randomCard = targetPlayer.hand[Math.floor(Math.random() * targetPlayer.hand.length)];
    
    // Store revealed card info (in real implementation, this would be sent to the peek initiator only)
    if (!room.gameState.revealedCards) {
      room.gameState.revealedCards = {};
    }
    
    const revealId = `${playerId}-${targetPlayerId}-${Date.now()}`;
    room.gameState.revealedCards[revealId] = {
      playerId: targetPlayerId,
      card: randomCard,
      revealedAt: Date.now(),
      revealedTo: playerId,
    };

    console.log(`Player ${playerId} peeked at ${targetPlayer.name}'s card: ${randomCard.rank} of ${randomCard.suit}`);
  }

  /**
   * Handle out of turn power - grant permission to play out of turn
   */
  private handleOutOfTurnPower(room: GameRoom, playerId: string): void {
    if (!room.gameState.specialEffects) {
      room.gameState.specialEffects = {};
    }

    const effectId = `out_of_turn_${playerId}_${Date.now()}`;
    room.gameState.specialEffects[effectId] = {
      type: "out_of_turn",
      active: true,
      targetPlayer: playerId,
      data: { turnsRemaining: 1 },
    };

    console.log(`Player ${playerId} can now play out of turn`);
  }

  /**
   * Get the current game mode based on room state
   */
  private getGameMode(room: GameRoom): "classic" | "frenzy" {
    // In a real implementation, this would be stored in room metadata
    // For now, we'll determine based on whether frenzy powers exist
    return room.gameState.frenzyPowers ? "frenzy" : "classic";
  }

  /**
   * Enhanced trick resolution for frenzy mode with special effects
   */
  private resolveFrenzyTrick(room: GameRoom): void {
    const trickEntries = Object.entries(room.gameState.trickCards);
    if (trickEntries.length !== room.players.length) {
      return; // Wait for all players
    }

    // Determine trick winner normally
    const [winningPlayerId, winningCard] = this.findTrickWinner(
      trickEntries,
      room.gameState.leadSuit,
      room.gameState.trumpSuit
    );

    const winningPlayer = room.players.find(p => p.id === winningPlayerId);
    if (!winningPlayer) return;

    // Calculate base points
    let trickPoints = 1;
    
    // Apply frenzy power effects
    if (room.gameState.trumpSuit === "hearts") {
      // Check if any hearts were played in this trick
      const heartsPlayed = trickEntries.some(([_, card]) => card.suit === "hearts");
      if (heartsPlayed) {
        trickPoints += 1; // Extra point for heart tricks
        console.log(`Extra point awarded for hearts in trick!`);
      }
    }

    // Update scores
    const teams = room.gameState.teams;
    const winningTeam = this.getPlayerTeam(winningPlayerId, teams);
    
    if (winningTeam) {
      room.gameState.scores[winningTeam] += trickPoints;
      
      // Update consecutive tricks
      const losingTeam = winningTeam === "royals" ? "rebels" : "royals";
      this.updateConsecutiveTricks(room.gameState, winningTeam, losingTeam);
    }

    // Handle free lead power for spades
    if (room.gameState.trumpSuit === "spades" && winningTeam) {
      // Winner can lead with any card next (this is the default behavior)
      console.log(`Player ${winningPlayer.name} won with spades trump - can lead with any card`);
    }

    // Clear trick and prepare for next
    room.gameState.trickCards = {};
    room.gameState.leadSuit = null;
    room.gameState.lastTrickWinner = winningPlayerId;
    room.gameState.currentTurn = winningPlayerId; // Winner leads next trick

    // Check for game end
    if (this.checkGameEndConditions(room.gameState)) {
      room.gameState.gamePhase = "finished";
    } else {
      room.gameState.roundNumber++;
    }

    room.lastActivity = Date.now();
  }

  /**
   * Get which team a player belongs to
   */
  private getPlayerTeam(playerId: string, teams: GameState['teams']): "royals" | "rebels" | null {
    if (teams.royals.includes(playerId)) return "royals";
    if (teams.rebels.includes(playerId)) return "rebels";
    return null;
  }
}
