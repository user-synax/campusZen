"use client";

import { Users } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import TextType from "@/components/ui/TextType";

/**
 * The rotating headlines. Kept as a module constant so the longest string can be
 * derived rather than hand-maintained — the hero renders it invisibly to reserve
 * the headline's box, so the copy below never reflows as the typewriter cycles.
 */
const HEADLINES = [
    "Your College Community, All in One",
    "Where College Life Happens",
    "Join Your College Community Today",
    "Connect With Students Who Matter",
    "Everything You Need for Campus Life",
    "Meet, Share & Grow With Your Campus",
    "Your Campus. Your People. Your Space",
    "Connect Beyond the Classroom",
    "Your Campus, Connected",
    "India's Verified Student Community",
];

const LONGEST_HEADLINE = HEADLINES.reduce((a, b) =>
    b.length > a.length ? b : a,
);

const PROOF = [
    { initials: "AR", label: "Ananya · VIT" },
    { initials: "RK", label: "Rohan · IIT-B" },
    { initials: "SM", label: "Sneha · SRM" },
    { initials: "DP", label: "Dev · BITS" },
    { initials: "KI", label: "Kiran · NIT-T" },
];

export function HeroSectionDemo({ stats }) {
    return (
        <HeroSection
            badge={{ text: "Made in India", emoji: "🇮🇳" }}
            titleRotatingText={{
                longest: LONGEST_HEADLINE,
                component: (
                    <TextType
                        as="span"
                        text={HEADLINES}
                        typingSpeed={75}
                        pauseDuration={1500}
                        showCursor
                        cursorCharacter="●"
                        cursorClassName="text-primary"
                        deletingSpeed={50}
                        cursorBlinkDuration={0.5}
                    />
                ),
            }}
            description="The ultimate campus ecosystem to build your network, crush your goals, and vibe with your tribe. All in one place."
            actions={[
                { text: "Join Now", href: "/signup", variant: "glow" },
                {
                    text: "Explore Features",
                    href: "/features",
                    variant: "ghost",
                },
            ]}
            proof={{ items: PROOF, caption: "students already on board" }}
            stats={stats}
            highlight={{
                statKey: "posts",
                label: "posts shared this term",
                icon: <Users className="h-5 w-5 text-primary" />,
            }}
            image={{
                src: "/hero-image.png",
                alt: "CampusZen hero image",
            }}
        />
    );
}
