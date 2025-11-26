"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, DoorOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaveGameDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Leave Game Confirmation Dialog
 * Warns players about the consequences of leaving mid-game
 */
export function LeaveGameDialog({
  isOpen,
  onConfirm,
  onCancel,
}: LeaveGameDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="bg-card border-2 border-destructive/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-destructive/10 px-6 py-4 border-b border-destructive/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Leave Game?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      The game is still in progress
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to leave? Here's what will happen:
                </p>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>Your teammates will play with one less player</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>A bot may take over your position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>You can rejoin within a few minutes if you change your mind</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={onCancel}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Stay in Game
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={onConfirm}
                >
                  <DoorOpen className="w-4 h-4" />
                  Leave Game
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
