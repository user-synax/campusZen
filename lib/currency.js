// ============================================
// CURRENCY IDENTITY — single source of truth
// Rename here once; import everywhere.
// ============================================

export const CURRENCY = {
    // Full display name
    name: "Viper Coins",
    // Short label / ticker
    shortName: "VP",
    // Symbol used in UI (same as shortName for VP)
    symbol: "VP",
    // Icon asset path — provided icons8 PNG lives in /public/icons/.
    // Falls back to 🪙 emoji in the UI if the asset is missing.
    iconPath: "/icon/vp-coin.png",
};

// Convenience formatter — always formats amounts with the currency symbol
export function formatVP(amount) {
    return `${amount.toLocaleString("en-IN")} ${CURRENCY.shortName}`;
}
