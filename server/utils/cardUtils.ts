import { Card } from "../schema/GameState";

const suits = ["hearts", "diamonds", "clubs", "spades"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// Card value rankings (for comparison)
const valueRankings: { [key: string]: number } = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  let idCounter = 0;

  for (const suit of suits) {
    for (const value of values) {
      deck.push(new Card(suit, value, `${suit}-${value}-${idCounter++}`));
    }
  }

  return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards to players
 * @param deck - The deck to deal from
 * @param numPlayers - Number of players
 * @param cardsPerPlayer - Number of cards to deal to each player
 * @returns Array of hands, one for each player
 */
export function dealCards(deck: Card[], numPlayers: number, cardsPerPlayer: number): Card[][] {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let player = 0; player < numPlayers; player++) {
      const card = deck.shift();
      if (card) {
        hands[player].push(card);
      }
    }
  }

  return hands;
}

/**
 * Compare two cards to determine which is stronger
 * @param card1 - First card
 * @param card2 - Second card
 * @param trumpSuit - The trump suit
 * @param ledSuit - The suit that was led in this trick
 * @returns 1 if card1 wins, -1 if card2 wins, 0 if equal
 */
export function compareCards(
  card1: Card,
  card2: Card,
  trumpSuit: string,
  ledSuit: string
): number {
  // Trump beats everything
  if (card1.suit === trumpSuit && card2.suit !== trumpSuit) return 1;
  if (card2.suit === trumpSuit && card1.suit !== trumpSuit) return -1;

  // Both trump - compare values
  if (card1.suit === trumpSuit && card2.suit === trumpSuit) {
    return valueRankings[card1.value] - valueRankings[card2.value];
  }

  // Led suit beats non-led suit (if neither is trump)
  if (card1.suit === ledSuit && card2.suit !== ledSuit) return 1;
  if (card2.suit === ledSuit && card1.suit !== ledSuit) return -1;

  // Same suit - compare values
  if (card1.suit === card2.suit) {
    return valueRankings[card1.value] - valueRankings[card2.value];
  }

  // Different suits, neither trump nor led suit - first card wins
  return 0;
}

/**
 * Determine the winner of a trick
 * @param cards - Cards played in the trick
 * @param playerIds - IDs of players who played each card
 * @param trumpSuit - The trump suit
 * @param ledSuit - The suit that was led
 * @returns The ID of the winning player
 */
export function determineTrickWinner(
  cards: Card[],
  playerIds: string[],
  trumpSuit: string,
  ledSuit: string
): string {
  if (cards.length === 0) return "";

  let winningIndex = 0;
  let winningCard = cards[0];

  for (let i = 1; i < cards.length; i++) {
    const comparison = compareCards(cards[i], winningCard, trumpSuit, ledSuit);
    if (comparison > 0) {
      winningCard = cards[i];
      winningIndex = i;
    }
  }

  return playerIds[winningIndex];
}

/**
 * Validate if a card can be played
 * @param card - The card to play
 * @param playerHand - The player's hand
 * @param ledSuit - The suit that was led (empty if first card)
 * @returns true if valid, false otherwise
 */
export function validateCardPlay(card: Card, playerHand: Card[], ledSuit: string): boolean {
  // First card in trick - always valid
  if (!ledSuit) return true;

  // Check if player has cards of the led suit
  const hasLedSuit = playerHand.some(c => c.suit === ledSuit);

  // If player has led suit, they must play it
  if (hasLedSuit) {
    return card.suit === ledSuit;
  }

  // If player doesn't have led suit, can play any card
  return true;
}

/**
 * Get card rank for value comparison
 */
export function getCardRank(value: string): number {
  return valueRankings[value] || 0;
}
