"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisualEffects } from "@/components/visual-effects";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Eye,
  Database,
  Lock,
  Share2,
  Cookie,
  UserCheck,
  Globe,
  RefreshCw,
  Mail,
  FileText,
} from "lucide-react";

const sections = [
  {
    id: "introduction",
    title: "Introduction",
    icon: Shield,
    content: `Welcome to Turup's Gambit. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our game and services.

We are committed to protecting your privacy and handling your data in an open and transparent manner. By using Turup's Gambit, you agree to the collection and use of information in accordance with this policy.

Please read this policy carefully. If you do not agree with the terms of this privacy policy, please do not access the game.`,
  },
  {
    id: "information-collected",
    title: "Information We Collect",
    icon: Database,
    content: `We collect information in several ways:

ACCOUNT INFORMATION
When you create an account, we collect:
• Username (chosen by you)
• Email address
• Password (stored in encrypted form)
• Profile picture (optional)

GAMEPLAY DATA
We automatically collect data about your gameplay:
• Game statistics (wins, losses, tricks won)
• Match history and replays
• In-game actions and decisions
• Team assignments and performance

TECHNICAL DATA
We automatically collect certain technical information:
• IP address and approximate location
• Device type, operating system, and browser
• Game client version
• Session duration and timestamps
• Error logs and crash reports

COMMUNICATIONS
If you contact us or participate in chat:
• Support tickets and correspondence
• In-game chat messages (for moderation purposes)`,
  },
  {
    id: "how-we-use",
    title: "How We Use Your Information",
    icon: Eye,
    content: `We use the information we collect to:

PROVIDE AND IMPROVE THE GAME
• Create and manage your account
• Match you with other players
• Track game statistics and leaderboards
• Provide customer support
• Develop new features and improvements

ENSURE FAIR PLAY
• Detect and prevent cheating
• Enforce our Terms of Service
• Investigate reported violations
• Maintain game integrity

COMMUNICATE WITH YOU
• Send important account notifications
• Inform you about updates and changes
• Respond to your inquiries and support requests
• Send optional marketing communications (with your consent)

ANALYTICS AND OPTIMIZATION
• Analyze usage patterns to improve game performance
• Identify and fix bugs and technical issues
• Optimize server performance and matchmaking`,
  },
  {
    id: "data-sharing",
    title: "Information Sharing",
    icon: Share2,
    content: `We do NOT sell your personal information. We may share your information only in these circumstances:

PUBLIC INFORMATION
• Your username and game statistics are visible to other players
• Leaderboard rankings are publicly displayed
• Match results may be shown to participants

SERVICE PROVIDERS
We may share data with trusted third-party services that help us operate the game:
• Cloud hosting providers (data storage)
• Authentication services
• Analytics platforms
• Customer support tools

All service providers are contractually obligated to protect your data and use it only for specified purposes.

LEGAL REQUIREMENTS
We may disclose information if required by law or if we believe disclosure is necessary to:
• Comply with legal obligations
• Protect our rights or property
• Prevent fraud or security issues
• Protect the safety of users`,
  },
  {
    id: "data-security",
    title: "Data Security",
    icon: Lock,
    content: `We implement robust security measures to protect your information:

TECHNICAL SAFEGUARDS
• All passwords are hashed using industry-standard algorithms
• Data transmission is encrypted using SSL/TLS
• Regular security audits and vulnerability assessments
• Access controls and authentication for our systems

ORGANIZATIONAL MEASURES
• Limited employee access to personal data
• Staff training on data protection
• Incident response procedures

IMPORTANT NOTE
While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we continuously work to improve our protections.

If you discover a security vulnerability, please report it to security@turupsgambit.com.`,
  },
  {
    id: "cookies",
    title: "Cookies & Tracking",
    icon: Cookie,
    content: `We use cookies and similar technologies to enhance your experience:

ESSENTIAL COOKIES
• Authentication and session management
• Security features
• Game functionality

ANALYTICS COOKIES
• Usage patterns and statistics
• Performance monitoring
• Error tracking

PREFERENCE COOKIES
• Language and region settings
• Game preferences
• Volume and display settings

You can manage cookie preferences through your browser settings. However, disabling essential cookies may affect game functionality.

We do NOT use cookies for third-party advertising.`,
  },
  {
    id: "your-rights",
    title: "Your Rights",
    icon: UserCheck,
    content: `You have the following rights regarding your personal data:

ACCESS
• Request a copy of the personal data we hold about you

CORRECTION
• Update or correct inaccurate information in your profile

DELETION
• Request deletion of your account and associated data
• Note: Some data may be retained for legal or security purposes

DATA PORTABILITY
• Request your data in a portable format

OPT-OUT
• Unsubscribe from marketing communications
• Disable optional data collection (where applicable)

To exercise these rights, please contact us at privacy@turupsgambit.com or use the account settings in the game.

We will respond to requests within 30 days. We may need to verify your identity before processing certain requests.`,
  },
  {
    id: "international",
    title: "International Data Transfers",
    icon: Globe,
    content: `Turup's Gambit operates globally, and your data may be transferred to and processed in countries other than your own.

We ensure that international data transfers comply with applicable laws:
• We use service providers that participate in approved data transfer mechanisms
• We implement appropriate safeguards as required by law
• We only transfer data to countries with adequate data protection laws or with additional contractual protections

By using the game, you consent to the transfer of your data to other countries for processing as described in this policy.`,
  },
  {
    id: "children",
    title: "Children's Privacy",
    icon: Shield,
    content: `Turup's Gambit is not intended for children under 13 years of age.

We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.

If we discover that we have collected information from a child under 13, we will delete that information as quickly as possible.

For users between 13 and 18, we encourage parental involvement and supervision when using online services.`,
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    icon: RefreshCw,
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons.

HOW WE NOTIFY YOU
• Material changes will be announced through in-game notifications
• We may also send email notifications for significant updates
• The "Last Updated" date at the bottom will be revised

YOUR RESPONSIBILITY
• We encourage you to review this policy periodically
• Continued use of the game after changes constitutes acceptance
• If you disagree with changes, please discontinue use of the game`,
  },
  {
    id: "contact",
    title: "Contact Us",
    icon: Mail,
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

GENERAL INQUIRIES
Email: privacy@turupsgambit.com

SECURITY ISSUES
Email: security@turupsgambit.com

DATA REQUESTS
Email: privacy@turupsgambit.com
Subject: "Data Request - [Your Username]"

We aim to respond to all inquiries within 48-72 hours. For complex requests, we will acknowledge receipt and provide an estimated timeline.`,
  },
];

export default function PrivacyPolicyPage() {
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
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Your Privacy Matters</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medieval text-primary mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-muted-foreground">
            We are committed to protecting your privacy and being transparent about
            how we collect and use your data.
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

        {/* Key Points Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Card className="border-2 border-green-500/30 bg-green-950/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-green-400">
                <Shield className="w-4 h-4" />
                Key Privacy Commitments
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">We never sell your data</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Passwords are encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">No third-party ads</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">You control your data</span>
                </div>
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
              transition={{ delay: 0.2 + index * 0.05 }}
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
          transition={{ delay: 0.7 }}
          className="mt-12 text-center"
        >
          <Card className="border-2 border-primary/20 bg-card/90 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="py-8 px-6">
              <p className="text-sm text-muted-foreground mb-4">
                Last Updated: November 26, 2025
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/terms-of-service">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileText className="w-4 h-4 mr-2" />
                    Terms of Service
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
