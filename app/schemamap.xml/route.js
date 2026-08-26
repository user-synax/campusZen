import { NextResponse } from "next/server";

export const dynamic = "force-static";

const SCHEMAMAP = `<?xml version="1.0" encoding="UTF-8"?>
<schemaMap xmlns="https://microsoft.github.io/NLWeb/schemaMap">
  <site>https://campuszen.tech</site>
  <feed type="sitemap" url="https://campuszen.tech/sitemap.xml" />
  <feed type="jsonld" url="https://campuszen.tech/llms.txt" />
  <feed type="jsonl" url="https://campuszen.tech/.well-known/agent-skills/index.json" />
  <feed type="openapi" url="https://campuszen.tech/openapi.json" />
  <feed type="markdown" url="https://campuszen.tech/index.md" />
</schemaMap>
`;

export function GET() {
    return new NextResponse(SCHEMAMAP, {
        status: 200,
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
        },
    });
}
