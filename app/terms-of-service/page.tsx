"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisualEffects } from "@/components/visual-effects";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Scroll,
  Shield,
  Users,
  Scale,
  AlertTriangle,
  FileText,
  Gavel,
  RefreshCw,
  Mail,
} from "lucide-react";

const sections = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    icon: FileText,
    content: `By accessing or using Turup's Gambit ("the Game"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use the Game.

These terms constitute a legally binding agreement between you and Turup's Gambit. We reserve the right to modify these terms at any time, and your continued use of the Game following any changes constitutes acceptance of those changes.`,
  },
  {
    id: "eligibility",
    title: "Eligibility",
    icon: Users,
    content: `To use Turup's Gambit, you must:

• Be at least 13 years of age (or the minimum age required in your jurisdiction)
• Have the legal capacity to enter into a binding agreement
• Not be prohibited from using the Game under applicable laws
• Create only one account per person

If you are under 18, you represent that you have obtained parental or guardian consent to use the Game and agree to these Terms.`,
  },
  {
    id: "conduct",
    title: "User Conduct",
    icon: Shield,
    content: `As a player, you agree to conduct yourself with respect and integrity. The following behaviors are strictly prohibited:

• Harassment, hate speech, bullying, or abusive language toward other players
• Cheating, exploiting bugs, or using unauthorized third-party software
• Impersonating other players, moderators, or staff members
• Spamming, advertising, or promoting unrelated products or services
• Attempting to disrupt game servers, services, or other players' experiences
• Sharing accounts or selling/trading accounts
• Creating multiple accounts to gain unfair advantages

Violation of these rules may result in warnings, temporary suspension, or permanent termination of your account at our sole discretion.`,
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    icon: Scale,
    content: `All content within Turup's Gambit, including but not limited to:

• Visual assets, graphics, and artwork
• Game mechanics and rules
• Source code and software
• Music, sound effects, and audio
• Text, logos, and branding

...is the exclusive property of Turup's Gambit and is protected by copyright, trademark, and other intellectual property laws.

You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Game for personal, non-commercial entertainment purposes only. You may not copy, modify, distribute, sell, or lease any part of the Game without explicit written permission.`,
  },
  {
    id: "virtual-items",
    title: "Virtual Items & Currency",
    icon: Scroll,
    content: `The Game may include virtual items, currencies, or other digital goods. You acknowledge and agree that:

• Virtual items have no real-world monetary value
• Virtual items cannot be exchanged, sold, or transferred for real money
• We reserve the right to modify, remove, or expire virtual items at any time
• No refunds will be provided for virtual items
• Your license to virtual items is limited and revocable

Any unauthorized sale, transfer, or exchange of virtual items outside the Game is prohibited and may result in account termination.`,
  },
  {
    id: "disclaimers",
    title: "Disclaimers & Warranties",
    icon: AlertTriangle,
    content: `THE GAME IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.

We do not warrant that:
• The Game will be uninterrupted, error-free, or secure
• Defects will be corrected in a timely manner
• The Game will meet your specific requirements
• Any information obtained through the Game will be accurate

You use the Game at your own risk. We are not responsible for any loss of data, progress, or virtual items due to technical issues, server outages, or other circumstances beyond our control.`,
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    icon: Gavel,
    content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, TURUP'S GAMBIT SHALL NOT BE LIABLE FOR:

• Any indirect, incidental, special, consequential, or punitive damages
• Loss of profits, data, use, goodwill, or other intangible losses
• Damages resulting from unauthorized access to your account
• Damages resulting from interruption or cessation of the Game
• Any bugs, viruses, or other harmful code transmitted through the Game

Our total liability for any claims arising from your use of the Game shall not exceed the amount you paid us (if any) in the twelve (12) months preceding the claim.`,
  },
  {
    id: "changes",
    title: "Changes to Terms",
    icon: RefreshCw,
    content: `We reserve the right to modify, update, or replace these Terms of Service at any time at our sole discretion.

• Material changes will be communicated through in-game notifications or email
• Your continued use of the Game after changes constitutes acceptance
• If you disagree with any changes, you must stop using the Game
• We encourage you to review these terms periodically

The "Last Updated" date at the bottom of this page indicates when these terms were last revised.`,
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    content: `If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us:

• Email: support@turupsgambit.com
• Response Time: We aim to respond within 48-72 hours

For urgent matters related to account security or violations, please include "URGENT" in your subject line.`,
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen">
      <VisualEffects enableGrain />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/30 mb-6">
            <Scroll className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Legal Document</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medieval text-primary mb-4">
            Terms of Service
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            Please read these terms carefully before using Turup's Gambit.
            By using our game, you agree to be bound by these terms.
          </p>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="border-2 border-primary/20 bg-card/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Quick Navigation
              </h2>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="text-sm px-3 py-1.5 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <Card className="border-2 border-primary/20 bg-card/90 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <section.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="border-2 border-primary/20 bg-card/90 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="py-8 px-6">
              <p className="text-sm text-muted-foreground mb-4">
                Last Updated: November 26, 2025
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/privacy-policy">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full sm:w-auto medieval-button bg-primary hover:bg-primary/90 text-primary-foreground">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
