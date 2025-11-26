import { useState, useEffect, useCallback, useRef } from "react";
import { colyseusClient } from "@/lib/colyseus/ColyseusClient";

export type ConnectionQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

interface UseConnectionQualityOptions {
  isConnected: boolean;
  pingInterval?: number; // ms between pings, default 5000
}

interface UseConnectionQualityReturn {
  latency: number | null;
  quality: ConnectionQuality;
  lastPingTime: number | null;
}

/**
 * Get connection quality based on latency
 */
function getQualityFromLatency(latency: number | null): ConnectionQuality {
  if (latency === null) return "unknown";
  if (latency < 50) return "excellent";
  if (latency < 100) return "good";
  if (latency < 200) return "fair";
  return "poor";
}

/**
 * Hook to track connection quality via ping measurements
 */
export function useConnectionQuality(options: UseConnectionQualityOptions): UseConnectionQualityReturn {
  const { isConnected, pingInterval = 5000 } = options;

  const [latency, setLatency] = useState<number | null>(null);
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const measureLatency = useCallback(async () => {
    if (!isConnected) return;

    try {
      const pingLatency = await colyseusClient.sendPing();
      setLatency(pingLatency);
      setLastPingTime(Date.now());
    } catch (error) {
      // Ping failed, connection might be poor
      console.warn("Ping failed:", error);
      setLatency(null);
    }
  }, [isConnected]);

  // Start/stop ping interval based on connection status
  useEffect(() => {
    if (isConnected) {
      // Initial ping
      measureLatency();

      // Set up interval
      pingIntervalRef.current = setInterval(measureLatency, pingInterval);
    } else {
      // Clear interval and reset state
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      setLatency(null);
      setLastPingTime(null);
    }

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [isConnected, measureLatency, pingInterval]);

  const quality = getQualityFromLatency(latency);

  return {
    latency,
    quality,
    lastPingTime,
  };
}
