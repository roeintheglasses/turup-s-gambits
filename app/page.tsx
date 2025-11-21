"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { motion } from "framer-motion";
import { FlyingCards } from "@/components/flying-cards";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="relative h-full flex flex-col items-center justify-center overflow-hidden pt-16 pb-32">
      <VisualEffects enableGrain enableCRT />
      <FlyingCards />

      {/* Full-page blur effect that excludes navbar and footer */}
      <div className="fixed inset-0 bg-background/30 backdrop-blur-[2px] -z-5"></div>

      <div className="z-10 text-center px-4 py-16 max-w-4xl relative">
        <motion.div
          className="flex flex-col items-center gap-4 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-4">
            <Image
              src="/assets/logo.png"
              alt="Turup's Gambit Logo"
              width={200}
              height={200}
              className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.5)]"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-medieval text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            Turup's Gambit
          </h1>
        </motion.div>
        <motion.p
          className="text-xl md:text-2xl mb-12 font-medieval text-foreground/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Enter the realm of strategy and cunning in this medieval fantasy card
          game
        </motion.p>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <Link href="/game" passHref>
            <Button className="medieval-button text-2xl py-8 px-12 bg-primary hover:bg-primary/90 text-primary-foreground group">
              Play Now
            </Button>
          </Link>
        </motion.div>
      </div>
      <div className="">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 relative">
            <div className="fantasy-card-home w-full h-full absolute animate-[float_3s_ease-in-out_infinite] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♥
                </span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card-home w-full h-full absolute animate-[float_4s_ease-in-out_infinite_0.5s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♦
                </span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card-home w-full h-full absolute animate-[float_3.5s_ease-in-out_infinite_1s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♠
                </span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 relative">
            <div className="fantasy-card-home w-full h-full absolute animate-[float_4.5s_ease-in-out_infinite_1.5s] bg-white dark:bg-slate-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl text-slate-900 dark:text-white">
                  ♣
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-60 dark:opacity-40"
          style={{
            backgroundImage: "url('/assets/fantasy-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>
    </div>
  );
}
