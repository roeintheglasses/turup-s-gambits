import { Room, Client } from "colyseus";
import { GameState, Player, Card, Trick } from "../schema/GameState";
import {
  createDeck,
  shuffleDeck,
  dealCards,
  validateCardPlay,
  determineTrickWinner,
} from "../utils/cardUtils";

interface JoinOptions {
  userId: string;
  name: string;
}

export class GameRoom extends Room<GameState> {
  maxClients = 4;
  private deck: Card[] = [];
  private botSessionIds: Set<string> = new Set();

  onCreate(options: any) {
    this.setState(new GameState(this.roomId));
    this.state.isPublic = options.isPublic !== false;
    this.state.gameMode = options.gameMode || "classic";

    console.log(`🎮 Room ${this.roomId} created`);

    // Register message handlers
    this.onMessage("start_game", (client) => this.handleStartGame(client));
    this.onMessage("add_bots", (client) => this.handleAddBots(client));
    this.onMessage("vote_trump", (client, data) => this.handleTrumpVote(client, data));
    this.onMessage("place_bid", (client, data) => this.handlePlaceBid(client, data));
    this.onMessage("play_card", (client, data) => this.handlePlayCard(client, data));
    this.onMessage("ready", (client) => this.handlePlayerReady(client));

    // Turn timer (30 seconds)
    this.clock.setInterval(() => {
      if (this.state.phase === "playing" && this.state.currentTurn) {
        const elapsed = Date.now() - this.state.turnStartedAt;
        if (elapsed > 30000) {
          // Auto-play first valid card if turn timeout
          this.handleTurnTimeout(this.state.currentTurn);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  onJoin(client: Client, options: JoinOptions) {
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

    console.log(`👤 ${player.name} joined as ${team === 0 ? 'Royals' : 'Rebels'}`);

    this.broadcast("player_joined", {
      playerId: client.sessionId,
      name: player.name,
      position,
      team,
    });
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      player.isConnected = false;

      // If game hasn't started, remove player
      if (this.state.phase === "waiting") {
        this.state.players.delete(client.sessionId);

        // Reassign host if needed
        if (client.sessionId === this.state.hostId && this.state.players.size > 0) {
          const newHost = Array.from(this.state.players.values())[0];
          newHost.isHost = true;
          this.state.hostId = newHost.id;
        }
      }

      this.broadcast("player_left", { playerId: client.sessionId });

      // If no players left, dispose room
      if (this.state.players.size === 0) {
        this.disconnect();
      }
    }
  }

  onDispose() {
    console.log(`🗑️  Room ${this.roomId} disposed`);
  }

  // ==================== GAME FLOW HANDLERS ====================

  private handleStartGame(client: Client) {
    const player = this.state.players.get(client.sessionId);

    if (!player?.isHost) {
      client.error(0, "Only host can start the game");
      return;
    }

    if (this.state.players.size < 4) {
      client.error(0, "Need 4 players to start");
      return;
    }

    if (this.state.phase !== "waiting") {
      client.error(0, "Game already started");
      return;
    }

    this.startInitialDeal();
  }

  private handleAddBots(client: Client) {
    const player = this.state.players.get(client.sessionId);

    if (!player?.isHost) {
      client.error(0, "Only host can add bots");
      return;
    }

    if (this.state.phase !== "waiting") {
      client.error(0, "Can only add bots before game starts");
      return;
    }

    const botsNeeded = 4 - this.state.players.size;
    if (botsNeeded <= 0) {
      client.error(0, "Room is already full");
      return;
    }

    console.log(`🤖 Adding ${botsNeeded} bots to room ${this.roomId}`);

    for (let i = 0; i < botsNeeded; i++) {
      const position = this.state.players.size;
      const team = position % 2;
      const botId = `bot_${Date.now()}_${position}`;

      const botPlayer = new Player(
        botId,
        `Bot ${position + 1}`,
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

      console.log(`🤖 ${botPlayer.name} joined as ${team === 0 ? 'Royals' : 'Rebels'}`);
    }
  }

  private startInitialDeal() {
    this.state.phase = "initial_deal";
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
      console.log(`🃏 Dealt ${hands[index].length} cards to ${player.name}, hand size: ${player.hand.length}`);
    });

    this.broadcast("initial_deal_complete", {
      phase: "initial_deal",
    });

    // Move to trump selection after 2 seconds
    this.clock.setTimeout(() => {
      this.state.phase = "trump_selection";
      this.broadcast("phase_changed", { phase: "trump_selection" });
      this.triggerBotActions(); // Bots vote for trump
    }, 2000);
  }

  private handleTrumpVote(client: Client, data: { suit: string }) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;
    if (this.state.phase !== "trump_selection") {
      client.error(0, "Not in trump selection phase");
      return;
    }

    if (player.hasVoted) {
      client.error(0, "Already voted");
      return;
    }

    const validSuits = ["hearts", "diamonds", "clubs", "spades"];
    if (!validSuits.includes(data.suit)) {
      client.error(0, "Invalid suit");
      return;
    }

    player.trumpVote = data.suit;
    player.hasVoted = true;
    this.state.trumpVotes.set(client.sessionId, data.suit);

    this.broadcast("trump_vote_received", {
      playerId: client.sessionId,
      votesRemaining: 4 - this.state.trumpVotes.size,
    });

    // Check if all players have voted
    if (this.state.trumpVotes.size === 4) {
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

    // Move to bidding phase
    this.clock.setTimeout(() => {
      this.startBiddingPhase();
    }, 2000);
  }

  private startBiddingPhase() {
    this.state.phase = "bidding";
    // Start with player 0 (or first player)
    const firstPlayer = Array.from(this.state.players.values())[0];
    this.state.currentTurn = firstPlayer.id;
    this.state.turnStartedAt = Date.now();

    // Log hand sizes at bidding start
    console.log("🎲 Starting bidding phase - hand sizes:");
    Array.from(this.state.players.values()).forEach((player) => {
      console.log(`   ${player.name}: ${player.hand.length} cards`);
    });

    this.broadcast("phase_changed", {
      phase: "bidding",
      currentTurn: this.state.currentTurn,
    });

    this.triggerBotActions(); // First player might be bot
  }

  private handlePlaceBid(client: Client, data: { bid: number }) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;
    if (this.state.phase !== "bidding") {
      client.error(0, "Not in bidding phase");
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      client.error(0, "Not your turn");
      return;
    }

    if (data.bid < 7 || data.bid > 13) {
      client.error(0, "Bid must be between 7 and 13");
      return;
    }

    player.bid = data.bid;

    if (data.bid > this.state.highestBid) {
      this.state.highestBid = data.bid;
      this.state.highestBidder = client.sessionId;
    }

    this.broadcast("bid_placed", {
      playerId: client.sessionId,
      bid: data.bid,
    });

    // Check if all players have bid
    const allBid = Array.from(this.state.players.values()).every(p => p.bid > 0);

    if (allBid) {
      this.startFinalDeal();
    } else {
      // Move to next player
      this.nextTurn();
    }
  }

  private startFinalDeal() {
    this.state.phase = "final_deal";

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

    // Start playing phase
    this.clock.setTimeout(() => {
      this.startPlayingPhase();
    }, 2000);
  }

  private startPlayingPhase() {
    this.state.phase = "playing";
    // Highest bidder leads first trick
    this.state.currentTurn = this.state.highestBidder;
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
    if (this.state.phase !== "playing") {
      client.error(0, "Not in playing phase");
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      client.error(0, "Not your turn");
      return;
    }

    // Find card in player's hand
    const cardIndex = player.hand.findIndex(c => c.id === data.cardId);
    if (cardIndex === -1) {
      client.error(0, "Card not in hand");
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
      client.error(0, "Must follow suit if possible");
      return;
    }

    // Remove card from hand
    player.hand.splice(cardIndex, 1);

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

    // Check for game end
    if (this.state.royalsTricks >= 7 || this.state.rebelsTricks >= 7 || this.state.tricksPlayed >= 13) {
      this.clock.setTimeout(() => this.endGame(), 3000);
    } else {
      // Start new trick, winner leads
      this.clock.setTimeout(() => {
        this.state.currentTrick = new Trick(this.state.tricksPlayed);
        this.state.currentTurn = winnerId;
        this.state.turnStartedAt = Date.now();

        this.broadcast("new_trick", {
          trickNumber: this.state.tricksPlayed,
          leadPlayer: winnerId,
        });

        this.triggerBotActions(); // Winner might be bot
      }, 3000);
    }
  }

  private endGame() {
    this.state.phase = "ended";

    // Determine winner
    if (this.state.royalsTricks > this.state.rebelsTricks) {
      this.state.winner = "royals";
      this.state.isKot = this.state.royalsTricks === 13;
    } else {
      this.state.winner = "rebels";
      this.state.isKot = this.state.rebelsTricks === 13;
    }

    this.broadcast("game_ended", {
      winner: this.state.winner,
      isKot: this.state.isKot,
      royalsTricks: this.state.royalsTricks,
      rebelsTricks: this.state.rebelsTricks,
    });

    // Room will be disposed after some time
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 30000);
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
    const player = this.state.players.get(playerId);
    if (!player || player.hand.length === 0) return;

    // Find first valid card
    let cardToPlay: Card | undefined;

    if (this.state.phase === "playing") {
      for (const card of player.hand) {
        if (validateCardPlay(card, player.hand.map(c => c), this.state.currentTrick.ledSuit)) {
          cardToPlay = card;
          break;
        }
      }

      if (cardToPlay) {
        this.handlePlayCard(
          { sessionId: playerId } as Client,
          { cardId: cardToPlay.id }
        );
      }
    }
  }

  // ==================== BOT AI LOGIC ====================

  private triggerBotActions() {
    // Check if current turn belongs to a bot
    if (this.state.currentTurn && this.botSessionIds.has(this.state.currentTurn)) {
      // Add delay for more realistic gameplay
      this.clock.setTimeout(() => {
        if (this.state.phase === "bidding") {
          this.botPlaceBid(this.state.currentTurn);
        } else if (this.state.phase === "playing") {
          this.botPlayCard(this.state.currentTurn);
        }
      }, 1000 + Math.random() * 1500); // 1-2.5 second delay
    }

    // Trump voting - all bots vote
    if (this.state.phase === "trump_selection") {
      this.botSessionIds.forEach((botId) => {
        const bot = this.state.players.get(botId);
        if (bot && !bot.hasVoted) {
          this.clock.setTimeout(() => {
            this.botVoteTrump(botId);
          }, 500 + Math.random() * 1500); // 0.5-2 second delay
        }
      });
    }
  }

  private botVoteTrump(botId: string) {
    const bot = this.state.players.get(botId);
    if (!bot || bot.hasVoted) return;

    // Count cards by suit in hand
    const suitCounts: { [suit: string]: number } = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    };

    bot.hand.forEach((card) => {
      suitCounts[card.suit]++;
    });

    // Vote for suit with most cards
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const preferredSuit = suits.reduce((a, b) =>
      suitCounts[a] > suitCounts[b] ? a : b
    );

    this.handleTrumpVote({ sessionId: botId } as Client, { suit: preferredSuit });
    console.log(`🤖 ${bot.name} voted for ${preferredSuit}`);
  }

  private botPlaceBid(botId: string) {
    const bot = this.state.players.get(botId);
    if (!bot) return;

    // Calculate hand strength
    let strength = 0;
    const valuePoints: { [value: string]: number } = {
      "A": 4,
      "K": 3,
      "Q": 2,
      "J": 1,
    };

    bot.hand.forEach((card) => {
      // Points for high cards
      if (valuePoints[card.value]) {
        strength += valuePoints[card.value];
      }
      // Extra points for trump cards
      if (card.suit === this.state.trumpSuit) {
        strength += 2;
      }
    });

    // Calculate bid based on strength
    // Strength ranges: 0-10 = bid 7, 11-20 = bid 8, 21-30 = bid 9, etc.
    let bid = Math.min(7 + Math.floor(strength / 10), 13);

    // Add some randomness (-1, 0, or +1)
    bid += Math.floor(Math.random() * 3) - 1;
    bid = Math.max(7, Math.min(bid, 13)); // Clamp between 7-13

    // Don't bid same as current highest (slightly competitive)
    if (bid === this.state.highestBid && bid < 13) {
      bid++;
    }

    this.handlePlaceBid({ sessionId: botId } as Client, { bid });
    console.log(`🤖 ${bot.name} bid ${bid} (strength: ${strength})`);
  }

  private botPlayCard(botId: string) {
    const bot = this.state.players.get(botId);
    if (!bot || bot.hand.length === 0) return;

    const ledSuit = this.state.currentTrick.ledSuit;
    const trumpSuit = this.state.trumpSuit;
    let cardToPlay: Card | undefined;

    // Strategy:
    // 1. If we have led suit, play highest or lowest strategically
    // 2. If we don't have led suit, play trump if we have it
    // 3. Otherwise, discard lowest card

    const validCards = bot.hand.filter((card) =>
      validateCardPlay(card, bot.hand.map(c => c), ledSuit)
    );

    if (validCards.length === 0) {
      cardToPlay = bot.hand[0]; // Should not happen with correct validation
      return;
    }

    if (ledSuit) {
      // Not leading the trick
      const followSuitCards = validCards.filter((c) => c.suit === ledSuit);

      if (followSuitCards.length > 0) {
        // We have cards of led suit
        const currentTrickCards = this.state.currentTrick.cards.map(c => c);
        const highestInTrick = this.getHighestCard(currentTrickCards, ledSuit, trumpSuit);

        // Try to win if we can
        const winningCards = followSuitCards.filter((c) =>
          this.canBeat(c, highestInTrick, trumpSuit)
        );

        if (winningCards.length > 0) {
          // Play lowest winning card
          cardToPlay = this.getLowestCard(winningCards);
        } else {
          // Can't win, play lowest card
          cardToPlay = this.getLowestCard(followSuitCards);
        }
      } else {
        // Don't have led suit, can play trump or discard
        const trumpCards = validCards.filter((c) => c.suit === trumpSuit);

        if (trumpCards.length > 0) {
          // Play lowest trump
          cardToPlay = this.getLowestCard(trumpCards);
        } else {
          // Discard lowest card
          cardToPlay = this.getLowestCard(validCards);
        }
      }
    } else {
      // Leading the trick - play highest card of our best suit
      cardToPlay = this.getHighestCard(validCards, null, trumpSuit);
    }

    if (cardToPlay) {
      this.handlePlayCard({ sessionId: botId } as Client, { cardId: cardToPlay.id });
      console.log(`🤖 ${bot.name} played ${cardToPlay.value} of ${cardToPlay.suit}`);
    }
  }

  private getHighestCard(cards: Card[], suit: string | null = null, trumpSuit: string): Card {
    const cardValues: { [value: string]: number } = {
      "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
      "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
    };

    const relevantCards = suit ? cards.filter((c) => c.suit === suit) : cards;
    if (relevantCards.length === 0) return cards[0];

    return relevantCards.reduce((highest, card) => {
      const highestValue = cardValues[highest.value] || 0;
      const cardValue = cardValues[card.value] || 0;

      // Trump beats all
      if (card.suit === trumpSuit && highest.suit !== trumpSuit) return card;
      if (highest.suit === trumpSuit && card.suit !== trumpSuit) return highest;

      return cardValue > highestValue ? card : highest;
    });
  }

  private getLowestCard(cards: Card[]): Card {
    const cardValues: { [value: string]: number } = {
      "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
      "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
    };

    return cards.reduce((lowest, card) => {
      const lowestValue = cardValues[lowest.value] || 15;
      const cardValue = cardValues[card.value] || 15;
      return cardValue < lowestValue ? card : lowest;
    });
  }

  private canBeat(card: Card, otherCard: Card, trumpSuit: string): boolean {
    const cardValues: { [value: string]: number } = {
      "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
      "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14,
    };

    // Trump beats non-trump
    if (card.suit === trumpSuit && otherCard.suit !== trumpSuit) return true;
    if (otherCard.suit === trumpSuit && card.suit !== trumpSuit) return false;

    // Same suit, compare values
    if (card.suit === otherCard.suit) {
      return (cardValues[card.value] || 0) > (cardValues[otherCard.value] || 0);
    }

    // Different suits, neither trump - can't beat
    return false;
  }
}
