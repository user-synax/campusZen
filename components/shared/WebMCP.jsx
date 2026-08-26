"use client";

import { useEffect } from "react";

// Registers CampusZen's in-page tools with the WebMCP browser API
// (https://www.w3.org/community/agentic-web/ — W3C draft). When a
// WebMCP-capable agent (e.g. ChatGPT Sites, Chrome 157+) is present, it can
// discover and invoke these tools directly from the rendered page.
export default function WebMCP() {
    useEffect(() => {
        const register = () => {
            const api =
                typeof document !== "undefined" &&
                (document.modelContext || navigator.modelContext);
            if (!api || typeof api.registerTool !== "function") return;

            try {
                api.registerTool(
                    "campuszen_search",
                    {
                        description:
                            "Search CampusZen campus communities and content by keyword. Returns community names and stats. Public; no auth required.",
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "Search keyword (e.g. 'bca', 'placement').",
                                },
                            },
                            required: ["query"],
                        },
                    },
                    async ({ query }) => {
                        const res = await fetch(
                            `https://campuszen.tech/api/communities?name=${encodeURIComponent(
                                query,
                            )}`,
                        );
                        const data = await res.json();
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify(data),
                                },
                            ],
                        };
                    },
                );
            } catch {
                // WebMCP not available in this environment; ignore.
            }
        };

        // modelContext may be added after load; poll briefly.
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
        const t = setTimeout(register, 1500);
        return () => clearTimeout(t);
    }, []);

    return null;
}
