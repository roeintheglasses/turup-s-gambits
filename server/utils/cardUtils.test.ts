import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  compareCards,
  determineTrickWinner,
  validateCardPlay,
  getCardRank,
} from './cardUtils';
import { Card } from '../schema/GameState';

// Helper to create a card without Colyseus decorators interfering
function createCard(suit: string, value: string, id?: string): Card {
  return new Card(suit, value, id || `${suit}-${value}`);
}

describe('cardUtils', () => {
  describe('createDeck', () => {
    it('should create a deck of 52 cards', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should have 13 cards of each suit', () => {
      const deck = createDeck();
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

      for (const suit of suits) {
        const suitCards = deck.filter((card) => card.suit === suit);
        expect(suitCards).toHaveLength(13);
      }
    });

    it('should have all values for each suit', () => {
      const deck = createDeck();
      const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

      for (const suit of suits) {
        for (const value of values) {
          const card = deck.find((c) => c.suit === suit && c.value === value);
          expect(card).toBeDefined();
        }
      }
    });

    it('should assign unique IDs to each card', () => {
      const deck = createDeck();
      const ids = deck.map((card) => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(52);
    });
  });

  describe('shuffleDeck', () => {
    it('should return a deck of the same length', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);
      expect(shuffled).toHaveLength(52);
    });

    it('should not modify the original deck', () => {
      const deck = createDeck();
      const originalFirst = deck[0];
      shuffleDeck(deck);
      expect(deck[0]).toBe(originalFirst);
    });

    it('should contain all original cards', () => {
      const deck = createDeck();
      const originalIds = deck.map((c) => c.id).sort();
      const shuffled = shuffleDeck(deck);
      const shuffledIds = shuffled.map((c) => c.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('should produce different orderings (statistical test)', () => {
      const deck = createDeck();
      const shuffles = Array.from({ length: 10 }, () => shuffleDeck(deck));
      const firstCardValues = shuffles.map((s) => s[0].id);
      const uniqueFirstCards = new Set(firstCardValues);
      // With 10 shuffles, we should get at least 2 different first cards
      expect(uniqueFirstCards.size).toBeGreaterThan(1);
    });
  });

  describe('dealCards', () => {
    let deck: Card[];

    beforeEach(() => {
      deck = createDeck();
    });

    it('should deal correct number of cards to each player', () => {
      const hands = dealCards([...deck], 4, 5);
      expect(hands).toHaveLength(4);
      for (const hand of hands) {
        expect(hand).toHaveLength(5);
      }
    });

    it('should remove dealt cards from the deck', () => {
      const deckCopy = [...deck];
      dealCards(deckCopy, 4, 5);
      expect(deckCopy).toHaveLength(52 - 20); // 52 - (4 players * 5 cards)
    });

    it('should deal cards in round-robin fashion', () => {
      // First 4 cards should go to players 0,1,2,3
      const deckCopy = [...deck];
      const firstFour = deckCopy.slice(0, 4).map((c) => c.id);
      const hands = dealCards([...deck], 4, 1);

      expect(hands[0][0].id).toBe(firstFour[0]);
      expect(hands[1][0].id).toBe(firstFour[1]);
      expect(hands[2][0].id).toBe(firstFour[2]);
      expect(hands[3][0].id).toBe(firstFour[3]);
    });

    it('should handle dealing all 52 cards to 4 players', () => {
      const hands = dealCards([...deck], 4, 13);
      expect(hands).toHaveLength(4);
      for (const hand of hands) {
        expect(hand).toHaveLength(13);
      }
      // Total cards dealt should be 52
      const totalCards = hands.flat();
      expect(totalCards).toHaveLength(52);
    });

    it('should return empty hands when deck has insufficient cards', () => {
      const smallDeck = deck.slice(0, 5);
      const hands = dealCards(smallDeck, 4, 5);
      // First player gets 2 cards, second gets 2, third gets 1, fourth gets 0
      const totalDealt = hands.flat().length;
      expect(totalDealt).toBe(5);
    });
  });

  describe('compareCards', () => {
    describe('trump interactions', () => {
      it('should return positive when card1 is trump and card2 is not', () => {
        const trumpCard = createCard('hearts', 'A');
        const nonTrumpCard = createCard('spades', 'A');
        const result = compareCards(trumpCard, nonTrumpCard, 'hearts', 'spades');
        expect(result).toBeGreaterThan(0);
      });

      it('should return negative when card2 is trump and card1 is not', () => {
        const nonTrumpCard = createCard('spades', 'A');
        const trumpCard = createCard('hearts', '2');
        const result = compareCards(nonTrumpCard, trumpCard, 'hearts', 'spades');
        expect(result).toBeLessThan(0);
      });

      it('should compare values when both cards are trump', () => {
        const higherTrump = createCard('hearts', 'A');
        const lowerTrump = createCard('hearts', 'K');
        const result = compareCards(higherTrump, lowerTrump, 'hearts', 'spades');
        expect(result).toBeGreaterThan(0);
      });

      it('should compare values correctly for same trump suit', () => {
        const lowerTrump = createCard('hearts', '2');
        const higherTrump = createCard('hearts', '10');
        const result = compareCards(lowerTrump, higherTrump, 'hearts', 'spades');
        expect(result).toBeLessThan(0);
      });
    });

    describe('led suit interactions', () => {
      it('should return positive when card1 follows led suit and card2 does not', () => {
        const ledSuitCard = createCard('spades', 'K');
        const offSuitCard = createCard('diamonds', 'A');
        const result = compareCards(ledSuitCard, offSuitCard, 'hearts', 'spades');
        expect(result).toBeGreaterThan(0);
      });

      it('should return negative when card2 follows led suit and card1 does not', () => {
        const offSuitCard = createCard('diamonds', 'A');
        const ledSuitCard = createCard('spades', '2');
        const result = compareCards(offSuitCard, ledSuitCard, 'hearts', 'spades');
        expect(result).toBeLessThan(0);
      });

      it('should compare values when both cards are led suit', () => {
        const higherCard = createCard('spades', 'A');
        const lowerCard = createCard('spades', 'K');
        const result = compareCards(higherCard, lowerCard, 'hearts', 'spades');
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('same suit comparisons', () => {
      it('should compare by value when same non-trump, non-led suit', () => {
        const higherCard = createCard('clubs', 'Q');
        const lowerCard = createCard('clubs', 'J');
        const result = compareCards(higherCard, lowerCard, 'hearts', 'spades');
        expect(result).toBeGreaterThan(0);
      });

      it('should return 0 for equal cards (same suit and value)', () => {
        const card1 = createCard('clubs', 'Q');
        const card2 = createCard('clubs', 'Q');
        const result = compareCards(card1, card2, 'hearts', 'spades');
        expect(result).toBe(0);
      });
    });

    describe('different off-suits', () => {
      it('should return 0 when neither card is trump or led suit', () => {
        const card1 = createCard('clubs', 'A');
        const card2 = createCard('diamonds', '2');
        const result = compareCards(card1, card2, 'hearts', 'spades');
        expect(result).toBe(0);
      });
    });

    describe('value rankings', () => {
      it('should rank face cards correctly (J < Q < K < A)', () => {
        const jack = createCard('hearts', 'J');
        const queen = createCard('hearts', 'Q');
        const king = createCard('hearts', 'K');
        const ace = createCard('hearts', 'A');

        expect(compareCards(queen, jack, 'hearts', 'hearts')).toBeGreaterThan(0);
        expect(compareCards(king, queen, 'hearts', 'hearts')).toBeGreaterThan(0);
        expect(compareCards(ace, king, 'hearts', 'hearts')).toBeGreaterThan(0);
      });

      it('should rank 10 higher than 9', () => {
        const ten = createCard('hearts', '10');
        const nine = createCard('hearts', '9');
        expect(compareCards(ten, nine, 'hearts', 'hearts')).toBeGreaterThan(0);
      });
    });
  });

  describe('determineTrickWinner', () => {
    it('should return empty string for empty cards array', () => {
      const result = determineTrickWinner([], [], 'hearts', 'spades');
      expect(result).toBe('');
    });

    it('should return the only player when single card played', () => {
      const cards = [createCard('spades', 'A')];
      const playerIds = ['player1'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'spades');
      expect(result).toBe('player1');
    });

    it('should find winner with highest trump', () => {
      const cards = [
        createCard('spades', 'A'), // led suit
        createCard('hearts', '2'), // low trump
        createCard('hearts', 'K'), // high trump - WINNER
        createCard('spades', 'K'), // led suit
      ];
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'spades');
      expect(result).toBe('player3');
    });

    it('should find winner with highest led suit when no trump played', () => {
      const cards = [
        createCard('spades', '10'),
        createCard('spades', 'A'), // WINNER
        createCard('diamonds', 'K'),
        createCard('clubs', 'A'),
      ];
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'spades');
      expect(result).toBe('player2');
    });

    it('should let first card win when all off-suit and no trump', () => {
      const cards = [
        createCard('spades', '2'), // led suit, WINNER (first and only led suit)
        createCard('diamonds', 'A'),
        createCard('clubs', 'K'),
        createCard('diamonds', 'Q'),
      ];
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'spades');
      expect(result).toBe('player1');
    });

    it('should handle all trump cards correctly', () => {
      const cards = [
        createCard('hearts', '5'),
        createCard('hearts', 'J'),
        createCard('hearts', 'A'), // WINNER
        createCard('hearts', 'Q'),
      ];
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'hearts');
      expect(result).toBe('player3');
    });

    it('should handle late trump correctly', () => {
      const cards = [
        createCard('spades', 'A'), // led suit
        createCard('spades', 'K'), // led suit
        createCard('spades', 'Q'), // led suit
        createCard('hearts', '2'), // WINNER (trump, even lowest)
      ];
      const playerIds = ['player1', 'player2', 'player3', 'player4'];
      const result = determineTrickWinner(cards, playerIds, 'hearts', 'spades');
      expect(result).toBe('player4');
    });
  });

  describe('validateCardPlay', () => {
    describe('first card in trick', () => {
      it('should allow any card when no led suit', () => {
        const card = createCard('hearts', 'A');
        const hand = [
          createCard('hearts', 'A'),
          createCard('spades', 'K'),
          createCard('diamonds', 'Q'),
        ];
        expect(validateCardPlay(card, hand, '')).toBe(true);
      });
    });

    describe('must follow suit', () => {
      it('should allow card of led suit when player has that suit', () => {
        const card = createCard('spades', 'K');
        const hand = [
          createCard('hearts', 'A'),
          createCard('spades', 'K'),
          createCard('spades', 'Q'),
        ];
        expect(validateCardPlay(card, hand, 'spades')).toBe(true);
      });

      it('should reject card of different suit when player has led suit', () => {
        const card = createCard('hearts', 'A');
        const hand = [
          createCard('hearts', 'A'),
          createCard('spades', 'K'),
          createCard('spades', 'Q'),
        ];
        expect(validateCardPlay(card, hand, 'spades')).toBe(false);
      });

      it('should allow any card when player has no cards of led suit', () => {
        const card = createCard('hearts', 'A');
        const hand = [
          createCard('hearts', 'A'),
          createCard('hearts', 'K'),
          createCard('diamonds', 'Q'),
        ];
        expect(validateCardPlay(card, hand, 'spades')).toBe(true);
      });

      it('should allow trump when player has no led suit', () => {
        const card = createCard('clubs', '2');
        const hand = [
          createCard('clubs', '2'),
          createCard('diamonds', 'A'),
        ];
        expect(validateCardPlay(card, hand, 'spades')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle single card hand', () => {
        const card = createCard('hearts', 'A');
        const hand = [createCard('hearts', 'A')];
        expect(validateCardPlay(card, hand, 'spades')).toBe(true);
      });

      it('should handle empty hand gracefully', () => {
        const card = createCard('hearts', 'A');
        expect(validateCardPlay(card, [], 'spades')).toBe(true);
      });

      it('should correctly identify having only one card of led suit', () => {
        const card = createCard('spades', '2');
        const hand = [
          createCard('spades', '2'), // Only spade
          createCard('hearts', 'A'),
          createCard('hearts', 'K'),
          createCard('diamonds', 'Q'),
        ];
        expect(validateCardPlay(card, hand, 'spades')).toBe(true);
      });
    });
  });

  describe('getCardRank', () => {
    it('should return correct ranks for number cards', () => {
      expect(getCardRank('2')).toBe(2);
      expect(getCardRank('5')).toBe(5);
      expect(getCardRank('9')).toBe(9);
      expect(getCardRank('10')).toBe(10);
    });

    it('should return correct ranks for face cards', () => {
      expect(getCardRank('J')).toBe(11);
      expect(getCardRank('Q')).toBe(12);
      expect(getCardRank('K')).toBe(13);
      expect(getCardRank('A')).toBe(14);
    });

    it('should return 0 for invalid values', () => {
      expect(getCardRank('invalid')).toBe(0);
      expect(getCardRank('')).toBe(0);
    });

    it('should maintain correct ordering', () => {
      const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
      for (let i = 1; i < values.length; i++) {
        expect(getCardRank(values[i])).toBeGreaterThan(getCardRank(values[i - 1]));
      }
    });
  });
});
