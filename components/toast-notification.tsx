"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/uiStore";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export function ToastNotification() {
  const { toastMessage, toastType, clearToast } = useUIStore();

  // Auto-clear on unmount
  useEffect(() => {
    return () => clearToast();
  }, [clearToast]);

  const getIcon = () => {
    switch (toastType) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (toastType) {
      case "success":
        return "bg-[hsl(var(--olive-green))]/20 border-[hsl(var(--olive-bright))]";
      case "error":
        return "bg-[hsl(var(--burgundy))]/20 border-[hsl(var(--burgundy))]";
      case "warning":
        return "bg-[hsl(var(--amber-primary))]/20 border-[hsl(var(--amber-bright))]";
      case "info":
        return "bg-[hsl(var(--warm-brown))]/40 border-[hsl(var(--warm-brown))]";
      default:
        return "bg-[hsl(var(--dark-panel))] border-[hsl(var(--warm-brown))]";
    }
  };

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div
            className={`${getBgColor()} border-[3px] rounded-xl px-6 py-4 shadow-[0_8px_16px_rgba(0,0,0,0.4)] backdrop-blur-md flex items-center gap-4 min-w-[300px] max-w-[500px]`}
          >
            {getIcon()}
            <p className="text-base font-crimson font-medium text-foreground flex-1">
              {toastMessage}
            </p>
            <button
              onClick={clearToast}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 pointer-events-auto min-w-[48px] min-h-[48px] flex items-center justify-center text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
