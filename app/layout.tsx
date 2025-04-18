import type React from "react";
import type { Metadata } from "next";
import { Inter, MedievalSharp } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { MusicPlayerProvider } from "@/hooks/use-music-player";
import Link from "next/link";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const medievalSharp = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-medieval",
});

export const metadata: Metadata = {
  title: "Turup's Gambit - Fantasy Card Game",
  description: "A fantasy-medieval themed Turup's Gambit card game",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${medievalSharp.variable} font-sans bg-background min-h-screen`}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <MusicPlayerProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
                    {children}
                  </main>
                  <footer className="py-6 text-center text-sm text-foreground/60 border-t border-primary/10 mt-auto">
                    <div className="container mx-auto px-4">
                      <p className="mb-4">
                        © {new Date().getFullYear()} Turup's Gambit Fantasy
                        Edition
                      </p>
                      <div className="flex justify-center gap-6">
                        <Link
                          href="/privacy-policy"
                          className="hover:text-primary transition-colors"
                        >
                          Privacy Policy
                        </Link>
                        <Link
                          href="/about"
                          className="hover:text-primary transition-colors"
                        >
                          About
                        </Link>
                        <Link
                          href="/game"
                          className="hover:text-primary transition-colors"
                        >
                          Play Game
                        </Link>
                      </div>
                    </div>
                  </footer>
                </div>
              </MusicPlayerProvider>
            </AuthProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

import "./globals.css";
