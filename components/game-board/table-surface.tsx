"use client";

import { ReactNode } from "react";

interface TableSurfaceProps {
  children: ReactNode;
}

/**
 * Table Surface - The game table background
 * Features:
 * - Realistic felt texture with subtle patterns
 * - Proper depth and shadows
 * - Responsive sizing
 */
export function TableSurface({ children }: TableSurfaceProps) {
  return (
    <div className="relative w-full h-full min-h-[500px] md:min-h-[600px]">
      {/* Outer border / table edge */}
      <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#2a1f15] via-[#3d2d1f] to-[#2a1f15] p-2 md:p-3">
        {/* Wood grain texture */}
        <div
          className="absolute inset-0 rounded-xl md:rounded-2xl opacity-30 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(139, 69, 19, 0.1) 2px,
              rgba(139, 69, 19, 0.1) 4px
            )`
          }}
        />

        {/* Inner felt surface */}
        <div className="relative w-full h-full rounded-lg md:rounded-xl bg-gradient-to-br from-[#1a4d2e] via-[#1e5533] to-[#164428] overflow-hidden shadow-inner">
          {/* Felt texture overlay */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Radial gradient for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05)_0%,_transparent_70%)] pointer-events-none" />

          {/* Vignette effect */}
          <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] md:shadow-[inset_0_0_150px_rgba(0,0,0,0.5)] rounded-lg md:rounded-xl pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 w-full h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
