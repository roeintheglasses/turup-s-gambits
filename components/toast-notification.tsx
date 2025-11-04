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
        return "bg-green-500/10 border-green-500/30";
      case "error":
        return "bg-red-500/10 border-red-500/30";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "info":
        return "bg-blue-500/10 border-blue-500/30";
      default:
        return "bg-card border-border";
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
            className={`${getBgColor()} border-2 rounded-lg px-4 py-3 shadow-xl backdrop-blur-md flex items-center gap-3 min-w-[300px] max-w-[500px]`}
          >
            {getIcon()}
            <p className="text-sm font-medium text-foreground flex-1">
              {toastMessage}
            </p>
            <button
              onClick={clearToast}
              className="text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
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
