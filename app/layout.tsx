import "./globals.css";

import type React from "react";
import type { Metadata } from "next";
import { Inter, MedievalSharp, Cinzel, Crimson_Text } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { ToastNotification } from "@/components/toast-notification";
import Link from "next/link";
import { ClerkProvider } from '@clerk/nextjs';
// Zustand stores are used for state management, no need for context providers

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const medievalSharp = MedievalSharp({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-medieval",
});
const cinzel = Cinzel({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-cinzel"
});
const crimsonText = Crimson_Text({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-crimson"
});

export const metadata: Metadata = {
  title: "Turup's Gambit - Fantasy Card Game",
  description: "Turup's Gambit card game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'hsl(30, 95%, 44%)', // amber-primary
          colorBackground: 'hsl(25, 26%, 8%)', // dark-bg
          colorText: 'hsl(35, 75%, 97%)', // cream-text
          colorInputBackground: 'hsl(30, 28%, 22%)', // warm-brown
          colorInputText: 'hsl(35, 75%, 97%)', // cream-text
          colorNeutral: 'hsl(30, 28%, 22%)', // warm-brown for borders
          colorDanger: 'hsl(0, 66%, 31%)', // burgundy
          colorSuccess: 'hsl(68, 47%, 34%)', // olive-green
          fontFamily: 'var(--font-crimson), serif',
          fontFamilyButtons: 'var(--font-cinzel), serif',
          fontSize: '0.9rem',
          borderRadius: '0.75rem',
        },
        elements: {
          // Modal background
          modalBackdrop: 'backdrop-blur-sm bg-black/50',

          // Card styling
          card: 'bg-card border-2 border-primary/30 shadow-2xl backdrop-blur-md',

          // Header styling
          headerTitle: 'font-cinzel text-primary text-2xl',
          headerSubtitle: 'text-muted-foreground',

          // Form elements
          formButtonPrimary:
            'bg-primary hover:bg-primary/90 text-primary-foreground font-cinzel font-bold shadow-lg ' +
            'border-2 border-primary/50 hover:border-primary transition-all duration-200 ' +
            'hover:shadow-primary/50 hover:scale-[1.02]',

          formFieldLabel: 'text-foreground font-medium',
          formFieldInput:
            'bg-input border-2 border-border text-foreground ' +
            'focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
            'rounded-lg transition-all duration-200',

          // Footer links
          footerActionLink: 'text-primary hover:text-accent underline font-medium',

          // Social buttons
          socialButtonsBlockButton:
            'border-2 border-border hover:border-primary bg-card hover:bg-muted ' +
            'text-foreground transition-all duration-200',

          // Divider
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground font-medieval',

          // Other elements
          identityPreviewText: 'text-foreground',
          identityPreviewEditButton: 'text-primary hover:text-accent',

          // Alert styling
          alert: 'bg-destructive/20 border-destructive/30 text-destructive',
          alertText: 'text-destructive',

          // Profile button
          userButtonPopoverCard: 'bg-card/95 backdrop-blur-md border-2 border-primary/20',
          userButtonPopoverActionButton: 'hover:bg-primary/10 text-foreground',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${medievalSharp.variable} ${cinzel.variable} ${crimsonText.variable} font-crimson bg-background min-h-screen`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastNotification />
            <div className="flex flex-col h-screen w-full">
              <Navbar />
              <main className="flex-1 w-full mx-auto overflow-auto">{children}</main>
              <footer className="text-center text-sm text-foreground/60 py-4 z-10 flex-shrink-0">
                <div className="container mx-auto px-4">
                  <p className="mb-2">© {2025} Turup's Gambit Fantasy Edition</p>
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
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
