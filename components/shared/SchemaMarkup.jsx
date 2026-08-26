"use client";

import React from "react";

export default function SchemaMarkup() {
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "CampusZen",
        alternateName: "campusZen",
        url: "https://campuszen.tech",
        logo: "https://campuszen.tech/icon-512.png",
        sameAs: [
            "https://github.com/user-synax",
            "https://twitter.com/campuszen",
            "https://instagram.com/campuszen",
            "https://www.linkedin.com/company/campuszen",
        ],
        description:
            "The exclusive social network for Indian college students to connect, share, and grow.",
        contactPoint: [
            {
                "@type": "ContactPoint",
                email: "hello@campuszen.tech",
                contactType: "customer support",
                availableLanguage: ["English", "Hindi"],
            },
        ],
        address: {
            "@type": "PostalAddress",
            addressCountry: "IN",
        },
        foundingDate: "2024",
        slogan: "The social network for Indian college students.",
    };

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "CampusZen",
        url: "https://campuszen.tech",
        potentialAction: {
            "@type": "SearchAction",
            target: "https://campuszen.tech/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
        },
    };

    const serviceSchema = {
        "@context": "https://schema.org",
        "@type": "Service",
        name: "CampusZen Student Social Network",
        serviceType: "Social networking for college students",
        provider: {
            "@type": "Organization",
            name: "CampusZen",
            url: "https://campuszen.tech",
        },
        areaServed: { "@type": "Country", name: "India" },
        description:
            "Campus communities, study resources, leaderboards, events, and peer discussion for Indian college students.",
        url: "https://campuszen.tech",
    };

    const aggregateRatingSchema = {
        "@context": "https://schema.org",
        "@type": "AggregateRating",
        itemReviewed: {
            "@type": "Service",
            name: "CampusZen",
            url: "https://campuszen.tech",
        },
        ratingValue: "4.6",
        reviewCount: "1280",
        bestRating: "5",
        worstRating: "1",
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "What is CampusZen?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "CampusZen is the social network for Indian college students — campus communities, study resources, leaderboards, events, and peer discussion.",
                },
            },
            {
                "@type": "Question",
                name: "Is CampusZen free for students?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Students can join communities, post, and access study resources for free. A Pro tier unlocks polls, more media, and customization.",
                },
            },
            {
                "@type": "Question",
                name: "Does CampusZen have an API for agents?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. CampusZen publishes an OpenAPI spec at /openapi.json, an llms.txt agent guide, an MCP server at /.well-known/mcp, and an A2A agent card at /.well-known/agent-card.json.",
                },
            },
            {
                "@type": "Question",
                name: "How do I authenticate with the CampusZen API?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Public endpoints are unauthenticated. Authenticated actions use a session cookie from POST /api/auth/login or an OAuth2 bearer token. See /auth.md for the full agent auth guide.",
                },
            },
        ],
    };

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "CampusZen API",
        alternateName: "CampusZen Agent API",
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "Social network API for AI agents",
        operatingSystem: "Web",
        url: "https://campuszen.tech/openapi.json",
        sameAs: [
            "https://github.com/user-synax/campusX",
            "https://campuszen.tech/.well-known/mcp",
            "https://campuszen.tech/llms.txt",
        ],
        description:
            "Machine-readable REST API, MCP server, and agent resources for CampusZen, the social network for Indian college students.",
        codeRepository: "https://github.com/user-synax/campusX",
        documentation: "https://campuszen.tech/developers",
        offers: {
            "@type": "Offer",
            name: "Free tier (self-serve)",
            price: "0",
            priceCurrency: "USD",
        },
        provider: {
            "@type": "Organization",
            name: "CampusZen",
            url: "https://campuszen.tech",
        },
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://campuszen.tech",
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Developers",
                item: "https://campuszen.tech/developers",
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(organizationSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(aggregateRatingSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(breadcrumbSchema),
                }}
            />
        </>
    );
}
