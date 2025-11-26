"use client";

import React from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, WifiLow } from "lucide-react";
import type { ConnectionQuality } from "@/hooks/use-connection-quality";

interface ConnectionIndicatorProps {
  quality: ConnectionQuality;
  latency: number | null;
  isVisible?: boolean;
}

const qualityConfig: Record<ConnectionQuality, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  excellent: {
    icon: <Wifi className="w-4 h-4" />,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
    label: "Excellent",
  },
  good: {
    icon: <Wifi className="w-4 h-4" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/20",
    label: "Good",
  },
  fair: {
    icon: <WifiLow className="w-4 h-4" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
    label: "Fair",
  },
  poor: {
    icon: <WifiLow className="w-4 h-4" />,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
    label: "Poor",
  },
  unknown: {
    icon: <WifiOff className="w-4 h-4" />,
    color: "text-gray-500",
    bgColor: "bg-gray-500/20",
    label: "Unknown",
  },
};

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  quality,
  latency,
  isVisible = true,
}) => {
  if (!isVisible) return null;

  const config = qualityConfig[quality];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor} border border-current/20`}
    >
      <span className={config.color}>{config.icon}</span>
      <span className={`text-xs font-medium ${config.color}`}>
        {latency !== null ? `${latency}ms` : "--"}
      </span>
    </motion.div>
  );
};

// Signal bars version for more compact display
export const ConnectionBars: React.FC<ConnectionIndicatorProps> = ({
  quality,
  latency,
  isVisible = true,
}) => {
  if (!isVisible) return null;

  const getBarsCount = (q: ConnectionQuality): number => {
    switch (q) {
      case "excellent": return 4;
      case "good": return 3;
      case "fair": return 2;
      case "poor": return 1;
      default: return 0;
    }
  };

  const config = qualityConfig[quality];
  const barsCount = getBarsCount(quality);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-end gap-0.5 h-4"
      title={`${config.label}${latency !== null ? ` (${latency}ms)` : ""}`}
    >
      {[1, 2, 3, 4].map((bar) => (
        <motion.div
          key={bar}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: bar * 0.05 }}
          className={`w-1 rounded-sm origin-bottom ${
            bar <= barsCount ? config.color.replace("text-", "bg-") : "bg-gray-600"
          }`}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </motion.div>
  );
};
