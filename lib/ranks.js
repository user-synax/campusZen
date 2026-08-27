// ============================================
// CONFIGURABLE XP PROGRESSION SYSTEM
// Edit values in this section to customize the system
// ============================================

/**
 * XP awarded per action type
 * Modify these values to adjust how much XP users get for each activity
 */
export const XP_AWARDS = {
    post: 300, // XP for creating a post
    follow: 100, // XP for following a user
    like: 20, // XP for liking a post
    comment: 50, // XP for commenting on a post
    daily_login: 50, // XP for logging in daily
    event_rsvp: 500, // XP for RSVPing to an event
    resource_upload: 1000, // XP for uploading a resource
};

/**
 * Daily action limits (to prevent XP exploitation)
 * Set maximum number of times a user can earn XP for each action per day
 */
export const DAILY_XP_LIMITS = {
    like: 100, // Max 100 likes per day (2000 XP max)
    follow: 50, // Max 50 follows per day (5000 XP max)
    comment: 30, // Max 30 comments per day (1500 XP max)
};

// ============================================
// CONFIGURABLE VP (Viper Coins) ECONOMY
// Edit values in this section to customize the coin system.
// Amounts are SERVER-ONLY — never sent from the client.
// ============================================

/**
 * VP awarded per earn action type.
 * PLACEHOLDERS set to 0 — fill these in manually.
 * Must match a reason in models/WalletTransaction.js
 */
export const VP_AWARDS = {
    post: 500, // VP for creating a post
    like: 50, // VP for giving a like (actor earns, not receiver)
    comment: 100, // VP for adding a comment (actor earns)
    follow: 200, // VP for following someone (actor earns)
    resource_share: 1000, // VP for sharing a resource/post
    resource_upload: 200, // VP for uploading a resource
    daily_login: 10, // VP for daily login
    event_rsvp: 1000, // VP for RSVPing to an event
};

/**
 * Daily VP caps (anti-farming) — maximum cumulative VP a user can earn
 * from each action type per calendar day. 0 = no cap.
 * Value-based (not count-based) so the cap holds regardless of per-action amount.
 */
export const DAILY_VP_LIMITS = {
    like: 1000,
    comment: 1000,
    follow: 1000,
    post: 1000,
    resource_share: 3000,
    event_rsvp: 2000,
    resource_upload: 1000,
};

/**
 * VP prices for spend actions (shop / purchases).
 * Keyed by item id. Amount resolved server-side only.
 * PLACEHOLDERS — fill in when shop catalog is defined.
 */
export const VP_PRICES = {
    // example_item_id: 500,
};

/**
 * Rank configuration: level to rank mapping
 * Defines which rank/badge a user gets at each level threshold
 * Format: { level: { name: "Rank Name", badge: "/path/to/badge.png" } }
 */
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
 * XP Progression Curve Configuration
 * Choose one of the progression strategies below:
 * 1. FORMULA_BASED - Uses a mathematical formula for smooth progression
 * 2. EXPLICIT_LEVELS - Defines exact XP requirements for each level
 */
export const PROGRESSION_STRATEGY = "FORMULA_BASED"; // Change to "EXPLICIT_LEVELS" if needed

/**
 * Formula-based progression settings
 * Formula: BASE_XP * (level ^ EXPONENT)
 */
export const FORMULA_PROGRESSION = {
    BASE_XP: 1000, // Base XP value for the formula
    EXPONENT: 1.2, // Exponent to control curve steepness (higher = steeper)
};

/**
 * Explicit level-based progression (optional, use if PROGRESSION_STRATEGY is "EXPLICIT_LEVELS")
 * Defines exact XP required for each level
 */
export const EXPLICIT_LEVEL_PROGRESSION = {
    1: 0,
    2: 1000,
    3: 2200,
    4: 3600,
    5: 5200,
    6: 7000,
    7: 9000,
    8: 11200,
    9: 13600,
    10: 16200,
    11: 17000,
    12: 20000,
    13: 25000,
    14: 30000,
    15: 35000,
    16: 40000,
    17: 45000,
    18: 50000,
    19: 55000,
    20: 60000,
    21: 65250,
    22: 70750,
    23: 76500,
    24: 82500,
    25: 88750,
    26: 95250,
    27: 102000,
    28: 109000,
    29: 116250,
    30: 123750,
    31: 131500,
    32: 139500,
    33: 147750,
    34: 156250,
    35: 165000,
    36: 174000,
    37: 183250,
    38: 192750,
    39: 202500,
    40: 212500,
    41: 222750,
    42: 233250,
    43: 244000,
    44: 255000,
    45: 266250,
    46: 277750,
    47: 289500,
    48: 301500,
    49: 313750,
    50: 326250,
    51: 339000,
    52: 352000,
    53: 365250,
    54: 378750,
    55: 392500,
    56: 406500,
    57: 420750,
    58: 435250,
    59: 450000,
    60: 465000,
    61: 480250,
    62: 495750,
    63: 511500,
    64: 527500,
    65: 543750,
    66: 560250,
    67: 577000,
    68: 594000,
    69: 611250,
    70: 628750,
    71: 646500,
    72: 664500,
    73: 682750,
    74: 701250,
    75: 720000,
    76: 739000,
    77: 758250,
    78: 777750,
    79: 797500,
    80: 817500,
    81: 837750,
    82: 858250,
    83: 879000,
    84: 900000,
    85: 921250,
    86: 942750,
    87: 964500,
    88: 986500,
    89: 1008750,
    90: 1031250,
};

// ============================================
// END OF CONFIGURABLE SECTION
// Do not edit below this line unless you want to modify core logic
// ============================================

/**
 * Calculate total XP required to reach a specific level
 * @param {number} level - The level to calculate XP for
 * @returns {number} Total XP required
 */
export function getXPRequiredForLevel(level) {
    if (level <= 1) return 0;

    if (PROGRESSION_STRATEGY === "EXPLICIT_LEVELS") {
        // Check if we have explicit definition for this level
        if (EXPLICIT_LEVEL_PROGRESSION[level]) {
            return EXPLICIT_LEVEL_PROGRESSION[level];
        }
        // If not, fall back to formula
        const { BASE_XP, EXPONENT } = FORMULA_PROGRESSION;
        return Math.floor(BASE_XP * Math.pow(level, EXPONENT));
    }

    // Default formula-based progression
    const { BASE_XP, EXPONENT } = FORMULA_PROGRESSION;
    return Math.floor(BASE_XP * Math.pow(level, EXPONENT));
}

/**
 * Get the rank information for a given level
 * @param {number} level - User's current level
 * @returns {Object} Rank details { name, badge }
 */
export function getRankForLevel(level) {
    const sortedLevels = Object.keys(RANK_MAPPING)
        .map(Number)
        .sort((a, b) => b - a);

    for (const lvl of sortedLevels) {
        if (level >= lvl) {
            return RANK_MAPPING[lvl];
        }
    }

    return RANK_MAPPING[1]; // Default to lowest rank
}

/**
 * Get comprehensive level progress details for a user
 * @param {number} currentXP - User's current XP
 * @param {number} currentLevel - User's current level
 * @returns {Object} Progress details
 */
export function getLevelProgress(currentXP, currentLevel) {
    const level = currentLevel || 1;
    const xpForCurrentLevel = getXPRequiredForLevel(level);
    const xpForNextLevel = getXPRequiredForLevel(level + 1);
    const xpInCurrentLevel = currentXP - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
    const remainingXP = Math.max(0, xpForNextLevel - currentXP);

    let progressPercentage = 0;
    if (xpNeededForNext > 0) {
        progressPercentage = Math.min(
            100,
            Math.round((xpInCurrentLevel / xpNeededForNext) * 100),
        );
    }

    return {
        currentLevel: level,
        nextLevel: level + 1,
        currentXP,
        xpForCurrentLevel,
        xpForNextLevel,
        xpInCurrentLevel,
        xpNeededForNext,
        remainingXP,
        progressPercentage,
    };
}

/**
 * Calculate user's level based on total XP
 * @param {number} totalXP - Total XP accumulated
 * @returns {number} Calculated level
 */
export function calculateLevelFromXP(totalXP) {
    let level = 1;
    while (totalXP >= getXPRequiredForLevel(level + 1)) {
        level++;
    }
    return level;
}
