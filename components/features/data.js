import {
    Bookmark,
    BookOpen,
    Bot,
    Calendar,
    FileJson,
    GraduationCap,
    Link2,
    MessageSquare,
    Network,
    ShoppingBag,
    Sparkles,
    Trophy,
    Video,
    Wallet,
} from "lucide-react";

/**
 * Content for the features page.
 *
 * Plain module, deliberately not `"use client"`: the icons are component
 * references, and a React component can't be handed from a server component to
 * a client one as a prop. Each client section imports from here directly
 * instead, so the icons resolve inside the client bundle.
 *
 * Every claim below already existed on this page or in AGENTS.md. `detail`
 * restates specifics from the feature's own `body` — it doesn't add new ones.
 */

export const CATEGORIES = [
    { id: "all", label: "Everything" },
    { id: "social", label: "Social" },
    { id: "learn", label: "Learn" },
    { id: "rewards", label: "Rewards" },
];

export const PRODUCT_FEATURES = [
    {
        id: "communities",
        icon: GraduationCap,
        category: "social",
        title: "Campus Communities",
        body: "Join college-specific and interest groups — BCA, IGNOU, placement, hostel life and more. Discover communities by name or college slug, see live member and post counts, and find your people.",
        detail: [
            "College-specific and interest groups",
            "Search by name or college slug",
            "Live member and post counts",
        ],
    },
    {
        id: "feed",
        icon: MessageSquare,
        category: "social",
        title: "Feed & Posts",
        body: "Share rich posts with Markdown, images and GIFs. React with emotions, create polls (Pro), use hashtags, and scroll a fast cursor-based feed with built-in moderation checks.",
        tag: "Polls are Pro",
        detail: [
            "Markdown, images and GIFs",
            "Emotion reactions and hashtags",
            "Cursor-based feed with moderation checks",
        ],
    },
    {
        id: "leaderboard",
        icon: Trophy,
        category: "rewards",
        title: "Leaderboard & Reputation",
        body: "Earn reputation for contributing. Climb global, weekly, and college leaderboards, unlock ranks, and show off your standing in the community.",
        detail: [
            "Global, weekly and college boards",
            "Reputation for contributing",
            "Unlockable ranks",
        ],
    },
    {
        id: "events",
        icon: Calendar,
        category: "learn",
        title: "Campus Events",
        body: "Browse upcoming and past campus events, filter by college, and RSVP in a click. Never miss a fest, hackathon, or placement drive again.",
        detail: [
            "Upcoming and past events",
            "Filter by college",
            "One-click RSVP",
        ],
    },
    {
        id: "resources",
        icon: BookOpen,
        category: "learn",
        title: "Study Resources",
        body: "A peer-curated library of approved study materials. Browse resources your classmates have shared and level up together.",
        detail: [
            "Peer-curated library",
            "Approved materials only",
            "Shared by your classmates",
        ],
    },
    {
        id: "clips",
        icon: Video,
        category: "social",
        title: "Clips",
        body: "Short campus video clips to share moments, notes, and highlights with your network.",
        detail: ["Short-form campus video", "Moments, notes and highlights"],
    },
    {
        id: "shop",
        icon: ShoppingBag,
        category: "rewards",
        title: "Shop & Cosmetics",
        body: "Personalize your profile with avatar frames, themes, and rarity items from the CampusZen shop.",
        detail: ["Avatar frames and themes", "Rarity items"],
    },
    {
        id: "wallet",
        icon: Wallet,
        category: "rewards",
        title: "Wallet",
        body: "A lightweight in-app currency for cosmetics and rewards, kept separate from your real campus identity.",
        detail: [
            "In-app currency only",
            "Spends on cosmetics and rewards",
            "Separate from your campus identity",
        ],
    },
    {
        id: "connect",
        icon: Link2,
        category: "social",
        title: "Connect",
        body: "Smart peer suggestions help you find and network with students across colleges and interests.",
        detail: ["Peer suggestions", "Across colleges and interests"],
    },
    {
        id: "bookmarks",
        icon: Bookmark,
        category: "social",
        title: "Bookmarks & Chats",
        body: "Save posts for later and message friends in real time. Your campus life, organized.",
        detail: ["Save posts for later", "Real-time messaging"],
    },
];

/**
 * The machine-readable surfaces. `sample` is request-side only — a command you
 * can actually run or paste. No response payloads are shown, because none of
 * them are captured in this repo and inventing one would be a lie about what
 * the API returns.
 */
export const AGENT_FEATURES = [
    {
        id: "openapi",
        icon: FileJson,
        title: "OpenAPI spec",
        body: "A complete, machine-readable REST API at /openapi.json with operationIds, typed schemas, and a versioning + deprecation policy.",
        endpoint: "/openapi.json",
        sampleLabel: "Fetch the spec",
        sample: "curl -s https://campuszen.in/openapi.json",
    },
    {
        id: "mcp",
        icon: Bot,
        title: "MCP servers",
        body: "Two Model Context Protocol servers — one for product actions, one for docs — so Claude, ChatGPT, and other agents call CampusZen natively over Streamable HTTP.",
        endpoint: "/api/mcp",
        sampleLabel: "Add to an MCP client",
        sample: `{
  "mcpServers": {
    "campuszen": {
      "type": "http",
      "url": "https://campuszen.in/api/mcp"
    }
  }
}`,
    },
    {
        id: "agent-card",
        icon: Network,
        title: "Agent card & skills",
        body: "An A2A agent card and a v0.2.0 agent-skills index advertise CampusZen's capabilities to other agents.",
        endpoint: "/.well-known/agent-card.json",
        sampleLabel: "Discover capabilities",
        sample: "curl -s https://campuszen.in/.well-known/agent-card.json",
    },
    {
        id: "nlweb",
        icon: Sparkles,
        title: "NLWeb & auth.md",
        body: "A conversational /ask endpoint plus an auth.md guide so agents can discover credentials and act on behalf of users.",
        endpoint: "/api/ask",
        sampleLabel: "Ask in natural language",
        sample: `curl -s https://campuszen.in/api/ask \\
  -H 'content-type: application/json' \\
  -d '{"query":"communities for placement prep"}'`,
    },
];

/** The `/.well-known` resources listed in AGENTS.md. */
export const WELL_KNOWN = [
    "/.well-known/agent-card.json",
    "/.well-known/agent-skills/index.json",
    "/.well-known/api-catalog",
    "/.well-known/ai-catalog.json",
    "/.well-known/mcp",
    "/.well-known/mcp/server-card.json",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource",
    "/.well-known/http-message-signatures-directory",
];

/**
 * Counted from the arrays above rather than typed in, so the strip can't drift
 * from the page it is summarising.
 */
export const METRICS = [
    {
        id: "surfaces",
        value: PRODUCT_FEATURES.length,
        label: "product surfaces",
        note: "communities through to the wallet",
    },
    {
        id: "paths",
        value: AGENT_FEATURES.length,
        label: "agent integration paths",
        note: "OpenAPI · MCP · A2A · NLWeb",
    },
    {
        id: "wellknown",
        value: WELL_KNOWN.length,
        label: "well-known resources",
        note: "discoverable without reading docs",
    },
];

/** A local tick-list, not a stored onboarding flow — see the section's copy. */
export const CHECKLIST = [
    {
        id: "college",
        label: "Pick your college and join a community",
        hint: "Search by name or college slug",
    },
    {
        id: "post",
        label: "Write your first post",
        hint: "Markdown, images and GIFs are all supported",
    },
    {
        id: "event",
        label: "RSVP to something happening on campus",
        hint: "Fests, hackathons, placement drives",
    },
    {
        id: "study",
        label: "Open a study resource a classmate shared",
        hint: "Peer-curated and approved",
    },
    {
        id: "shop",
        label: "Spend your first coins in the shop",
        hint: "Avatar frames, themes, rarity items",
    },
];

export const FAQ = [
    {
        id: "who",
        q: "Who can join CampusZen?",
        a: "Indian college students. Sign up free, pick your college, and you land in a student-only network with your campus communities already waiting.",
    },
    {
        id: "cost",
        q: "Does it cost anything?",
        a: "The core product is free. There is a Pro tier as well — the full breakdown of what it includes lives on the pricing page.",
    },
    {
        id: "pro",
        q: "What does Pro add?",
        a: "Extras on top of the free feed, such as creating polls. Pricing is the source of truth for the current list, so check there rather than trusting a summary.",
    },
    {
        id: "wallet",
        q: "Is the wallet real money?",
        a: "No. It is a lightweight in-app currency for cosmetics and rewards, kept separate from your real campus identity.",
    },
    {
        id: "reputation",
        q: "How do I climb the leaderboard?",
        a: "By contributing. Reputation accrues from what you post and share, and it feeds the global, weekly, and college-specific boards.",
    },
    {
        id: "agents",
        q: "Can an AI agent use CampusZen for me?",
        a: "Yes. There is a full OpenAPI spec, two MCP servers over Streamable HTTP, an A2A agent card, an agent-skills index, and a conversational /ask endpoint. Start at llms.txt.",
    },
];
