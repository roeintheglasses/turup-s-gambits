import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen pt-20 pb-16">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "url('/assets/medieval-library.jpg')",
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

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-medieval text-primary mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-foreground/80">
              The Royal Decree on Usage and Conduct
            </p>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Acceptance of Terms
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                By accessing or using Turup's Gambit, you agree to be bound by these
                Terms of Service and all applicable laws and regulations. If you do
                not agree with any of these terms, you are prohibited from using or
                accessing this game.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              User Conduct
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                As a player in our realm, you agree to conduct yourself with honor
                and respect. The following behaviors are strictly prohibited:
              </p>
              <ul>
                <li>Harassment, hate speech, or abusive language in chat</li>
                <li>Cheating, exploiting bugs, or using unauthorized third-party software</li>
                <li>Impersonating other players or staff members</li>
                <li>Spamming or advertising unrelated products</li>
                <li>Attempting to disrupt the game servers or services</li>
              </ul>
              <p>
                Violation of these rules may result in temporary suspension or
                permanent banishment from the kingdom.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Intellectual Property
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                The game, including all visual assets, code, music, and text, is
                the property of Turup's Gambit and is protected by copyright and
                other intellectual property laws.
              </p>
              <p>
                You are granted a limited, non-exclusive, non-transferable license
                to access and use the game for personal, non-commercial entertainment
                purposes only.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Virtual Items and Currency
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                The game may include virtual items or currency. These items have no
                real-world value and cannot be exchanged for real money. We reserve
                the right to modify or remove virtual items at any time without
                liability.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Disclaimer of Warranties
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                The game is provided "as is" without warranties of any kind, either
                express or implied. We do not guarantee that the game will be
                uninterrupted, error-free, or free of harmful components.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Limitation of Liability
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                In no event shall Turup's Gambit be liable for any damages (including,
                without limitation, damages for loss of data or profit, or due to
                business interruption) arising out of the use or inability to use
                the game.
              </p>
            </div>
          </div>

          <div className="scroll-bg p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-medieval text-secondary mb-4">
              Changes to Terms
            </h2>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p>
                We reserve the right to modify these terms at any time. We will
                notify players of significant changes. Your continued use of the
                game after such changes constitutes your acceptance of the new terms.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">
              Last Updated: November 22, 2025
            </p>
            <Link href="/" passHref>
              <Button className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground">
                Return to the Kingdom
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
