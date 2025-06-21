import { GameRoom, Player, GameState, Card, Suit, Rank } from "../types/game";

export class GameManager {
  private rooms: Map<string, GameRoom>;
  private static instance: GameManager;

  private constructor() {
    this.rooms = new Map();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public getRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

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

  public findOrCreateRoom(): GameRoom {
    // Find a room with less than 4 players
    for (const room of this.rooms.values()) {
      if (room.players.length < 4 && room.gameState.gamePhase === "waiting") {
        return room;
      }
    }
    // If no suitable room found, create a new one
    return this.createNewRoom();
  }

  public addPlayerToRoom(
    roomId: string,
    playerName: string,
    playerId?: string,
    isBot?: boolean
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

    // Generate a deterministic ID based on the player name if not provided
    // This ensures the same player always gets the same ID
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
      isHost: isFirstPlayer, // First player is always the host
      isBot: isBot || false, // Set isBot property if provided
    };

    console.log(
      `Adding player ${playerName} to room ${
        room.id
      }, isHost: ${isFirstPlayer}, isBot: ${isBot || false}`
    );

    room.players.push(newPlayer);
    room.lastActivity = Date.now();
    return newPlayer;
  }

  public removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivity = Date.now();

    // If room is empty, remove it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else if (room.players.length > 0) {
      // Assign new host if needed
      const hasHost = room.players.some((p) => p.isHost);
      if (!hasHost) {
        room.players[0].isHost = true;
      }
    }
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public updateGameState(roomId: string, gameState: Partial<GameState>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState = { ...room.gameState, ...gameState };
    room.lastActivity = Date.now();
  }

  public cleanupStaleRooms(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(roomId);
      }
    }
  }

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

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Reset players' hands to start fresh each game
    for (const player of room.players) {
      player.hand = [];
    }

    // Clear any leftover voting or deck information
    room.gameState.trumpVotes = {};
    room.gameState.playersVoted = [];
    delete room.gameState.remainingDeck;

    // Generate and shuffle a new deck
    const deck = this.shuffleDeck(this.generateDeck());
    room.deck = deck; // store deck for reference during this game

    // Assign teams (partners sit opposite each other)
    room.gameState.teams = {
      royals: [room.players[0].id, room.players[2].id],
      rebels: [room.players[1].id, room.players[3].id],
    };

    // Set dealer (random player)
    const dealerIndex = Math.floor(Math.random() * 4);
    room.gameState.dealerIndex = dealerIndex;

    // Define trump caller (player to the left of dealer)
    const trumpCallerIndex = (dealerIndex + 1) % 4;
    room.gameState.trumpCaller = room.players[trumpCallerIndex].id;

    // Set phase to initial deal
    room.gameState.gamePhase = "initial_deal";

    // Deal 5 cards to each player initially
    let currentCardIndex = 0;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        // Deal cards in clockwise order starting from the player to the dealer's left
        const playerIndex = (dealerIndex + 1 + j) % 4;
        const player = room.players[playerIndex];
        player.hand.push(deck[currentCardIndex]);
        currentCardIndex++;
      }
    }

    // Set remaining deck for later dealing after trump selection
    room.gameState.remainingDeck = deck.slice(20); // First 20 cards already dealt

    // Set initial game state
    room.gameState.currentTurn = room.players[trumpCallerIndex].id; // Trump caller goes first
    room.gameState.currentBid = 0;
    room.gameState.currentBidder = null;
    room.gameState.trumpSuit = null;
    room.gameState.trickCards = {};
    room.gameState.roundNumber = 1;
    room.gameState.scores = {
      royals: 0,
      rebels: 0,
    };
    room.gameState.consecutiveTricks = {
      royals: 0,
      rebels: 0,
    };
    room.gameState.lastTrickWinner = null;
    room.gameState.leadSuit = null;

    room.lastActivity = Date.now();
  }

  // Method to handle trump voting
  public voteForTrump(roomId: string, playerId: string, suit: Suit): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only allow voting during initial_deal phase
    if (room.gameState.gamePhase !== "initial_deal") {
      console.log(
        `[GameManager] Can't vote for trump in phase ${room.gameState.gamePhase}`
      );
      return;
    }

    // Store the vote in the game state (local tracking)
    if (!room.gameState.trumpVotes) {
      room.gameState.trumpVotes = {};
    }

    // Record the player's vote
    room.gameState.trumpVotes[playerId] = suit;

    // Track that this player has voted
    if (!room.gameState.playersVoted) {
      room.gameState.playersVoted = [];
    }

    if (!room.gameState.playersVoted.includes(playerId)) {
      room.gameState.playersVoted.push(playerId);
    }

    // Check if all players have voted
    if (room.gameState.playersVoted.length >= room.players.length) {
      // Count votes for each suit
      const voteCount: Record<string, number> = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      for (const pid in room.gameState.trumpVotes) {
        const votedSuit = room.gameState.trumpVotes[pid];
        voteCount[votedSuit]++;
      }

      // Find the suit with the most votes
      let maxVotes = 0;
      let winningSuit: Suit | null = null;

      for (const suit in voteCount) {
        if (voteCount[suit] > maxVotes) {
          maxVotes = voteCount[suit];
          winningSuit = suit as Suit;
        }
      }

      // In case of a tie, the trump caller's vote wins
      if (maxVotes === 1 && room.players.length === 4) {
        // All players voted for different suits, use trump caller's choice
        winningSuit = room.gameState.trumpVotes[
          room.gameState.trumpCaller as string
        ] as Suit;
      }

      // Set the trump suit
      room.gameState.trumpSuit = winningSuit;

      // Proceed to deal remaining cards
      this.dealRemainingCards(roomId);
    }

    room.lastActivity = Date.now();
  }

  // Bot method to automatically vote for trump
  public botVoteForTrump(roomId: string, botId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only allow voting during initial_deal phase
    if (room.gameState.gamePhase !== "initial_deal") {
      return;
    }

    // Check if this bot has already voted
    if (room.gameState.playersVoted?.includes(botId)) {
      console.log(`[GameManager] Bot ${botId} already voted`);
      return;
    }

    // Choose a random suit
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];

    // Cast the vote
    this.voteForTrump(roomId, botId, randomSuit);
  }

  // Method to automatically perform bot actions when needed
  public triggerBotActions(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Get all bot players
    const bots = room.players.filter((p) => p.isBot);
    if (bots.length === 0) return;

    // Handle different game phases
    switch (room.gameState.gamePhase) {
      case "initial_deal":
        // Make bots vote for trump if they haven't yet
        for (const bot of bots) {
          if (!room.gameState.playersVoted?.includes(bot.id)) {
            setTimeout(() => {
              this.botVoteForTrump(roomId, bot.id);
            }, 1000 + Math.random() * 2000); // Random delay for natural feel
          }
        }
        break;

      // Handle other phases as needed
      // case "playing":
      //  ... handle bot playing cards
      // break;
    }
  }

  // Method to deal the remaining 8 cards after trump selection
  public dealRemainingCards(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Make sure we have a trump suit and remaining deck
    if (!room.gameState.trumpSuit || !room.gameState.remainingDeck) {
      return;
    }

    // Set phase to final deal
    room.gameState.gamePhase = "final_deal";

    // Deal the remaining 8 cards to each player
    let currentCardIndex = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 4; j++) {
        // Deal cards in clockwise order starting from the player to the dealer's left
        const playerIndex = (room.gameState.dealerIndex + 1 + j) % 4;
        const player = room.players[playerIndex];
        player.hand.push(room.gameState.remainingDeck[currentCardIndex]);
        currentCardIndex++;
      }
    }

    // Sort players' hands for convenience
    for (const player of room.players) {
      this.sortPlayerHand(player);
    }

    // Clear the remaining deck and stored deck reference
    delete room.gameState.remainingDeck;
    delete room.deck;

    // After dealing all cards, start the playing phase
    this.startPlayingPhase(roomId);

    room.lastActivity = Date.now();
  }

  // Method to start the playing phase after final deal
  public startPlayingPhase(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "final_deal") {
      throw new Error("Cannot start playing before final deal");
    }

    // The player to the dealer's left (the trump caller) leads the first trick
    // This is the same player who selected the trump suit
    const firstPlayerId = room.gameState.trumpCaller;

    // Update game state to playing phase
    room.gameState.gamePhase = "playing";
    room.gameState.currentTurn = firstPlayerId;
    room.gameState.leadSuit = null; // No lead suit yet
    room.lastActivity = Date.now();
  }

  // Method to handle playing a card
  public playCard(roomId: string, playerId: string, card: Card): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.gameState.gamePhase !== "playing") {
      throw new Error("Cannot play card when game is not in playing phase");
    }

    if (room.gameState.currentTurn !== playerId) {
      throw new Error("Not your turn");
    }

    // Find the player
    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }
    const player = room.players[playerIndex];

    // Check if the player has the card
    const cardIndex = player.hand.findIndex((c) => c.id === card.id);
    if (cardIndex === -1) {
      throw new Error("Player does not have this card");
    }

    // Check if the player is following suit
    if (room.gameState.leadSuit && card.suit !== room.gameState.leadSuit) {
      // Check if the player has any cards of the lead suit
      const hasSuit = player.hand.some(
        (c) => c.suit === room.gameState.leadSuit
      );
      if (hasSuit) {
        throw new Error("Must follow suit");
      }
    }

    // If this is the first card played in the trick, set the lead suit
    if (Object.keys(room.gameState.trickCards).length === 0) {
      room.gameState.leadSuit = card.suit;
    }

    // Remove the card from the player's hand
    player.hand = player.hand.filter((c) => c.id !== card.id);

    // Add the card to the trick
    room.gameState.trickCards[playerId] = card;

    // If all players have played a card, determine the winner of the trick
    if (Object.keys(room.gameState.trickCards).length === 4) {
      this.resolveTrick(roomId);
    } else {
      // Move to the next player (clockwise)
      const nextPlayerIndex = (playerIndex + 1) % 4;
      room.gameState.currentTurn = room.players[nextPlayerIndex].id;
    }

    room.lastActivity = Date.now();
  }

  // Method to resolve a trick and determine the winner
  private resolveTrick(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const { trickCards, leadSuit, trumpSuit, teams } = room.gameState;
    const trickEntries = Object.entries(trickCards);

    // Determine the winning card
    let winningEntry = trickEntries[0];
    let winningCard = winningEntry[1];

    for (let i = 1; i < trickEntries.length; i++) {
      const [playerId, card] = trickEntries[i];

      // Trump beats all non-trump cards
      if (
        trumpSuit &&
        card.suit === trumpSuit &&
        winningCard.suit !== trumpSuit
      ) {
        winningEntry = [playerId, card];
        winningCard = card;
        continue;
      }

      // If both cards are trump, higher trump wins
      if (
        trumpSuit &&
        card.suit === trumpSuit &&
        winningCard.suit === trumpSuit
      ) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
        continue;
      }

      // If no trumps involved, higher card of lead suit wins
      if (card.suit === leadSuit && winningCard.suit === leadSuit) {
        if (this.getCardValue(card) > this.getCardValue(winningCard)) {
          winningEntry = [playerId, card];
          winningCard = card;
        }
      }
    }

    const winningPlayerId = winningEntry[0];

    // Determine which team won the trick
    const winningTeam = teams.royals.includes(winningPlayerId)
      ? "royals"
      : "rebels";
    const losingTeam = winningTeam === "royals" ? "rebels" : "royals";

    // Update scores
    room.gameState.scores[winningTeam]++;

    // Update consecutive tricks
    if (
      room.gameState.lastTrickWinner &&
      ((teams.royals.includes(room.gameState.lastTrickWinner) &&
        winningTeam === "royals") ||
        (teams.rebels.includes(room.gameState.lastTrickWinner) &&
          winningTeam === "rebels"))
    ) {
      // Same team won consecutive tricks
      room.gameState.consecutiveTricks[winningTeam]++;
    } else {
      // Reset consecutive tricks for the winning team
      room.gameState.consecutiveTricks[winningTeam] = 1;
      // Reset consecutive tricks for the losing team
      room.gameState.consecutiveTricks[losingTeam] = 0;
    }

    // Check if a team has won 7 consecutive tricks (baazi)
    if (room.gameState.consecutiveTricks[winningTeam] >= 7) {
      // Game ends immediately if a team wins 7 consecutive tricks (baazi)
      room.gameState.gamePhase = "finished";
      return;
    }

    // Check if a team has won 7 tricks total
    if (room.gameState.scores[winningTeam] >= 7) {
      // Game ends if a team reaches 7 tricks
      room.gameState.gamePhase = "finished";
      return;
    }

    // Check if all 13 tricks have been played (kot/grand baazi)
    const totalTricks =
      room.gameState.scores.royals + room.gameState.scores.rebels;
    if (totalTricks >= 13) {
      room.gameState.gamePhase = "finished";
      return;
    }

    // Update last trick winner
    room.gameState.lastTrickWinner = winningPlayerId;

    // Clear the trick cards
    room.gameState.trickCards = {};
    room.gameState.leadSuit = null;

    // Winner of the trick leads the next one
    room.gameState.currentTurn = winningPlayerId;

    // Check if the game is over (all cards played)
    const allCardsPlayed = room.players.every((p) => p.hand.length === 0);
    if (allCardsPlayed) {
      room.gameState.gamePhase = "finished";
    }
  }

  // Helper method to get the numeric value of a card for comparison
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

  private sortPlayerHand(player: Player): void {
    // Sort by suit then by rank
    player.hand.sort((a, b) => {
      if (a.suit !== b.suit) {
        // Order by suit: hearts, diamonds, clubs, spades
        const suitOrder: Record<Suit, number> = {
          hearts: 0,
          diamonds: 1,
          clubs: 2,
          spades: 3,
        };
        return suitOrder[a.suit] - suitOrder[b.suit];
      } else {
        // If same suit, order by rank
        return this.getCardValue(b) - this.getCardValue(a);
      }
    });
  }
}
