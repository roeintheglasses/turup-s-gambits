"use client";

import { useCallback, useRef, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

type SoundType =
  | "cardPlay"
  | "cardDeal"
  | "trickWin"
  | "turnNotify"
  | "gameWin"
  | "gameLose"
  | "buttonClick"
  | "error";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  decay?: number;
  secondFrequency?: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig | SoundConfig[]> = {
  cardPlay: {
    frequency: 220,
    duration: 0.08,
    type: "sine",
    gain: 0.3,
    decay: 0.05,
  },
  cardDeal: {
    frequency: 440,
    duration: 0.05,
    type: "triangle",
    gain: 0.2,
    decay: 0.03,
  },
  trickWin: [
    { frequency: 523, duration: 0.15, type: "sine", gain: 0.3 },
    { frequency: 659, duration: 0.15, type: "sine", gain: 0.3 },
    { frequency: 784, duration: 0.2, type: "sine", gain: 0.35 },
  ],
  turnNotify: {
    frequency: 880,
    duration: 0.1,
    type: "sine",
    gain: 0.25,
    decay: 0.08,
  },
  gameWin: [
    { frequency: 523, duration: 0.15, type: "sine", gain: 0.35 },
    { frequency: 659, duration: 0.15, type: "sine", gain: 0.35 },
    { frequency: 784, duration: 0.15, type: "sine", gain: 0.35 },
    { frequency: 1047, duration: 0.3, type: "sine", gain: 0.4 },
  ],
  gameLose: [
    { frequency: 392, duration: 0.2, type: "sine", gain: 0.3 },
    { frequency: 349, duration: 0.2, type: "sine", gain: 0.3 },
    { frequency: 330, duration: 0.3, type: "sine", gain: 0.25 },
  ],
  buttonClick: {
    frequency: 600,
    duration: 0.04,
    type: "square",
    gain: 0.15,
    decay: 0.02,
  },
  error: {
    frequency: 200,
    duration: 0.15,
    type: "sawtooth",
    gain: 0.2,
    decay: 0.1,
  },
};

/**
 * Hook for playing synthesized game sound effects
 * Uses Web Audio API to generate sounds without requiring audio files
 */
export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const { soundEffectsEnabled, soundEffectsVolume } = useSettingsStore();

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
    };

    // Audio context needs user interaction to start
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, initAudioContext, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, initAudioContext);
      });
    };
  }, []);

  const playTone = useCallback(
    (config: SoundConfig, startTime: number = 0) => {
      if (!audioContextRef.current || !soundEffectsEnabled) return;

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      const effectiveVolume = config.gain * soundEffectsVolume;
      const now = ctx.currentTime + startTime;

      gainNode.gain.setValueAtTime(effectiveVolume, now);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        now + config.duration + (config.decay || 0)
      );

      oscillator.start(now);
      oscillator.stop(now + config.duration + (config.decay || 0) + 0.05);
    },
    [soundEffectsVolume, soundEffectsEnabled]
  );

  const playSound = useCallback(
    (type: SoundType) => {
      if (!soundEffectsEnabled || soundEffectsVolume === 0) return;

      // Ensure audio context is initialized
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }

      const config = SOUND_CONFIGS[type];

      if (Array.isArray(config)) {
        // Play sequence of tones
        let delay = 0;
        config.forEach((tone) => {
          playTone(tone, delay);
          delay += tone.duration;
        });
      } else {
        playTone(config);
      }
    },
    [playTone, soundEffectsEnabled, soundEffectsVolume]
  );

  return { playSound };
}

/**
 * Standalone function to play a sound without hook context
 * Useful for one-off sounds in callbacks
 */
let globalAudioContext: AudioContext | null = null;

export function playSoundEffect(type: SoundType, vol: number = 0.5) {
  if (typeof window === "undefined") return;

  // Check settings store for sound effects enabled
  const { soundEffectsEnabled, soundEffectsVolume } = useSettingsStore.getState();
  if (!soundEffectsEnabled) return;

  // Use settings volume if available, otherwise use passed volume
  const effectiveVol = soundEffectsVolume * vol;

  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  if (globalAudioContext.state === "suspended") {
    globalAudioContext.resume();
  }

  const config = SOUND_CONFIGS[type];
  const ctx = globalAudioContext;

  const playTone = (cfg: SoundConfig, startTime: number = 0) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = cfg.type;
    oscillator.frequency.setValueAtTime(cfg.frequency, ctx.currentTime);

    const effectiveVolume = cfg.gain * effectiveVol;
    const now = ctx.currentTime + startTime;

    gainNode.gain.setValueAtTime(effectiveVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      now + cfg.duration + (cfg.decay || 0)
    );

    oscillator.start(now);
    oscillator.stop(now + cfg.duration + (cfg.decay || 0) + 0.05);
  };

  if (Array.isArray(config)) {
    let delay = 0;
    config.forEach((tone) => {
      playTone(tone, delay);
      delay += tone.duration;
    });
  } else {
    playTone(config);
  }
}
