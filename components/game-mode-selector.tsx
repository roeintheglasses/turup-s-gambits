"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Crown, Zap, Users, Trophy, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface GameModeSelectorProps {
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

const gameModes = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional Court Piece gameplay",
    icon: Crown,
    color: "amber",
    features: [
      { icon: Users, text: "4 Players" },
      { icon: Trophy, text: "First to 7 tricks" },
      { icon: Clock, text: "~15-20 min" },
    ],
    available: true,
  },
  {
    id: "frenzy",
    name: "Frenzy",
    description: "Fast-paced with special powers",
    icon: Zap,
    color: "purple",
    features: [
      { icon: Sparkles, text: "Special abilities" },
      { icon: Zap, text: "Power-ups" },
      { icon: Clock, text: "~10-15 min" },
    ],
    available: false,
    comingSoon: true,
  },
];

export function GameModeSelector({
  selectedMode,
  onSelectMode,
}: GameModeSelectorProps) {
  return (
    <RadioGroup
      value={selectedMode}
      onValueChange={onSelectMode}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {gameModes.map((mode, index) => {
        const isSelected = selectedMode === mode.id;
        const colorClasses = {
          amber: {
            border: isSelected
              ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              : "border-primary/20 hover:border-amber-500/50",
            bg: isSelected ? "bg-amber-500/10" : "bg-card/90",
            icon: "text-amber-500",
            iconBg: "bg-amber-500/20",
            badge: "bg-amber-500/20 text-amber-500",
          },
          purple: {
            border: isSelected
              ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
              : "border-primary/20 hover:border-purple-500/50",
            bg: isSelected ? "bg-purple-500/10" : "bg-card/90",
            icon: "text-purple-500",
            iconBg: "bg-purple-500/20",
            badge: "bg-purple-500/20 text-purple-500",
          },
        };
        const colors = colorClasses[mode.color as keyof typeof colorClasses];

        return (
          <motion.div
            key={mode.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <RadioGroupItem
              value={mode.id}
              id={mode.id}
              className="peer sr-only"
              disabled={!mode.available}
            />
            <Label
              htmlFor={mode.id}
              className={`
                relative flex flex-col rounded-xl border-2 p-5
                ${colors.border} ${colors.bg}
                ${mode.available ? "cursor-pointer" : "cursor-not-allowed opacity-70"}
                transition-all duration-300 backdrop-blur-sm
                ${mode.available ? "hover:-translate-y-1" : ""}
              `}
            >
              {/* Coming Soon Badge */}
              {mode.comingSoon && (
                <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-semibold shadow-lg">
                  Coming Soon
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}
                >
                  <mode.icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{mode.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {mode.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <feature.icon className={`w-4 h-4 ${colors.icon}`} />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Selection Indicator */}
              {isSelected && mode.available && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-3 right-3 w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center`}
                >
                  <svg
                    className={`w-4 h-4 ${colors.icon}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              )}
            </Label>
          </motion.div>
        );
      })}
    </RadioGroup>
  );
}
