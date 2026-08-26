import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

// Load an ESM-source .js lib without needing a package "type":"module".
// These lib files have no external imports, so inlining is safe.
function loadLib(rel) {
    const src = readFileSync(path.join(ROOT, rel), "utf8");
    const transformed = src
        .replace(/export const /g, "const ")
        .replace(/export function /g, "function ")
        .replace(/export async function /g, "async function ");
    const names = [];
    for (const m of src.matchAll(
        /export (?:const|function|async function) (\w+)/g,
    )) {
        names.push(m[1]);
    }
    const code =
        transformed + "\nexport { " + names.join(", ") + " };\n";
    const dataUrl =
        "data:text/javascript;base64," +
        Buffer.from(code).toString("base64");
    return import(dataUrl);
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

test("openapi spec is valid and self-describing", async () => {
    const { openapiSpec } = await loadLib("lib/openapi-spec.js");

    // 1. Valid OpenAPI 3.x document, JSON-serializable.
    assert.ok(openapiSpec && typeof openapiSpec === "object");
    assert.match(openapiSpec.openapi, /^3\./);
    assert.doesNotThrow(() => JSON.stringify(openapiSpec));

    // 2. Title contains product name.
    assert.match(openapiSpec.info.title, /CampusZen/);

    // 3. Every operation has a unique operationId and a description.
    const seenIds = new Set();
    for (const [path, methods] of Object.entries(openapiSpec.paths)) {
        for (const method of HTTP_METHODS) {
            const op = methods[method];
            if (!op) continue;
            assert.ok(
                typeof op.operationId === "string" && op.operationId.length > 0,
                `Missing operationId on ${method.toUpperCase()} ${path}`,
            );
            assert.ok(
                typeof op.description === "string" &&
                    op.description.trim().length > 0,
                `Missing description on ${method.toUpperCase()} ${path}`,
            );
            assert.ok(
                !seenIds.has(op.operationId),
                `Duplicate operationId: ${op.operationId}`,
            );
            seenIds.add(op.operationId);
        }
    }
    assert.ok(seenIds.size >= 10, "Expected several operations with ids");
});

test("llms.txt guides agents and links developer resources", async () => {
    const { LLMS_TXT } = await loadLib("lib/llms-txt.js");
    assert.match(LLMS_TXT, /# CampusZen — llms\.txt/);
    assert.match(LLMS_TXT, /## When to use CampusZen/);
    assert.match(LLMS_TXT, /\/openapi\.json/);
    assert.match(LLMS_TXT, /\/developers/);
    assert.match(LLMS_TXT, /\/api/);
    assert.match(LLMS_TXT, /structured JSON/);
});

test("markdown negotiation returns content per path", async () => {
    const { getMarkdownContent } = await loadLib("lib/markdown-content.js");
    const home = getMarkdownContent("/");
    assert.match(home, /# CampusZen/);
    assert.match(home, /\/openapi\.json/);

    const community = getMarkdownContent("/community/bca");
    assert.match(community, /bca/);
    assert.match(community, /api\/communities/);

    const dev = getMarkdownContent("/developers");
    assert.match(dev, /CampusZen Developer Resources/);

    const fallback = getMarkdownContent("/some/unknown/path");
    assert.match(fallback, /CampusZen/);
});

test("Organization JSON-LD includes contactPoint and address", () => {
    const src = readFileSync(
        path.join(ROOT, "components/shared/SchemaMarkup.jsx"),
        "utf8",
    );
    assert.match(src, /"@type":\s*"ContactPoint"/);
    assert.match(src, /contactType/);
    assert.match(src, /"@type":\s*"PostalAddress"/);
    assert.match(src, /addressCountry/);
});
