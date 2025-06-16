// Script to test the realtime multiplayer functionality
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in .env file");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test room ID
const roomId = "test-room-" + Math.random().toString(36).substring(2, 9);

// Test players
const players = [
  {
    id: "player1",
    name: "Player 1",
    isHost: true,
    isBot: false,
    isReady: true,
    hand: [],
    score: 0,
  },
  {
    id: "player2",
    name: "Player 2",
    isHost: false,
    isBot: false,
    isReady: true,
    hand: [],
    score: 0,
  },
  {
    id: "player3",
    name: "Player 3",
    isHost: false,
    isBot: false,
    isReady: true,
    hand: [],
    score: 0,
  },
  {
    id: "player4",
    name: "Player 4",
    isHost: false,
    isBot: false,
    isReady: true,
    hand: [],
    score: 0,
  },
];

// Initial game state
const initialGameState = {
  currentTurn: null,
  trumpSuit: null,
  currentBid: 0,
  currentBidder: null,
  trickCards: {},
  roundNumber: 0,
  gamePhase: "waiting",
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
};

// Create a test room
async function createTestRoom() {
  console.log(`Creating test room: ${roomId}`);

  try {
    const { data, error } = await supabase
      .from("game_rooms")
      .insert({
        id: roomId,
        host_id: players[0].id,
        game_state: initialGameState,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw error;
    }

    console.log("Test room created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating test room:", error);
    return null;
  }
}

// Add players to the room
async function addPlayersToRoom() {
  console.log("Adding players to the room...");

  try {
    // Get current game state
    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select("game_state")
      .eq("id", roomId)
      .single();

    if (roomError) {
      throw roomError;
    }

    const gameState = roomData.game_state;
    gameState.players = players;

    // Update game state with players
    const { error: updateError } = await supabase
      .from("game_rooms")
      .update({
        game_state: gameState,
        current_players: players.length,
        last_updated: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (updateError) {
      throw updateError;
    }

    console.log("Players added successfully");
    return true;
  } catch (error) {
    console.error("Error adding players:", error);
    return false;
  }
}

// Simulate trump voting
async function simulateTrumpVoting() {
  console.log("Simulating trump voting...");

  const suits = ["hearts", "diamonds", "clubs", "spades"];

  try {
    // Record votes for each player
    for (const player of players) {
      const suit = suits[Math.floor(Math.random() * suits.length)];

      const { error } = await supabase.from("trump_votes").insert({
        room_id: roomId,
        player_id: player.id,
        suit: suit,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`Error recording vote for ${player.name}:`, error);
      } else {
        console.log(`${player.name} voted for ${suit}`);
      }
    }

    // Get all votes
    const { data: votes, error: votesError } = await supabase
      .from("trump_votes")
      .select("player_id, suit")
      .eq("room_id", roomId);

    if (votesError) {
      throw votesError;
    }

    console.log("All votes recorded:", votes);

    // Count votes for each suit
    const voteCount = {};
    votes.forEach((vote) => {
      voteCount[vote.suit] = (voteCount[vote.suit] || 0) + 1;
    });

    // Find the winning suit
    let maxVotes = 0;
    let winningSuit = null;

    for (const [suit, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count;
        winningSuit = suit;
      }
    }

    console.log(`Winning suit: ${winningSuit} with ${maxVotes} votes`);

    // Update game state with winning suit
    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select("game_state")
      .eq("id", roomId)
      .single();

    if (roomError) {
      throw roomError;
    }

    const gameState = roomData.game_state;
    gameState.trumpSuit = winningSuit;
    gameState.gamePhase = "bidding";

    const { error: updateError } = await supabase
      .from("game_rooms")
      .update({
        game_state: gameState,
        last_updated: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (updateError) {
      throw updateError;
    }

    console.log("Game state updated with winning suit");
    return winningSuit;
  } catch (error) {
    console.error("Error simulating trump voting:", error);
    return null;
  }
}

// Simulate card play
async function simulateCardPlay() {
  console.log("Simulating card play...");

  // Create some sample cards
  const cards = [
    { id: "card1", suit: "hearts", rank: "A" },
    { id: "card2", suit: "diamonds", rank: "K" },
    { id: "card3", suit: "clubs", rank: "Q" },
    { id: "card4", suit: "spades", rank: "J" },
  ];

  try {
    // Record card plays for each player
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const card = cards[i];

      const { error } = await supabase.from("player_actions").insert({
        room_id: roomId,
        player_id: player.id,
        action_type: "play-card",
        action_data: {
          card,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`Error recording card play for ${player.name}:`, error);
      } else {
        console.log(`${player.name} played ${card.rank} of ${card.suit}`);
      }

      // Wait a bit between plays
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Get all card plays
    const { data: plays, error: playsError } = await supabase
      .from("player_actions")
      .select("player_id, action_data")
      .eq("room_id", roomId)
      .eq("action_type", "play-card");

    if (playsError) {
      throw playsError;
    }

    console.log("All card plays recorded:", plays);
    return plays;
  } catch (error) {
    console.error("Error simulating card play:", error);
    return null;
  }
}

// Run the test
async function runTest() {
  let exitCode = 0;
  try {
    // Create test room
    const room = await createTestRoom();
    if (!room) {
      console.error("Failed to create test room");
      exitCode = 1;
      return;
    }

    // Add players to room
    const added = await addPlayersToRoom();
    if (!added) {
      console.error("Failed to add players to test room");
      exitCode = 1;
      return;
    }

    // Simulate trump voting
    const winningSuit = await simulateTrumpVoting();

    // Simulate card play
    await simulateCardPlay();

    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
    exitCode = 1;
  } finally {
    // Clean up - delete the test room
    try {
      const { error } = await supabase
        .from("game_rooms")
        .delete()
        .eq("id", roomId);

      if (error) {
        console.error("Error deleting test room:", error);
      } else {
        console.log("Test room deleted successfully");
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }

    process.exit(exitCode);
  }
}

// Run the test
runTest();
