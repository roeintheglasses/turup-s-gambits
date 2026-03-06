import { Card } from "../schema/GameState";
import { VALUE_RANKINGS, CARD_SUITS } from "../../lib/constants";

// ==================== TYPES ====================

export type BotDifficulty = "easy" | "medium" | "hard";

export interface TrickContext {
  /** Cards played so far in the current trick */
  trickCards: Card[];
  /** Session IDs of players who played each card (parallel to trickCards) */
  trickPlayerIds: string[];
  /** The suit that was led, empty string if bot is leading */
  ledSuit: string;
  /** The trump suit for this game */
  trumpSuit: string;
  /** The bot's session ID */
  botId: string;
  /** The bot's team number (0 = Royals, 1 = Rebels) */
  botTeam: number;
  /** Map of sessionId -> team number for all players */
  playerTeams: Map<string, number>;
  /** How many tricks have been played so far (0-12) */
  tricksPlayed: number;
}

interface SuitInfo {
  remaining: number;
  highestRemaining: number; // VALUE_RANKINGS value, 0 if none left
  played: number;
}

// ==================== CARD TRACKING ====================

/**
 * Tracks all played cards and derives information about remaining cards,
 * void suits for players, and trump distribution.
 */
export class CardTracker {
  /** All cards that have been played, grouped by suit */
  private playedBySuit: Map<string, Set<string>> = new Map();

  /** Players known to be void in a suit (failed to follow suit) */
  private playerVoids: Map<string, Set<string>> = new Map();

  /** Total cards played */
  private totalPlayed: number = 0;

  constructor() {
    for (const suit of CARD_SUITS) {
      this.playedBySuit.set(suit, new Set());
    }
  }

  /**
   * Record a completed trick. Updates played cards and detects void suits.
   */
  recordTrick(
    cards: Card[],
    playerIds: string[],
    ledSuit: string
  ): void {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const playerId = playerIds[i];

      // Track the played card
      const suitSet = this.playedBySuit.get(card.suit);
      if (suitSet) {
        suitSet.add(card.value);
      }
      this.totalPlayed++;

      // If a player didn't follow the led suit, they're void in it
      if (i > 0 && card.suit !== ledSuit) {
        this.markVoid(playerId, ledSuit);
      }
    }
  }

  /**
   * Also record cards as they are played within a trick (for mid-trick decisions).
   * This is called for each card in the current (incomplete) trick.
   */
  recordCardInProgress(card: Card, playerId: string, ledSuit: string, isLead: boolean): void {
    // Void detection for non-lead plays
    if (!isLead && card.suit !== ledSuit) {
      this.markVoid(playerId, ledSuit);
    }
  }

  /**
   * Mark a player as void in a suit.
   */
  private markVoid(playerId: string, suit: string): void {
    if (!this.playerVoids.has(playerId)) {
      this.playerVoids.set(playerId, new Set());
    }
    this.playerVoids.get(playerId)!.add(suit);
  }

  /**
   * Check if a player is known to be void in a suit.
   */
  isPlayerVoid(playerId: string, suit: string): boolean {
    return this.playerVoids.get(playerId)?.has(suit) ?? false;
  }

  /**
   * Get info about a specific suit: how many remain, highest remaining, etc.
   */
  getSuitInfo(suit: string): SuitInfo {
    const played = this.playedBySuit.get(suit) ?? new Set();
    const allValues = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const remaining = allValues.filter(v => !played.has(v));

    let highestRemaining = 0;
    for (const v of remaining) {
      const rank = VALUE_RANKINGS[v] || 0;
      if (rank > highestRemaining) highestRemaining = rank;
    }

    return {
      remaining: remaining.length,
      highestRemaining,
      played: played.size,
    };
  }

  /**
   * Get how many cards of a suit have been played.
   */
  getPlayedCount(suit: string): number {
    return this.playedBySuit.get(suit)?.size ?? 0;
  }

  /**
   * Check if a specific card has been played.
   */
  isCardPlayed(suit: string, value: string): boolean {
    return this.playedBySuit.get(suit)?.has(value) ?? false;
  }

  /**
   * Count how many trumps have been played.
   */
  getTrumpsPlayed(trumpSuit: string): number {
    return this.getPlayedCount(trumpSuit);
  }

  /**
   * Get the number of trumps remaining in the game (not in any specific hand).
   */
  getTrumpsRemaining(trumpSuit: string): number {
    return 13 - this.getTrumpsPlayed(trumpSuit);
  }

  /**
   * Check if a given card is the highest remaining of its suit.
   */
  isHighestRemaining(card: Card): boolean {
    const info = this.getSuitInfo(card.suit);
    return (VALUE_RANKINGS[card.value] || 0) >= info.highestRemaining;
  }

  /**
   * Get set of opponent session IDs who are void in a suit.
   */
  getPlayersVoidInSuit(suit: string, excludeIds: string[]): string[] {
    const result: string[] = [];
    for (const [playerId, voids] of this.playerVoids) {
      if (!excludeIds.includes(playerId) && voids.has(suit)) {
        result.push(playerId);
      }
    }
    return result;
  }

  /**
   * Reset tracker for a new game.
   */
  reset(): void {
    for (const suit of CARD_SUITS) {
      this.playedBySuit.set(suit, new Set());
    }
    this.playerVoids.clear();
    this.totalPlayed = 0;
  }
}

// ==================== BOT STRATEGY ====================

/**
 * Selects the best card for a bot to play based on difficulty level.
 *
 * - "easy": picks a random valid card
 * - "medium": greedy strategy (old behavior — tries to win cheaply)
 * - "hard": full card counting, partner awareness, trump management
 */
export function chooseBotCard(
  hand: Card[],
  validCards: Card[],
  context: TrickContext,
  tracker: CardTracker,
  difficulty: BotDifficulty = "hard"
): Card {
  if (validCards.length === 1) return validCards[0];

  switch (difficulty) {
    case "easy":
      return chooseEasy(validCards);
    case "medium":
      return chooseMedium(validCards, context);
    case "hard":
      return chooseHard(hand, validCards, context, tracker);
  }
}

// ==================== EASY (random) ====================

function chooseEasy(validCards: Card[]): Card {
  return validCards[Math.floor(Math.random() * validCards.length)];
}

// ==================== MEDIUM (greedy, old behavior) ====================

function chooseMedium(validCards: Card[], ctx: TrickContext): Card {
  const { ledSuit, trumpSuit, trickCards } = ctx;

  if (!ledSuit) {
    // Leading: play highest card
    return getHighest(validCards, null, trumpSuit);
  }

  const followSuit = validCards.filter(c => c.suit === ledSuit);
  if (followSuit.length > 0) {
    const highestInTrick = getHighest(trickCards, ledSuit, trumpSuit);
    const winners = followSuit.filter(c => canBeat(c, highestInTrick, trumpSuit));
    if (winners.length > 0) return getLowest(winners);
    return getLowest(followSuit);
  }

  const trumpCards = validCards.filter(c => c.suit === trumpSuit);
  if (trumpCards.length > 0) return getLowest(trumpCards);
  return getLowest(validCards);
}

// ==================== HARD (full strategy) ====================

function chooseHard(
  hand: Card[],
  validCards: Card[],
  ctx: TrickContext,
  tracker: CardTracker
): Card {
  const { ledSuit, trumpSuit, trickCards, trickPlayerIds, botId, botTeam, playerTeams, tricksPlayed } = ctx;

  const isLeading = !ledSuit;
  const isLateGame = tricksPlayed >= 8;

  // Identify partner and opponents
  const partnerId = getPartnerId(botId, playerTeams, botTeam);
  const opponentIds = getOpponentIds(botId, playerTeams, botTeam);

  if (isLeading) {
    return chooseLeadCard(hand, validCards, trumpSuit, tracker, opponentIds, partnerId, isLateGame);
  }

  return chooseFollowCard(validCards, ctx, tracker, partnerId, opponentIds, isLateGame);
}

/**
 * Choose which card to lead with.
 */
function chooseLeadCard(
  hand: Card[],
  validCards: Card[],
  trumpSuit: string,
  tracker: CardTracker,
  opponentIds: string[],
  partnerId: string | null,
  isLateGame: boolean
): Card {
  // 1. If we have a guaranteed winner (highest remaining of a non-trump suit), lead it
  const guaranteedWinners = validCards.filter(
    c => c.suit !== trumpSuit && tracker.isHighestRemaining(c)
  );
  if (guaranteedWinners.length > 0) {
    // Prefer suits where opponents aren't void (so they can't trump it)
    const safe = guaranteedWinners.filter(c =>
      !opponentIds.some(opp => tracker.isPlayerVoid(opp, c.suit))
    );
    if (safe.length > 0) return safe[0];
    // Still lead a guaranteed winner even if an opponent might trump,
    // unless we have other options
    if (validCards.length > guaranteedWinners.length) {
      // We have other options, pick something else
    } else {
      return guaranteedWinners[0];
    }
  }

  // 2. If partner is void in a suit and we have that suit, lead it so they can trump
  if (partnerId) {
    for (const suit of CARD_SUITS) {
      if (suit === trumpSuit) continue;
      if (
        tracker.isPlayerVoid(partnerId, suit) &&
        validCards.some(c => c.suit === suit)
      ) {
        // Check partner likely has trumps (they're not void in trump)
        if (!tracker.isPlayerVoid(partnerId, trumpSuit)) {
          // Lead a low card of this suit for partner to trump
          const suitCards = validCards.filter(c => c.suit === suit);
          return getLowest(suitCards);
        }
      }
    }
  }

  // 3. Avoid leading suits where opponents are void (they'll trump)
  const nonTrumpCards = validCards.filter(c => c.suit !== trumpSuit);
  if (nonTrumpCards.length > 0) {
    const safeSuits = nonTrumpCards.filter(c =>
      !opponentIds.some(opp => tracker.isPlayerVoid(opp, c.suit))
    );
    if (safeSuits.length > 0) {
      // Among safe suits, lead our strongest suit
      return chooseBestLeadFromSafe(safeSuits, trumpSuit, tracker);
    }
  }

  // 4. Late game: if we have high trump and few trumps remain, lead trump to draw them out
  if (isLateGame) {
    const trumpCards = validCards.filter(c => c.suit === trumpSuit);
    if (trumpCards.length > 0) {
      const highTrump = getHighest(trumpCards, trumpSuit, trumpSuit);
      if (tracker.isHighestRemaining(highTrump)) {
        return highTrump;
      }
    }
  }

  // 5. Fallback: lead highest card of our longest non-trump suit
  if (nonTrumpCards.length > 0) {
    return chooseBestLeadFromSafe(nonTrumpCards, trumpSuit, tracker);
  }

  // Only have trumps — lead lowest trump early, highest late
  const trumpCards = validCards.filter(c => c.suit === trumpSuit);
  if (trumpCards.length > 0) {
    return isLateGame ? getHighest(trumpCards, trumpSuit, trumpSuit) : getLowest(trumpCards);
  }

  return validCards[0];
}

/**
 * Among "safe" lead candidates, pick the best one.
 * Prefers suits where we have length (more cards) and high cards.
 */
function chooseBestLeadFromSafe(
  safeCards: Card[],
  trumpSuit: string,
  tracker: CardTracker
): Card {
  // Group by suit
  const bySuit = new Map<string, Card[]>();
  for (const c of safeCards) {
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit)!.push(c);
  }

  // Score each suit: prefer longer suits with high cards
  let bestSuit: string | null = null;
  let bestScore = -1;

  for (const [suit, cards] of bySuit) {
    const hasHighest = cards.some(c => tracker.isHighestRemaining(c));
    const score = cards.length * 10 + (hasHighest ? 50 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }

  if (bestSuit) {
    const suitCards = bySuit.get(bestSuit)!;
    // If we have the highest remaining, lead it to guarantee the trick
    const highest = suitCards.find(c => tracker.isHighestRemaining(c));
    if (highest) return highest;
    // Otherwise lead highest to try to win
    return getHighest(suitCards, bestSuit, trumpSuit);
  }

  return safeCards[0];
}

/**
 * Choose which card to play when following (not leading).
 */
function chooseFollowCard(
  validCards: Card[],
  ctx: TrickContext,
  tracker: CardTracker,
  partnerId: string | null,
  opponentIds: string[],
  isLateGame: boolean
): Card {
  const { ledSuit, trumpSuit, trickCards, trickPlayerIds } = ctx;

  // Determine who is currently winning the trick
  const currentWinner = getCurrentWinner(trickCards, trickPlayerIds, trumpSuit, ledSuit, ctx.playerTeams, ctx.botTeam);

  const partnerIsWinning = currentWinner.isPartnerWinning;
  const followSuit = validCards.filter(c => c.suit === ledSuit);
  const isLastToPlay = trickCards.length === 3;

  // --- FOLLOWING SUIT ---
  if (followSuit.length > 0) {
    if (partnerIsWinning) {
      if (isLastToPlay) {
        // Partner winning and we're last: play lowest, save good cards
        return getLowest(followSuit);
      }
      // Partner winning but opponents still to play: play low, but if we have
      // the guaranteed highest remaining, consider playing it
      return getLowest(followSuit);
    }

    // Opponent is winning — try to win
    const winningCards = followSuit.filter(c => canBeat(c, currentWinner.winningCard, trumpSuit));
    if (winningCards.length > 0) {
      // Play lowest card that wins
      return getLowest(winningCards);
    }

    // Can't beat — dump lowest
    return getLowest(followSuit);
  }

  // --- CAN'T FOLLOW SUIT (void) ---
  const trumpCards = validCards.filter(c => c.suit === trumpSuit);
  const nonTrumpCards = validCards.filter(c => c.suit !== trumpSuit);

  // Check if the trick has already been trumped
  const trickHasTrump = trickCards.some(c => c.suit === trumpSuit);

  if (partnerIsWinning) {
    // Partner is winning — don't waste a trump
    if (isLastToPlay) {
      // Definitely don't trump, discard lowest non-trump
      return discardLowest(validCards, trumpSuit);
    }
    // Even if not last, prefer not to trump partner
    // Unless an opponent after us might trump too
    return discardLowest(validCards, trumpSuit);
  }

  // Opponent is winning — try to trump
  if (trumpCards.length > 0) {
    if (trickHasTrump) {
      // Someone already trumped; need to over-trump
      const highestTrumpInTrick = getHighest(
        trickCards.filter(c => c.suit === trumpSuit),
        trumpSuit,
        trumpSuit
      );
      const overTrumps = trumpCards.filter(c => canBeat(c, highestTrumpInTrick, trumpSuit));
      if (overTrumps.length > 0) {
        return chooseSmartTrump(overTrumps, trumpSuit, tracker, isLateGame);
      }
      // Can't over-trump, discard
      return discardLowest(validCards, trumpSuit);
    }

    // No trump played yet — play a trump to win
    return chooseSmartTrump(trumpCards, trumpSuit, tracker, isLateGame);
  }

  // No trumps, can't follow suit — discard lowest
  return discardLowest(validCards, trumpSuit);
}

/**
 * Choose which trump to play smartly. Don't waste high trumps early.
 */
function chooseSmartTrump(
  trumpOptions: Card[],
  trumpSuit: string,
  tracker: CardTracker,
  isLateGame: boolean
): Card {
  if (trumpOptions.length === 1) return trumpOptions[0];

  // If we have the highest remaining trump, play it confidently (guaranteed win)
  const highestTrumpOption = getHighest(trumpOptions, trumpSuit, trumpSuit);
  if (tracker.isHighestRemaining(highestTrumpOption)) {
    // Late game: use it now. Early game: still use lowest winning trump to save it
    if (isLateGame) return highestTrumpOption;
  }

  // Early game: conserve high trumps, play lowest trump that works
  return getLowest(trumpOptions);
}

// ==================== PARTNER / OPPONENT HELPERS ====================

function getPartnerId(
  botId: string,
  playerTeams: Map<string, number>,
  botTeam: number
): string | null {
  for (const [id, team] of playerTeams) {
    if (id !== botId && team === botTeam) {
      return id;
    }
  }
  return null;
}

function getOpponentIds(
  botId: string,
  playerTeams: Map<string, number>,
  botTeam: number
): string[] {
  const opponents: string[] = [];
  for (const [id, team] of playerTeams) {
    if (team !== botTeam) {
      opponents.push(id);
    }
  }
  return opponents;
}

/**
 * Determine who is currently winning the trick in progress.
 */
function getCurrentWinner(
  trickCards: Card[],
  trickPlayerIds: string[],
  trumpSuit: string,
  ledSuit: string,
  playerTeams: Map<string, number>,
  botTeam: number
): { winningCard: Card; winnerId: string; isPartnerWinning: boolean } {
  if (trickCards.length === 0) {
    // No cards played yet — shouldn't happen in follow context, but handle gracefully
    return {
      winningCard: new Card("", "", ""),
      winnerId: "",
      isPartnerWinning: false,
    };
  }

  let winIdx = 0;
  for (let i = 1; i < trickCards.length; i++) {
    if (beats(trickCards[i], trickCards[winIdx], trumpSuit, ledSuit)) {
      winIdx = i;
    }
  }

  const winnerId = trickPlayerIds[winIdx];
  const winnerTeam = playerTeams.get(winnerId);
  const isPartnerWinning = winnerTeam === botTeam;

  return {
    winningCard: trickCards[winIdx],
    winnerId,
    isPartnerWinning,
  };
}

// ==================== CARD COMPARISON HELPERS ====================

function beats(card: Card, other: Card, trumpSuit: string, ledSuit: string): boolean {
  if (card.suit === trumpSuit && other.suit !== trumpSuit) return true;
  if (other.suit === trumpSuit && card.suit !== trumpSuit) return false;
  if (card.suit === other.suit) {
    return (VALUE_RANKINGS[card.value] || 0) > (VALUE_RANKINGS[other.value] || 0);
  }
  // card is off-suit and non-trump — can't beat
  return false;
}

function canBeat(card: Card, other: Card, trumpSuit: string): boolean {
  if (card.suit === trumpSuit && other.suit !== trumpSuit) return true;
  if (other.suit === trumpSuit && card.suit !== trumpSuit) return false;
  if (card.suit === other.suit) {
    return (VALUE_RANKINGS[card.value] || 0) > (VALUE_RANKINGS[other.value] || 0);
  }
  return false;
}

function getHighest(cards: Card[], suit: string | null, trumpSuit: string): Card {
  const pool = suit ? cards.filter(c => c.suit === suit) : cards;
  if (pool.length === 0) return cards[0];

  return pool.reduce((best, card) => {
    const bestRank = VALUE_RANKINGS[best.value] || 0;
    const cardRank = VALUE_RANKINGS[card.value] || 0;
    if (card.suit === trumpSuit && best.suit !== trumpSuit) return card;
    if (best.suit === trumpSuit && card.suit !== trumpSuit) return best;
    return cardRank > bestRank ? card : best;
  });
}

function getLowest(cards: Card[]): Card {
  return cards.reduce((lowest, card) => {
    const lowestRank = VALUE_RANKINGS[lowest.value] || 15;
    const cardRank = VALUE_RANKINGS[card.value] || 15;
    return cardRank < lowestRank ? card : lowest;
  });
}

/**
 * Discard the lowest card, preferring non-trump cards.
 */
function discardLowest(cards: Card[], trumpSuit: string): Card {
  const nonTrump = cards.filter(c => c.suit !== trumpSuit);
  if (nonTrump.length > 0) return getLowest(nonTrump);
  return getLowest(cards);
}
