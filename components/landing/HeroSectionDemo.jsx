"use client";

import { HeroSection } from "@/components/ui/hero-section";
import { ArrowRight } from "lucide-react";
import TextType from "@/components/ui/TextType";

export function HeroSectionDemo() {
    return (
        <HeroSection
            badge={{
                text: `Made in India: 🇮🇳`,
            }}
            titleRotatingText={{
                component: (
                    <TextType
                        text={[
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
                        ]}
                        typingSpeed={75}
                        pauseDuration={1500}
                        showCursor
                        cursorCharacter="●"
                        deletingSpeed={50}
                        variableSpeedEnabled={false}
                        variableSpeedMin={60}
                        variableSpeedMax={120}
                        cursorBlinkDuration={0.5}
                    />
                ),
            }}
            description="The ultimate campus ecosystem to build your network, crush your goals, and vibe with your tribe. All in one place."
            actions={[
                {
                    text: "Join Now",
                    href: "/signup",
                    variant: "glow",
                },
                {
                    text: "Explore Features",
                    href: "#features",
                    variant: "ghost",
                    icon: <ArrowRight className="h-5 w-5" />,
                },
            ]}
            image={{
                src: "/hero-image.png",
                alt: "CampusX hero image",
            }}
        />
    );
}
