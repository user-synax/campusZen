import fs from "fs";
import path from "path";
import { slugify } from "@/lib/docs";
import DocsView from "@/components/docs/DocsView";

export const dynamic = "force-static";

export const metadata = {
    title: "Docs | CampusZen",
    description:
        "A friendly, plain-language guide to every feature in CampusZen — written for students.",
};

export default function DocsPage() {
    const markdown = fs.readFileSync(
        path.join(process.cwd(), "docs.md"),
        "utf8",
    );

    const toc = [];
    markdown.split("\n").forEach((line) => {
        const match = line.match(/^##\s+(.*)$/);
        if (!match) return;
        const title = match[1].trim();
        const id = slugify(title);
        if (id === "table-of-contents") return;
        toc.push({ id, title });
    });

    return <DocsView markdown={markdown} toc={toc} />;
}
