import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");

// Load an ESM-source .js lib without needing a package "type":"module".
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
    const code = transformed + "\nexport { " + names.join(", ") + " };\n";
    return import(
        "data:text/javascript;base64," + Buffer.from(code).toString("base64")
    );
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const SUCCESS = new Set([200, 201, 202, 203, 204, 205, 206]);

function successResponsesHaveJsonSchema(op) {
    for (const method of HTTP_METHODS) {
        const resp = op[method];
        if (!resp || !resp.responses) continue;
        for (const [code, def] of Object.entries(resp.responses)) {
            if (SUCCESS.has(Number(code))) {
                const content = def?.content?.["application/json"];
                if (!content || !content.schema) return false;
            }
        }
    }
    return true;
}

test("openapi spec is valid and self-describing", async () => {
    const { openapiSpec } = await loadLib("lib/openapi-spec.js");

    assert.ok(openapiSpec && typeof openapiSpec === "object");
    assert.match(openapiSpec.openapi, /^3\./);
    assert.doesNotThrow(() => JSON.stringify(openapiSpec));

    // Title contains product name.
    assert.match(openapiSpec.info.title, /CampusZen/);

    // operationId + description on every operation, and unique.
    const seenIds = new Set();
    let total = 0;
    let covered = 0;
    for (const [p, methods] of Object.entries(openapiSpec.paths)) {
        for (const method of HTTP_METHODS) {
            const op = methods[method];
            if (!op) continue;
            total++;
            assert.ok(
                typeof op.operationId === "string" && op.operationId.length > 0,
                `Missing operationId on ${method.toUpperCase()} ${p}`,
            );
            assert.ok(
                typeof op.description === "string" &&
                    op.description.trim().length > 0,
                `Missing description on ${method.toUpperCase()} ${p}`,
            );
            assert.ok(
                !seenIds.has(op.operationId),
                `Duplicate operationId: ${op.operationId}`,
            );
            seenIds.add(op.operationId);
            if (successResponsesHaveJsonSchema(op)) covered++;
        }
    }
    assert.ok(total >= 10, "Expected several operations");
    // #10: >60% of operations define JSON response schemas.
    assert.ok(
        covered / total >= 0.6,
        `Response schema coverage ${covered}/${total} (<60%)`,
    );
});

test("openapi declares a versioning + deprecation policy", async () => {
    const { openapiSpec } = await loadLib("lib/openapi-spec.js");
    assert.match(openapiSpec.info.version, /^\d+\.\d+/);
    assert.ok(openapiSpec.externalDocs && openapiSpec.externalDocs.url);
    assert.match(openapiSpec.info.description, /Versioning policy/);
    assert.match(openapiSpec.info.description, /Deprecation/);
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
    assert.match(getMarkdownContent("/"), /# CampusZen/);
    assert.match(getMarkdownContent("/"), /\/openapi\.json/);
    assert.match(getMarkdownContent("/community/bca"), /bca/);
    assert.match(getMarkdownContent("/developers"), /CampusZen Developer Resources/);
    assert.match(getMarkdownContent("/some/unknown/path"), /CampusZen/);
});

test("robots.txt allows known AI crawlers/agents", () => {
    const src = readFileSync(path.join(ROOT, "app/robots.txt/route.js"), "utf8");
    for (const ua of [
        "ChatGPT-User",
        "ClaudeBot",
        "DeepSeekBot",
        "Google-Extended",
        "ora-agent",
    ]) {
        assert.ok(
            src.includes(ua),
            `robots.txt should allow ${ua}`,
        );
    }
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
