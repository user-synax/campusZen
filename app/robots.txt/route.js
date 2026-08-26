import { NextResponse } from "next/server";

export const dynamic = "force-static";

const ROBOTS = `User-agent: *
Allow: /
Disallow: /feed
Disallow: /admin
Disallow: /settings
Disallow: /chats
Disallow: /notifications
Disallow: /verify-student
Disallow: /api/admin
Disallow: /api/auth/logout
Disallow: /api/billing

# Training-only crawlers: disallow to keep content out of model training sets
# while still allowing answer-engine crawlers above.
User-agent: CCBot
Disallow: /

User-agent: ByteSpider
Disallow: /

# Answer-engine + agent crawlers explicitly allowed.
User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: DeepSeekBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ora-agent
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: AI2Bot
Allow: /

User-agent: OAI-SearchBot
Allow: /

Sitemap: https://campuszen.tech/sitemap.xml
Host: https://campuszen.tech
Schemamap: https://campuszen.tech/schemamap.xml
`;

export function GET() {
    return new NextResponse(ROBOTS, {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
