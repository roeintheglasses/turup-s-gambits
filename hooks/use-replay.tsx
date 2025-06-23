"use client"

import { useState, useEffect, useCallback } from "react"
import { useGameStore } from "@/stores"

export interface ReplayMove {
  id: string;
  type: "card_played" | "trick_won" | "trump_selected" | "bid_placed" | "frenzy_power" | "game_start" | "game_end" | "player_joined" | "player_left";
  player: string;
  timestamp: string;
  gamePhase: string;
  data: any;
  moveNumber: number;
  description?: string;
}

export interface ReplayData {
  gameId: string;
  moves: ReplayMove[];
  gameMetadata: {
    players: string[];
    gameMode: "classic" | "frenzy";
    trumpSuit: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    finalScores?: { royals: number; rebels: number };
    winner?: string;
    totalTricks?: number;
    longestStreak?: { team: string; tricks: number };
  };
  version: string;
}

export function useReplay() {
  const [replayData, setReplayData] = useState<ReplayMove[]>([])
  const [gameMetadata, setGameMetadata] = useState<ReplayData["gameMetadata"] | null>(null)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const { roomId, players, gameMode, trumpSuit, scores, gameStatus } = useGameStore()

  // Load replay data from localStorage on mount
  useEffect(() => {
    if (!roomId) return
    
    const savedReplay = localStorage.getItem(`turup-replay-${roomId}`)
    if (savedReplay) {
      try {
        const parsed: ReplayData = JSON.parse(savedReplay)
        setReplayData(parsed.moves)
        setGameMetadata(parsed.gameMetadata)
        setIsRecording(parsed.gameMetadata.endTime ? false : true)
      } catch (error) {
        console.error("Failed to parse replay data:", error)
      }
    }
  }, [roomId])

  // Initialize game metadata when game starts
  const initializeReplay = useCallback((gameStartData?: any) => {
    if (!roomId) return
    
    const metadata: ReplayData["gameMetadata"] = {
      players: players.map(p => p.name),
      gameMode: gameMode,
      trumpSuit: trumpSuit || "unknown",
      startTime: new Date().toISOString(),
      totalTricks: 0,
    }
    
    setGameMetadata(metadata)
    setReplayData([])
    setCurrentMoveIndex(0)
    setIsRecording(true)
    
    // Record game start as first move
    recordMove({
      type: "game_start",
      player: "system",
      data: gameStartData || { 
        players: metadata.players, 
        gameMode: metadata.gameMode,
        trumpSuit: metadata.trumpSuit 
      },
      description: `Game started with ${metadata.players.length} players in ${metadata.gameMode} mode`,
    })
  }, [roomId, players, gameMode, trumpSuit])

  // Save replay data to localStorage when it changes
  useEffect(() => {
    if (replayData.length > 0 && gameMetadata && roomId) {
      const fullReplayData: ReplayData = {
        gameId: roomId,
        moves: replayData,
        gameMetadata,
        version: "1.0.0",
      }
      
      localStorage.setItem(`turup-replay-${roomId}`, JSON.stringify(fullReplayData))
    }
  }, [replayData, gameMetadata, roomId])

  const recordMove = useCallback((move: Omit<ReplayMove, "id" | "timestamp" | "moveNumber" | "gamePhase">) => {
    if (!isRecording) return
    
    const currentGameStatus = gameStatus || "waiting"
    
    const newMove: ReplayMove = {
      ...move,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      moveNumber: replayData.length + 1,
      gamePhase: currentGameStatus,
    }
    
    setReplayData((prev) => [...prev, newMove])
    
    // Update metadata based on move type
    if (move.type === "trick_won" && gameMetadata) {
      setGameMetadata(prev => ({
        ...prev!,
        totalTricks: (prev!.totalTricks || 0) + 1,
      }))
    }
  }, [replayData.length, isRecording, gameStatus, gameMetadata])

  const finalizeReplay = useCallback((gameEndData?: any) => {
    if (!gameMetadata) return
    
    const endTime = new Date().toISOString()
    const startTime = new Date(gameMetadata.startTime)
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000)
    
    // Calculate additional statistics
    const royalsTricks = scores.royals
    const rebelsTricks = scores.rebels
    const longestStreak = calculateLongestStreak(replayData)
    
    const finalizedMetadata: ReplayData["gameMetadata"] = {
      ...gameMetadata,
      endTime,
      duration,
      finalScores: scores,
      winner: gameEndData?.winner || (royalsTricks >= 7 ? "Royals" : "Rebels"),
      totalTricks: royalsTricks + rebelsTricks,
      longestStreak,
    }
    
    setGameMetadata(finalizedMetadata)
    setIsRecording(false)
    
    // Record game end as final move
    recordMove({
      type: "game_end",
      player: "system",
      data: { 
        finalScores: scores, 
        winner: finalizedMetadata.winner,
        duration,
        totalMoves: replayData.length + 1,
      },
      description: `Game ended. Winner: ${finalizedMetadata.winner}. Duration: ${Math.floor(duration / 60)}:${duration % 60}`,
    })
  }, [gameMetadata, scores, replayData])

  const calculateLongestStreak = useCallback((moves: ReplayMove[]) => {
    let longestStreak = { team: "", tricks: 0 }
    let currentStreak = { team: "", tricks: 0 }
    
    moves.filter(m => m.type === "trick_won").forEach(move => {
      const team = move.data?.team || ""
      
      if (team === currentStreak.team) {
        currentStreak.tricks++
      } else {
        if (currentStreak.tricks > longestStreak.tricks) {
          longestStreak = { ...currentStreak }
        }
        currentStreak = { team, tricks: 1 }
      }
    })
    
    // Check final streak
    if (currentStreak.tricks > longestStreak.tricks) {
      longestStreak = { ...currentStreak }
    }
    
    return longestStreak
  }, [])

  const clearReplay = useCallback(() => {
    setReplayData([])
    setGameMetadata(null)
    setCurrentMoveIndex(0)
    setIsRecording(false)
    if (roomId) {
      localStorage.removeItem(`turup-replay-${roomId}`)
    }
  }, [roomId])

  const exportReplay = useCallback(() => {
    if (!gameMetadata || replayData.length === 0) return null
    
    const exportData: ReplayData = {
      gameId: roomId || "unknown",
      moves: replayData,
      gameMetadata,
      version: "1.0.0",
    }
    
    // Create downloadable file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `turup-replay-${roomId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return exportData
  }, [roomId, replayData, gameMetadata])

  const importReplay = useCallback((importedData: ReplayData) => {
    try {
      setReplayData(importedData.moves)
      setGameMetadata(importedData.gameMetadata)
      setCurrentMoveIndex(0)
      setIsRecording(false)
      
      if (roomId) {
        localStorage.setItem(`turup-replay-${roomId}`, JSON.stringify(importedData))
      }
      
      return true
    } catch (error) {
      console.error("Failed to import replay data:", error)
      return false
    }
  }, [roomId])

  const importReplayFromFile = useCallback((file: File) => {
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string)
          resolve(importReplay(importedData))
        } catch (error) {
          console.error("Failed to parse replay file:", error)
          resolve(false)
        }
      }
      reader.readAsText(file)
    })
  }, [importReplay])

  const getReplayData = useCallback(() => replayData, [replayData])
  
  const getFullReplayData = useCallback((): ReplayData | null => {
    if (!gameMetadata) return null
    
    return {
      gameId: roomId || "unknown",
      moves: replayData,
      gameMetadata,
      version: "1.0.0",
    }
  }, [roomId, replayData, gameMetadata])

  const getReplayStats = useCallback(() => {
    if (!gameMetadata) return null
    
    const moves = replayData
    const cardPlays = moves.filter(m => m.type === "card_played")
    const tricksWon = moves.filter(m => m.type === "trick_won")
    const frenzyPowers = moves.filter(m => m.type === "frenzy_power")
    
    return {
      totalMoves: moves.length,
      cardPlays: cardPlays.length,
      tricksWon: tricksWon.length,
      frenzyPowersUsed: frenzyPowers.length,
      gameDuration: gameMetadata.duration || 0,
      playersCount: gameMetadata.players.length,
    }
  }, [replayData, gameMetadata])

  const playbackControls = {
    currentMove: currentMoveIndex,
    totalMoves: replayData.length,
    setCurrentMove: setCurrentMoveIndex,
    nextMove: () => setCurrentMoveIndex(prev => Math.min(prev + 1, replayData.length - 1)),
    prevMove: () => setCurrentMoveIndex(prev => Math.max(prev - 1, 0)),
    reset: () => setCurrentMoveIndex(0),
    goToEnd: () => setCurrentMoveIndex(replayData.length - 1),
    jumpToMove: (moveIndex: number) => setCurrentMoveIndex(
      Math.max(0, Math.min(moveIndex, replayData.length - 1))
    ),
    isPlaying: false, // Could be extended for auto-play functionality
  }

  return {
    replayData,
    gameMetadata,
    isRecording,
    recordMove,
    clearReplay,
    getReplayData,
    getFullReplayData,
    getReplayStats,
    exportReplay,
    importReplay,
    importReplayFromFile,
    initializeReplay,
    finalizeReplay,
    playbackControls,
  }
}

