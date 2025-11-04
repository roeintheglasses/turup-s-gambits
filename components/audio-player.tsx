"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX, Play, Pause, Music } from "lucide-react";

interface AudioPlayerProps {
  autoPlay?: boolean;
}

export function AudioPlayer({ autoPlay = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio("/assets/music/the_noble_land.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    // Auto play if enabled
    if (autoPlay) {
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            // Auto-play was prevented
            console.log("Autoplay prevented:", error);
            setIsPlaying(false);
          });
      }
    }

    // Clean up
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [autoPlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col sm:flex-row items-center gap-2 p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-300 ${
        isMinimized ? "w-auto" : "w-auto sm:w-64"
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </Button>

      {!isMinimized && (
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-20 sm:w-32"
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={toggleMinimize}
      >
        <Music size={18} />
      </Button>
    </div>
  );
}
