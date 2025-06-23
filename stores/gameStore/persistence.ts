import { SupabaseDatabase } from "@/lib/services/supabase-database";

// Function to fetch room state from Supabase
export const fetchRoomStateFromSupabase = async (roomId: string) => {
  if (!roomId) return null;

  console.log(
    `[GameStore] Fetching current state for room ${roomId} from Supabase`
  );

  try {
    // Fetch room data from Supabase
    const roomData = await SupabaseDatabase.getGameRoomWithPlayers(roomId);
    
    if (!roomData) {
      console.log(`[GameStore] No room found with ID ${roomId}`);
      return null;
    }

    // Get stored game status from local storage if available as backup
    const storedState = localStorage.getItem("game-storage");
    let savedStatus = "waiting";
    let savedTrumpSuit = null;
    let savedScores = { royals: 0, rebels: 0 };
    let savedTeamAssignments = {};
    let savedPlayers = [];

    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        if (parsed.state) {
          savedStatus = parsed.state.gameStatus || "waiting";
          savedTrumpSuit = parsed.state.trumpSuit;
          savedScores = parsed.state.scores || { royals: 0, rebels: 0 };
          savedTeamAssignments = parsed.state.teamAssignments || {};
          savedPlayers = parsed.state.players || [];
        }
      } catch (e) {
        console.error("[GameStore] Error parsing stored state:", e);
      }
    }

    // Use room data from Supabase as primary source
    const gameState = roomData.gameState || {
      currentTurn: null,
      trumpSuit: savedTrumpSuit,
      currentBid: 0,
      currentBidder: null,
      trickCards: {},
      roundNumber: 0,
      gamePhase: roomData.status || savedStatus,
      teams: {
        royals: [],
        rebels: [],
      },
      scores: savedScores,
      consecutiveTricks: {
        royals: 0,
        rebels: 0,
      },
      lastTrickWinner: null,
      dealerIndex: 0,
      trumpCaller: null,
    };

    console.log(`[GameStore] Fetched room data from Supabase:`, roomData);
    console.log(`[GameStore] Recovered saved game status: ${gameState.gamePhase}`);
    console.log(
      `[GameStore] Recovered team assignments:`,
      savedTeamAssignments
    );
    console.log(`[GameStore] Room players:`, roomData.players || []);

    return {
      roomState: roomData, // The roomData is already a properly formatted GameRoom object
      gameStatus: gameState.gamePhase || roomData.status || "waiting",
      teamAssignments: savedTeamAssignments,
      players: roomData.players || [], // Return players from Supabase
    };
  } catch (error) {
    console.error("[GameStore] Error fetching room state:", error);
    return null;
  }
};
