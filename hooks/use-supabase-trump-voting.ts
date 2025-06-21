import { useState, useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Suit } from "@/app/types/game";
import { useGameStore } from "@/stores";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { supabase } from "@/lib/services/supabase";
import { SupabaseDatabase } from "@/lib/services/supabase-database";

// Define a type for trump votes
type TrumpVotes = Record<string, number>;

/**
 * Helper function to determine the winning suit based on vote counts
 * Handles ties by randomly selecting from the tied suits
 */
function determineWinningSuit(votes: TrumpVotes): Suit | null {
  // If no votes, return null
  if (Object.keys(votes).length === 0) return null;

  // Find the maximum vote count
  const maxVotes = Math.max(...Object.values(votes));

  // Find all suits that have the maximum number of votes
  const winningCandidates = Object.entries(votes)
    .filter(([_, count]) => count === maxVotes)
    .map(([suit]) => suit as Suit);

  // If there's a clear winner, return it
  if (winningCandidates.length === 1) {
    return winningCandidates[0];
  }

  // Handle tie by selecting randomly from the candidates
  const randomIndex = Math.floor(Math.random() * winningCandidates.length);
  console.log(
    `[Trump Voting] Tie between ${winningCandidates.join(
      ", "
    )}. Randomly selecting ${winningCandidates[randomIndex]}`
  );
  return winningCandidates[randomIndex];
}

export function useSupabaseTrumpVoting(roomId: string) {
  const [userVote, setUserVote] = useState<Suit | null>(null);
  const [trumpVotes, setTrumpVotes] = useState<TrumpVotes>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [votingComplete, setVotingComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voterIds, setVoterIds] = useState<Set<string>>(new Set());
  const [winningSuit, setWinningSuit] = useState<Suit | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { user } = useAuthStore();
  const { setTrumpSuit } = useGameStore();

  // Setup Supabase channel subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`room:${roomId}:trump`);
    channelRef.current = channel;

    // Listen for trump votes
    channel
      .on("broadcast", { event: "trump-vote" }, (payload: any) => {
        console.log("[Trump Voting] Received vote:", payload);

        // Update vote count
        setTrumpVotes((prev) => {
          const newVotes = { ...prev };
          const { suit, playerId } = payload.payload;

          // Skip if we've already counted this player's vote
          if (voterIds.has(playerId)) {
            return prev;
          }

          // Add to voter list
          setVoterIds((prevVoters) => new Set([...prevVoters, playerId]));

          if (
            suit &&
            (suit === "hearts" ||
              suit === "diamonds" ||
              suit === "clubs" ||
              suit === "spades")
          ) {
            newVotes[suit] = (newVotes[suit] || 0) + 1;
          }

          // Check if voting is complete (4 votes total)
          const totalVotes = Object.values(newVotes).reduce(
            (sum, count) => sum + count,
            0
          );

          if (totalVotes >= 4) {
            console.log(
              "[Trump Voting] All votes received, determining winner"
            );
            setVotingComplete(true);

            // Calculate winning suit but don't set it in the store during state update
            const calculatedWinningSuit = determineWinningSuit(newVotes);

            // Set winning suit in local state
            if (calculatedWinningSuit) {
              setWinningSuit(calculatedWinningSuit);
            }
          }

          return newVotes;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, voterIds]);

  // Separate effect to update the trump suit in the store after voting is complete
  useEffect(() => {
    if (votingComplete && winningSuit) {
      console.log(
        `[Trump Voting] Setting trump suit to ${winningSuit} in game store`
      );

      // Use setTimeout to ensure this happens after render is complete
      setTimeout(() => {
        setTrumpSuit(winningSuit);
      }, 0);
    }
  }, [votingComplete, winningSuit, setTrumpSuit]);

  // Function to cast a vote
  const handleVote = async (suit: string) => {
    if (!user || !roomId || userVote || votingComplete) {
      console.error("[Trump Voting] Cannot vote: Invalid state", {
        user,
        roomId,
        userVote,
        votingComplete,
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        suit,
        playerId: user.id,
        playerName: user.username,
        timestamp: new Date().toISOString(),
      };

      // Record vote in the database
      await SupabaseDatabase.recordTrumpVote(roomId, user.id, suit as Suit);

      // Broadcast the vote
      await supabase.channel(`room:${roomId}:trump`).send({
        type: "broadcast",
        event: "trump-vote",
        payload,
      });

      // Update local state
      setUserVote(suit as Suit);

      console.log(`[Trump Voting] Vote cast for ${suit}`);
    } catch (error) {
      console.error("[Trump Voting] Error casting vote:", error);
      toast.error("Failed to cast vote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Function to force bot votes (for testing/debugging)
  const handleForceBotVotes = async () => {
    if (!roomId || votingComplete) return;

    const botSuits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

    // Only add bot votes if we don't already have 4 votes
    const currentTotalVotes = Object.values(trumpVotes).reduce(
      (sum, count) => sum + count,
      0
    );
    const neededVotes = 4 - currentTotalVotes;

    if (neededVotes <= 0) {
      console.log(
        "[Trump Voting] No bot votes needed, already have enough votes"
      );
      return;
    }

    for (let i = 0; i < neededVotes; i++) {
      const randomSuit = botSuits[Math.floor(Math.random() * botSuits.length)];
      const botId = `bot-${i + 1}`;

      try {
        await supabase.channel(`room:${roomId}:trump`).send({
          type: "broadcast",
          event: "trump-vote",
          payload: {
            suit: randomSuit,
            playerId: botId,
            playerName: `Bot ${i + 1}`,
            timestamp: new Date().toISOString(),
          },
        });

        console.log(`[Trump Voting] Bot ${i + 1} voted for ${randomSuit}`);

        // Add a small delay between bot votes
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`[Trump Voting] Error with bot ${i + 1} vote:`, error);
      }
    }
  };

  // Reset voting state
  const resetVotingState = () => {
    setUserVote(null);
    setTrumpVotes({
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    });
    setVotingComplete(false);
    setVoterIds(new Set());
    setWinningSuit(null);
  };

  return {
    userVote,
    trumpVotes,
    votingComplete,
    loading,
    handleVote,
    handleForceBotVotes,
    resetVotingState,
  };
}
