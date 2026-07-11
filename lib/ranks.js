// Configurable rank mapping: level -> { name, badge }
export const RANK_MAPPING = {
    1: { name: "Rookie", badge: "/assets/ranks/rookie.png" },
    3: { name: "Ruby", badge: "/assets/ranks/ruby.png" },
    10: { name: "Diamond", badge: "/assets/ranks/diamond.png" },
    15: { name: "Emerald", badge: "/assets/ranks/emerald.png" },
    20: { name: "Titan", badge: "/assets/ranks/titan.png" },
    30: { name: "Mythic", badge: "/assets/ranks/mythic.png" },
    50: { name: "Ace", badge: "/assets/ranks/ace.png" },
    90: { name: "Immortal", badge: "/assets/ranks/immortal.png" },
};

/**
 * Gets the rank for a given user level.
 */
export function getRankForLevel(level) {
    // Find the highest level in RANK_MAPPING that is <= user's level
    const sortedLevels = Object.keys(RANK_MAPPING)
        .map(Number)
        .sort((a, b) => b - a);

    for (const lvl of sortedLevels) {
        if (level >= lvl) {
            return RANK_MAPPING[lvl];
        }
    }

    // Default to lowest rank if none match
    return RANK_MAPPING[1];
}
