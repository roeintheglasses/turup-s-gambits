import React from "react";

export const GameBackground: React.FC = () => (
  <div className="absolute inset-0 -z-10">
    <div
      className="absolute inset-0 opacity-40 dark:opacity-30"
      style={{
        backgroundImage: "url('/assets/game-table-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
  </div>
); 