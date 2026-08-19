import { Check } from "lucide-react";

const SIZE_CONFIG = {
    sm: {
        badge: "w-4 h-4",
        icon: "w-2.5 h-2.5",
        glowInset: "-inset-1",
        stroke: 3.6,
    },
    md: {
        badge: "w-5 h-5",
        icon: "w-3 h-3",
        glowInset: "-inset-1.5",
        stroke: 3.4,
    },
    lg: {
        badge: "w-6 h-6",
        icon: "w-3.5 h-3.5",
        glowInset: "-inset-2",
        stroke: 3.2,
    },
};

const TIER_CONFIG = {
    id_card: {
        title: "Verified Student ID",
        from: "#7DD3FC",
        mid: "#2563EB",
        to: "#1E3A8A",
        glow: "rgba(37,99,235,0.55)",
        rim: "rgba(147,197,253,0.55)",
    },
    college_email: {
        title: "Verified via College Email",
        from: "#DDD6FE",
        mid: "#7C3AED",
        to: "#4C1D95",
        glow: "rgba(124,58,237,0.55)",
        rim: "rgba(196,181,253,0.55)",
    },
};

export default function VerifiedBadge({
    size = "sm",
    verificationType = "id_card",
    className = "",
}) {
    const { badge, icon, glowInset, stroke } =
        SIZE_CONFIG[size] || SIZE_CONFIG.sm;
    const tier = TIER_CONFIG[verificationType] || TIER_CONFIG.id_card;

    return (
        <span
            title={tier.title}
            className={`vb-root inline-flex items-center justify-center relative select-none ${className}`}
        >
            <style>{`
                @keyframes vb-pulse {
                    0%, 100% { opacity: .35; transform: scale(1); }
                    50%      { opacity: .65; transform: scale(1.12); }
                }
                .vb-glow {
                    animation: vb-pulse 2.8s ease-in-out infinite;
                }
                .vb-core {
                    transition: transform .25s ease, filter .25s ease;
                }
                .vb-root:hover .vb-core {
                    transform: scale(1.12) translateY(-0.5px);
                    filter: brightness(1.08);
                }
                .vb-sweep {
                    transform: translate(-60%, 60%) rotate(-20deg);
                    transition: transform .75s ease;
                }
                .vb-root:hover .vb-sweep {
                    transform: translate(60%, -60%) rotate(-20deg);
                }
                @media (prefers-reduced-motion: reduce) {
                    .vb-glow { animation: none; }
                    .vb-core, .vb-sweep { transition: none; }
                    .vb-root:hover .vb-core { transform: none; filter: none; }
                    .vb-root:hover .vb-sweep { transform: translate(-60%, 60%) rotate(-20deg); }
                }
            `}</style>

            {/* ambient halo */}
            <span
                aria-hidden="true"
                className={`vb-glow absolute ${glowInset} rounded-full pointer-events-none`}
                style={{
                    background: `radial-gradient(circle, ${tier.glow} 0%, transparent 72%)`,
                    filter: "blur(3px)",
                }}
            />

            {/* badge body */}
            <span
                className={`vb-core ${badge} relative z-10 inline-flex items-center justify-center rounded-full overflow-hidden`}
                style={{
                    background: `linear-gradient(160deg, ${tier.from} 0%, ${tier.mid} 55%, ${tier.to} 100%)`,
                    boxShadow: [
                        "inset 0 1px 1px rgba(255,255,255,0.65)",
                        "inset 0 -2px 2px rgba(0,0,0,0.28)",
                        `0 0 0 1px ${tier.rim}`,
                        "0 2px 5px rgba(0,0,0,0.35)",
                    ].join(", "),
                }}
            >
                {/* glossy dome highlight */}
                <span
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse at 32% 22%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 55%)",
                        mixBlendMode: "screen",
                    }}
                />

                {/* diagonal light sweep (hover signature) */}
                <span
                    aria-hidden="true"
                    className="vb-sweep absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.65) 50%, transparent 60%)",
                    }}
                />

                <Check
                    className={`${icon} text-white relative z-10`}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
                    }}
                />
            </span>
        </span>
    );
}
