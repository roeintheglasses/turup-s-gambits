import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface Track {
  id: string;
  title: string;
  src: string;
}

// Default music tracks
const defaultTracks: Track[] = [
  {
    id: "1",
    title: "Medieval Ballad",
    src: "/assets/music/the_noble_land.mp3",
  },
  {
    id: "2",
    title: "Tavern Songs",
    src: "/assets/music/the_noble_land.mp3", // Replace with actual different tracks
  },
  {
    id: "3",
    title: "Court Melodies",
    src: "/assets/music/the_noble_land.mp3", // Replace with actual different tracks
  },
];

interface SettingsState {
  // Theme settings
  theme: "dark" | "light" | "system";

  // Music player settings
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTrackIndex: number;
  tracks: Track[];

  // Sound effects settings
  soundEffectsEnabled: boolean;
  soundEffectsVolume: number;

  // Game settings
  cardAnimationSpeed: "slow" | "normal" | "fast";
  showTutorialTips: boolean;
  enableNotifications: boolean;
  showCardTracker: boolean;

  // Actions
  setTheme: (theme: "dark" | "light" | "system") => void;

  // Music actions
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;

  // Sound effects actions
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setSoundEffectsVolume: (volume: number) => void;

  // Game settings actions
  setCardAnimationSpeed: (speed: "slow" | "normal" | "fast") => void;
  setShowTutorialTips: (show: boolean) => void;
  setEnableNotifications: (enable: boolean) => void;
  setShowCardTracker: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default state
      theme: "system",

      isPlaying: false,
      volume: 0.5,
      isMuted: false,
      currentTrackIndex: 0,
      tracks: defaultTracks,

      soundEffectsEnabled: true,
      soundEffectsVolume: 0.5,

      cardAnimationSpeed: "normal",
      showTutorialTips: true,
      enableNotifications: true,
      showCardTracker: true,

      // Actions
      setTheme: (theme) => set({ theme }),

      togglePlay: () => {
        const audio = getAudioElement();
        const isPlaying = get().isPlaying;

        if (isPlaying) {
          audio?.pause();
        } else {
          audio?.play();
        }

        set({ isPlaying: !isPlaying });
      },

      toggleMute: () => {
        const audio = getAudioElement();
        const isMuted = get().isMuted;
        const volume = get().volume;

        if (audio) {
          audio.volume = isMuted ? volume : 0;
        }

        set({ isMuted: !isMuted });
      },

      setVolume: (volume) => {
        const audio = getAudioElement();
        const isMuted = get().isMuted;

        if (audio) {
          audio.volume = isMuted ? 0 : volume;
        }

        set({ volume });
      },

      nextTrack: () => {
        const { currentTrackIndex, tracks, isPlaying } = get();
        const wasPlaying = isPlaying;

        // Pause current track
        const audio = getAudioElement();
        if (audio) {
          audio.pause();
        }

        // Calculate next track index
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        set({ currentTrackIndex: nextIndex, isPlaying: false });

        // Resume playing with new track after a short delay
        setTimeout(() => {
          if (wasPlaying) {
            const newAudio = getAudioElement();
            if (newAudio) {
              newAudio.play();
              set({ isPlaying: true });
            }
          }
        }, 50);
      },

      previousTrack: () => {
        const { currentTrackIndex, tracks, isPlaying } = get();
        const wasPlaying = isPlaying;

        // Pause current track
        const audio = getAudioElement();
        if (audio) {
          audio.pause();
        }

        // Calculate previous track index
        const prevIndex =
          (currentTrackIndex - 1 + tracks.length) % tracks.length;
        set({ currentTrackIndex: prevIndex, isPlaying: false });

        // Resume playing with new track after a short delay
        setTimeout(() => {
          if (wasPlaying) {
            const newAudio = getAudioElement();
            if (newAudio) {
              newAudio.play();
              set({ isPlaying: true });
            }
          }
        }, 50);
      },

      setSoundEffectsEnabled: (soundEffectsEnabled) =>
        set({ soundEffectsEnabled }),

      setSoundEffectsVolume: (soundEffectsVolume) =>
        set({ soundEffectsVolume }),

      setCardAnimationSpeed: (cardAnimationSpeed) =>
        set({ cardAnimationSpeed }),

      setShowTutorialTips: (showTutorialTips) => set({ showTutorialTips }),

      setEnableNotifications: (enableNotifications) =>
        set({ enableNotifications }),

      setShowCardTracker: (showCardTracker) => set({ showCardTracker }),
    }),
    {
      name: "user-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper to get or create audio element
let audioElementRef: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") {
    return null; // SSR check
  }

  if (!audioElementRef) {
    const { tracks, currentTrackIndex, volume, isMuted } =
      useSettingsStore.getState();
    const currentTrack = tracks[currentTrackIndex];

    audioElementRef = new Audio(currentTrack.src);
    audioElementRef.loop = true;
    audioElementRef.volume = isMuted ? 0 : volume;

    // Clean up on unmount
    window.addEventListener("beforeunload", () => {
      audioElementRef?.pause();
      audioElementRef = null;
    });
  }

  return audioElementRef;
}
