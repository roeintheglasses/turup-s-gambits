import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// Card schema
export class Card extends Schema {
  @type("string") suit: string;
  @type("string") value: string;
  @type("string") id: string;

  constructor(suit: string, value: string, id: string) {
    super();
    this.suit = suit;
    this.value = value;
    this.id = id;
  }
}

// Player schema
export class Player extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") userId: string; // Supabase user ID
  @type("number") position: number; // 0-3
  @type("number") team: number; // 0 = Royals, 1 = Rebels
  @type("boolean") isHost: boolean = false;
  @type("boolean") isReady: boolean = false;
  @type("boolean") isConnected: boolean = true;
  @type([Card]) hand: ArraySchema<Card> = new ArraySchema<Card>();
  @type("boolean") hasVoted: boolean = false;
  @type("string") trumpVote: string = "";

  constructor(id: string, name: string, userId: string, position: number, team: number) {
    super();
    this.id = id;
    this.name = name;
    this.userId = userId;
    this.position = position;
    this.team = team;
  }
}

// Trick (cards played in current round)
export class Trick extends Schema {
  @type("number") trickNumber: number;
  @type([Card]) cards: ArraySchema<Card> = new ArraySchema<Card>();
  @type(["string"]) playedBy: ArraySchema<string> = new ArraySchema<string>(); // player IDs
  @type("string") winnerId: string = "";
  @type("number") winningTeam: number = -1;
  @type("string") ledSuit: string = "";

  constructor(trickNumber: number) {
    super();
    this.trickNumber = trickNumber;
  }
}

// Game State schema
export class GameState extends Schema {
  @type("string") roomId: string;
  @type("string") phase: string = "waiting"; // waiting, initial_deal, trump_selection, final_deal, playing, ended
  @type({ map: Player }) players: MapSchema<Player> = new MapSchema<Player>();
  @type("number") maxPlayers: number = 4;
  @type("string") hostId: string = "";
  @type("string") currentTurn: string = ""; // player ID whose turn it is

  // Trump
  @type("string") trumpSuit: string = "";
  @type({ map: "string" }) trumpVotes: MapSchema<string> = new MapSchema<string>(); // playerId -> suit

  // Current trick
  @type(Trick) currentTrick: Trick = new Trick(0);
  @type("number") tricksPlayed: number = 0;

  // Scores
  @type("number") royalsScore: number = 0; // Team 0
  @type("number") rebelsScore: number = 0; // Team 1
  @type("number") royalsTricks: number = 0;
  @type("number") rebelsTricks: number = 0;

  // Game settings
  @type("string") gameMode: string = "classic"; // classic or frenzy
  @type("boolean") isPublic: boolean = true;

  // Winner
  @type("string") winner: string = ""; // "royals" or "rebels"
  @type("boolean") isKot: boolean = false; // all 13 tricks won

  // Timestamps
  @type("number") createdAt: number = Date.now();
  @type("number") startedAt: number = 0;
  @type("number") turnStartedAt: number = 0;

  constructor(roomId: string) {
    super();
    this.roomId = roomId;
  }
}
