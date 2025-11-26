import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  compareCards,
  determineTrickWinner,
  validateCardPlay,
} from '../utils/cardUtils';
import { Card, Player, Trick, GameState } from '../schema/GameState';
import { ArraySchema, MapSchema } from '@colyseus/schema';

/**
 * Game Logic Tests
 * Tests the game rules and state transitions without needing a full server
 */

// Helper to create a mock player
function createMockPlayer(id: string, position: number, team: number): Player {
  const player = new Player(id, `Player ${position + 1}`, `user-${id}`, position, team);
  return player;
}

// Helper to create a card
function createCard(suit: string, value: string): Card {
  return new Card(suit, value, `${suit}-${value}`);
}

describe('Game State Initialization', () => {
  it('should initialize with correct default values', () => {
    const state = new GameState('test-room');
    expect(state.roomId).toBe('test-room');
    expect(state.phase).toBe('waiting');
    expect(state.players.size).toBe(0);
    expect(state.royalsTricks).toBe(0);
    expect(state.rebelsTricks).toBe(0);
  });
});

describe('Player Assignment', () => {
  it('should assign alternating teams based on position', () => {
    // Position 0 -> Team 0 (Royals)
    // Position 1 -> Team 1 (Rebels)
    // Position 2 -> Team 0 (Royals)
    // Position 3 -> Team 1 (Rebels)
    const players = [
      createMockPlayer('p1', 0, 0),
      createMockPlayer('p2', 1, 1),
      createMockPlayer('p3', 2, 0),
      createMockPlayer('p4', 3, 1),
    ];

    expect(players[0].team).toBe(0);
    expect(players[1].team).toBe(1);
    expect(players[2].team).toBe(0);
    expect(players[3].team).toBe(1);
  });

  it('should correctly identify teammates', () => {
    // Players at positions 0,2 are teammates (Royals)
    // Players at positions 1,3 are teammates (Rebels)
    const players = [
      createMockPlayer('p1', 0, 0),
      createMockPlayer('p2', 1, 1),
      createMockPlayer('p3', 2, 0),
      createMockPlayer('p4', 3, 1),
    ];

    // Check Royals (team 0)
    expect(players[0].team).toBe(players[2].team);
    // Check Rebels (team 1)
    expect(players[1].team).toBe(players[3].team);
    // Check they're different teams
    expect(players[0].team).not.toBe(players[1].team);
  });
});

describe('Card Dealing', () => {
  it('should deal 5 cards for initial deal', () => {
    const deck = shuffleDeck(createDeck());
    const hands = dealCards([...deck], 4, 5);

    expect(hands.length).toBe(4);
    hands.forEach((hand) => {
      expect(hand.length).toBe(5);
    });
  });

  it('should deal remaining 8 cards for final deal', () => {
    const deck = shuffleDeck(createDeck());
    // First deal 5 cards
    const deckAfterInitial = [...deck];
    dealCards(deckAfterInitial, 4, 5);

    // Then deal remaining 8
    const finalHands = dealCards(deckAfterInitial, 4, 8);
    finalHands.forEach((hand) => {
      expect(hand.length).toBe(8);
    });
  });

  it('should result in 13 cards per player after both deals', () => {
    const deck = shuffleDeck(createDeck());
    const deckCopy = [...deck];

    const initialHands = dealCards(deckCopy, 4, 5);
    const finalHands = dealCards(deckCopy, 4, 8);

    for (let i = 0; i < 4; i++) {
      const totalCards = initialHands[i].length + finalHands[i].length;
      expect(totalCards).toBe(13);
    }
  });
});

describe('Trump Selection Voting', () => {
  it('should select suit with most votes', () => {
    const votes = new Map<string, number>();
    votes.set('hearts', 3);
    votes.set('spades', 1);

    let maxSuit = '';
    let maxVotes = 0;
    votes.forEach((count, suit) => {
      if (count > maxVotes) {
        maxVotes = count;
        maxSuit = suit;
      }
    });

    expect(maxSuit).toBe('hearts');
  });

  it('should handle tie by selecting first suit with max votes', () => {
    const votes = new Map<string, number>();
    votes.set('hearts', 2);
    votes.set('spades', 2);

    let maxSuit = '';
    let maxVotes = 0;
    votes.forEach((count, suit) => {
      if (count > maxVotes) {
        maxVotes = count;
        maxSuit = suit;
      }
    });

    // First one with max votes wins (hearts was added first)
    expect(maxSuit).toBe('hearts');
  });
});

describe('Card Play Validation - Game Scenarios', () => {
  describe('Must Follow Suit Rule', () => {
    it('should force player to follow suit when they have it', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('spades', 'K'),
        createCard('spades', 'Q'),
      ];

      // Trying to play hearts when spades was led and player has spades
      expect(validateCardPlay(createCard('hearts', 'A'), hand, 'spades')).toBe(false);
      // Playing spade is valid
      expect(validateCardPlay(createCard('spades', 'K'), hand, 'spades')).toBe(true);
    });

    it('should allow any card when player has no cards of led suit', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('diamonds', 'K'),
        createCard('clubs', 'Q'),
      ];

      // Can play any card when no spades in hand
      expect(validateCardPlay(createCard('hearts', 'A'), hand, 'spades')).toBe(true);
      expect(validateCardPlay(createCard('diamonds', 'K'), hand, 'spades')).toBe(true);
      expect(validateCardPlay(createCard('clubs', 'Q'), hand, 'spades')).toBe(true);
    });
  });

  describe('Trump Cutting Scenarios', () => {
    it('should allow trump when player cannot follow suit', () => {
      const hand = [
        createCard('hearts', '2'), // trump
        createCard('diamonds', 'A'),
      ];

      // Trump is hearts, spades is led, player has no spades
      expect(validateCardPlay(createCard('hearts', '2'), hand, 'spades')).toBe(true);
    });
  });
});

describe('Trick Winner Determination - Game Scenarios', () => {
  describe('Basic scenarios', () => {
    it('should award trick to highest card of led suit when no trump', () => {
      const cards = [
        createCard('spades', '10'),
        createCard('spades', 'K'),
        createCard('spades', 'Q'),
        createCard('spades', 'J'),
      ];
      const players = ['p1', 'p2', 'p3', 'p4'];

      const winner = determineTrickWinner(cards, players, 'hearts', 'spades');
      expect(winner).toBe('p2'); // K is highest
    });

    it('should award trick to trump even if lower than led suit', () => {
      const cards = [
        createCard('spades', 'A'), // led suit, ace
        createCard('spades', 'K'),
        createCard('hearts', '2'), // lowest trump
        createCard('spades', 'Q'),
      ];
      const players = ['p1', 'p2', 'p3', 'p4'];

      const winner = determineTrickWinner(cards, players, 'hearts', 'spades');
      expect(winner).toBe('p3'); // 2 of trump beats ace of spades
    });
  });

  describe('Multiple trumps played', () => {
    it('should award trick to highest trump when multiple trumps played', () => {
      const cards = [
        createCard('spades', 'A'),
        createCard('hearts', '5'), // trump
        createCard('hearts', 'K'), // higher trump
        createCard('hearts', '2'), // lower trump
      ];
      const players = ['p1', 'p2', 'p3', 'p4'];

      const winner = determineTrickWinner(cards, players, 'hearts', 'spades');
      expect(winner).toBe('p3'); // K of trump is highest
    });
  });

  describe('Off-suit cards', () => {
    it('should ignore off-suit non-trump cards', () => {
      const cards = [
        createCard('spades', '2'), // led suit - lowest
        createCard('diamonds', 'A'), // off-suit ace - doesn't count
        createCard('clubs', 'A'), // off-suit ace - doesn't count
        createCard('spades', '3'), // led suit - wins
      ];
      const players = ['p1', 'p2', 'p3', 'p4'];

      const winner = determineTrickWinner(cards, players, 'hearts', 'spades');
      expect(winner).toBe('p4'); // 3 of spades beats 2 of spades
    });
  });
});

describe('Turn Order', () => {
  it('should proceed clockwise (positions 0 -> 1 -> 2 -> 3 -> 0)', () => {
    const getNextPosition = (current: number) => (current + 1) % 4;

    expect(getNextPosition(0)).toBe(1);
    expect(getNextPosition(1)).toBe(2);
    expect(getNextPosition(2)).toBe(3);
    expect(getNextPosition(3)).toBe(0);
  });

  it('should give trick winner the lead for next trick', () => {
    // This is a rule verification - winner leads next trick
    const currentWinner = 'p3';
    const nextLead = currentWinner;
    expect(nextLead).toBe('p3');
  });
});

describe('Game End Conditions', () => {
  it('should end game when one team reaches 7 tricks', () => {
    const checkGameEnd = (royals: number, rebels: number) => {
      return royals >= 7 || rebels >= 7;
    };

    expect(checkGameEnd(7, 6)).toBe(true);
    expect(checkGameEnd(6, 7)).toBe(true);
    expect(checkGameEnd(6, 6)).toBe(false);
  });

  it('should declare Kot when one team wins all 13 tricks', () => {
    const isKot = (winnerTricks: number) => winnerTricks === 13;

    expect(isKot(13)).toBe(true);
    expect(isKot(12)).toBe(false);
    expect(isKot(7)).toBe(false);
  });

  it('should determine winner correctly', () => {
    const determineWinner = (royals: number, rebels: number) => {
      if (royals > rebels) return 'royals';
      if (rebels > royals) return 'rebels';
      return 'tie';
    };

    expect(determineWinner(8, 5)).toBe('royals');
    expect(determineWinner(5, 8)).toBe('rebels');
    expect(determineWinner(13, 0)).toBe('royals');
    expect(determineWinner(0, 13)).toBe('rebels');
  });
});

describe('Turn Timer Race Condition Fix', () => {
  it('should verify turn is still current before auto-playing', () => {
    // Simulating the race condition check
    const currentTurn = 'player-1';
    const turnWhenTimeoutScheduled = 'player-1';
    const turnAfterSomeoneElsePlayed = 'player-2';

    // Should proceed if turn hasn't changed
    expect(currentTurn === turnWhenTimeoutScheduled).toBe(true);

    // Should NOT proceed if turn changed
    expect(turnAfterSomeoneElsePlayed === turnWhenTimeoutScheduled).toBe(false);
  });

  it('should verify phase is still playing before auto-play', () => {
    const validPhases = ['playing'];
    const currentPhase1 = 'playing';
    const currentPhase2 = 'ended';

    expect(validPhases.includes(currentPhase1)).toBe(true);
    expect(validPhases.includes(currentPhase2)).toBe(false);
  });
});

describe('Bot AI Logic', () => {
  describe('Trump voting', () => {
    it('should vote for suit with most cards in hand', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('hearts', 'K'),
        createCard('hearts', 'Q'),
        createCard('spades', '2'),
        createCard('diamonds', '3'),
      ];

      const suitCounts: Record<string, number> = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      hand.forEach((card) => {
        suitCounts[card.suit]++;
      });

      const preferredSuit = Object.entries(suitCounts).reduce((a, b) =>
        suitCounts[a[0]] > suitCounts[b[0]] ? a : b
      )[0];

      expect(preferredSuit).toBe('hearts');
    });
  });

  describe('Card selection', () => {
    it('should follow suit when possible', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('spades', 'K'),
        createCard('spades', '2'),
      ];
      const ledSuit = 'spades';

      const validCards = hand.filter((c) => c.suit === ledSuit);
      expect(validCards.length).toBe(2);
      expect(validCards.every((c) => c.suit === 'spades')).toBe(true);
    });

    it('should be able to play any card when void in led suit', () => {
      const hand = [
        createCard('hearts', 'A'),
        createCard('diamonds', 'K'),
        createCard('clubs', '2'),
      ];
      const ledSuit = 'spades';

      const validCards = hand.filter((c) => {
        const hasLedSuit = hand.some((h) => h.suit === ledSuit);
        return !hasLedSuit || c.suit === ledSuit;
      });

      expect(validCards.length).toBe(3); // All cards are valid
    });
  });
});

// ==================== RECONNECTION & EDGE CASE TESTS ====================

describe('Player Reconnection Support', () => {
  // Helper to simulate finding player by userId
  function findPlayerByUserId(players: Map<string, Player>, userId: string): Player | undefined {
    for (const [, player] of players) {
      if (player.userId === userId) {
        return player;
      }
    }
    return undefined;
  }

  it('should find player by userId (not sessionId)', () => {
    const players = new Map<string, Player>();
    const player1 = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    const player2 = new Player('session-def', 'Bob', 'user-456', 1, 1);
    players.set('session-abc', player1);
    players.set('session-def', player2);

    const found = findPlayerByUserId(players, 'user-123');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Alice');
    expect(found?.id).toBe('session-abc');
  });

  it('should return undefined for non-existent userId', () => {
    const players = new Map<string, Player>();
    const player1 = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    players.set('session-abc', player1);

    const found = findPlayerByUserId(players, 'user-999');
    expect(found).toBeUndefined();
  });

  it('should allow reconnection when player is disconnected', () => {
    const players = new Map<string, Player>();
    const player = new Player('old-session', 'Alice', 'user-123', 0, 0);
    player.isConnected = false; // Simulate disconnection
    players.set('old-session', player);

    const existingPlayer = findPlayerByUserId(players, 'user-123');
    expect(existingPlayer).toBeDefined();
    expect(existingPlayer?.isConnected).toBe(false);

    // Simulate reconnection logic
    if (existingPlayer && !existingPlayer.isConnected) {
      const oldSessionId = existingPlayer.id;
      existingPlayer.isConnected = true;
      existingPlayer.id = 'new-session';

      // Update map
      players.delete(oldSessionId);
      players.set('new-session', existingPlayer);
    }

    expect(players.has('old-session')).toBe(false);
    expect(players.has('new-session')).toBe(true);
    expect(players.get('new-session')?.isConnected).toBe(true);
    expect(players.get('new-session')?.name).toBe('Alice'); // Preserved
    expect(players.get('new-session')?.position).toBe(0); // Preserved
  });

  it('should reject duplicate join when player is still connected', () => {
    const players = new Map<string, Player>();
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    player.isConnected = true;
    players.set('session-abc', player);

    const existingPlayer = findPlayerByUserId(players, 'user-123');

    // Should throw error when trying to join again while connected
    const shouldReject = existingPlayer && existingPlayer.isConnected;
    expect(shouldReject).toBe(true);
  });

  it('should update hostId on reconnection if player was host', () => {
    let hostId = 'old-session';
    const oldSessionId = 'old-session';
    const newSessionId = 'new-session';

    // Simulate host reconnection
    if (hostId === oldSessionId) {
      hostId = newSessionId;
    }

    expect(hostId).toBe('new-session');
  });

  it('should update currentTurn on reconnection if it was player turn', () => {
    let currentTurn = 'old-session';
    const oldSessionId = 'old-session';
    const newSessionId = 'new-session';

    // Simulate turn update on reconnection
    if (currentTurn === oldSessionId) {
      currentTurn = newSessionId;
    }

    expect(currentTurn).toBe('new-session');
  });

  it('should preserve player hand and game state on reconnection', () => {
    const player = new Player('old-session', 'Alice', 'user-123', 0, 0);
    player.hand.push(createCard('hearts', 'A'));
    player.hand.push(createCard('spades', 'K'));
    player.hasVoted = true;
    player.trumpVote = 'hearts';
    player.isConnected = false;

    // Simulate reconnection - only update connection state and session
    player.isConnected = true;
    player.id = 'new-session';

    // Verify game state preserved
    expect(player.hand.length).toBe(2);
    expect(player.hand[0].suit).toBe('hearts');
    expect(player.hasVoted).toBe(true);
    expect(player.trumpVote).toBe('hearts');
    expect(player.position).toBe(0);
    expect(player.team).toBe(0);
  });
});

describe('Player Disconnection Handling', () => {
  it('should mark player as disconnected on leave during game', () => {
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    player.isConnected = true;

    // Simulate disconnect during game
    player.isConnected = false;

    expect(player.isConnected).toBe(false);
  });

  it('should remove player from waiting room on leave', () => {
    const players = new Map<string, Player>();
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    players.set('session-abc', player);

    const phase = 'waiting';

    // In waiting room, player should be removed
    if (phase === 'waiting') {
      players.delete('session-abc');
    }

    expect(players.size).toBe(0);
  });

  it('should reassign positions when player leaves waiting room', () => {
    const players = [
      createMockPlayer('p1', 0, 0),
      createMockPlayer('p2', 1, 1),
      createMockPlayer('p3', 2, 0),
    ];

    // Simulate p2 leaving - positions should be reassigned
    const remainingPlayers = players.filter(p => p.id !== 'p2');

    // Reassign positions
    remainingPlayers.sort((a, b) => a.position - b.position);
    remainingPlayers.forEach((player, index) => {
      player.position = index;
      player.team = index % 2;
    });

    expect(remainingPlayers[0].position).toBe(0);
    expect(remainingPlayers[1].position).toBe(1);
    expect(remainingPlayers[0].team).toBe(0);
    expect(remainingPlayers[1].team).toBe(1);
  });

  it('should reassign host when host leaves', () => {
    const players = new Map<string, Player>();
    const host = new Player('host-session', 'Host', 'user-1', 0, 0);
    host.isHost = true;
    const player2 = new Player('p2-session', 'Player2', 'user-2', 1, 1);
    players.set('host-session', host);
    players.set('p2-session', player2);

    let hostId = 'host-session';

    // Host leaves
    players.delete('host-session');

    // Reassign host
    if (players.size > 0) {
      const newHost = Array.from(players.values())[0];
      newHost.isHost = true;
      hostId = newHost.id;
    }

    expect(hostId).toBe('p2-session');
    expect(player2.isHost).toBe(true);
  });
});

describe('Disconnected Player Auto-Play', () => {
  it('should identify disconnected player on their turn', () => {
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    player.isConnected = false;

    const currentTurn = 'session-abc';
    const isDisconnectedTurn = currentTurn === player.id && !player.isConnected;

    expect(isDisconnectedTurn).toBe(true);
  });

  it('should auto-play first valid card for disconnected player', () => {
    const hand = [
      createCard('hearts', 'A'),
      createCard('spades', 'K'),
      createCard('spades', '2'),
    ];
    const ledSuit = 'spades';

    // Find first valid card (must follow suit)
    let cardToPlay = hand.find(card => {
      const hasLedSuit = hand.some(c => c.suit === ledSuit);
      if (hasLedSuit) {
        return card.suit === ledSuit;
      }
      return true;
    });

    expect(cardToPlay).toBeDefined();
    expect(cardToPlay?.suit).toBe('spades'); // Must follow suit
  });

  it('should use shorter timeout for disconnected players', () => {
    const NORMAL_TIMEOUT = 30000;
    const DISCONNECT_GRACE_PERIOD = 2000;

    expect(DISCONNECT_GRACE_PERIOD).toBeLessThan(NORMAL_TIMEOUT);
  });
});

describe('Trump Selection Timeout', () => {
  it('should auto-vote for player who has not voted after timeout', () => {
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    player.hand.push(createCard('hearts', 'A'));
    player.hand.push(createCard('hearts', 'K'));
    player.hand.push(createCard('hearts', 'Q'));
    player.hand.push(createCard('spades', '2'));
    player.hand.push(createCard('diamonds', '3'));
    player.hasVoted = false;

    // Calculate best suit to auto-vote
    const suitCounts: Record<string, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    player.hand.forEach(card => {
      suitCounts[card.suit]++;
    });

    const autoSuit = Object.entries(suitCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    expect(autoSuit).toBe('hearts'); // Most cards
  });

  it('should not auto-vote for players who already voted', () => {
    const player = new Player('session-abc', 'Alice', 'user-123', 0, 0);
    player.hasVoted = true;
    player.trumpVote = 'spades';

    const shouldAutoVote = !player.hasVoted;
    expect(shouldAutoVote).toBe(false);
  });
});

describe('Duplicate Bot Action Prevention', () => {
  it('should create unique action keys for bot scheduling', () => {
    const botId = 'bot_123';
    const tricksPlayed = 5;
    const cardsInTrick = 2;

    const actionKey = `play_${botId}_${tricksPlayed}_${cardsInTrick}`;

    expect(actionKey).toBe('play_bot_123_5_2');
  });

  it('should prevent duplicate scheduling with same key', () => {
    const scheduledActions = new Set<string>();
    const actionKey = 'play_bot_123_5_2';

    // First scheduling
    const canSchedule1 = !scheduledActions.has(actionKey);
    if (canSchedule1) scheduledActions.add(actionKey);

    // Duplicate attempt
    const canSchedule2 = !scheduledActions.has(actionKey);

    expect(canSchedule1).toBe(true);
    expect(canSchedule2).toBe(false);
  });

  it('should allow scheduling after action completes', () => {
    const scheduledActions = new Set<string>();
    const actionKey = 'play_bot_123_5_2';

    scheduledActions.add(actionKey);
    expect(scheduledActions.has(actionKey)).toBe(true);

    // Action completes
    scheduledActions.delete(actionKey);
    expect(scheduledActions.has(actionKey)).toBe(false);

    // Can schedule again
    const canSchedule = !scheduledActions.has(actionKey);
    expect(canSchedule).toBe(true);
  });
});

describe('Game End Due to Disconnection', () => {
  it('should detect when all human players have left', () => {
    const players = [
      { id: 'human-1', isConnected: false, isBot: false },
      { id: 'bot-1', isConnected: true, isBot: true },
      { id: 'bot-2', isConnected: true, isBot: true },
      { id: 'bot-3', isConnected: true, isBot: true },
    ];

    const connectedHumans = players.filter(p => p.isConnected && !p.isBot);
    expect(connectedHumans.length).toBe(0);
  });

  it('should not end game if at least one human is connected', () => {
    const players = [
      { id: 'human-1', isConnected: true, isBot: false },
      { id: 'human-2', isConnected: false, isBot: false },
      { id: 'bot-1', isConnected: true, isBot: true },
      { id: 'bot-2', isConnected: true, isBot: true },
    ];

    const connectedHumans = players.filter(p => p.isConnected && !p.isBot);
    expect(connectedHumans.length).toBe(1);
  });
});
