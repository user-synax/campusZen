"use client";

import React from 'react';

export default function SchemaMarkup() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CampusZen",
    "url": "https://campuszen.tech",
    "logo": "https://campuszen.tech/icon-512.png",
    "sameAs": [
      "https://twitter.com/campuszen",
      "https://instagram.com/campuszen"
    ],
    "description": "The exclusive social network for Indian college students to connect, share, and grow.",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": "hello@campuszen.tech",
        "contactType": "customer support",
        "availableLanguage": ["English", "Hindi"]
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CampusZen",
    "url": "https://campuszen.vercel.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://campuszen.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  );
}
