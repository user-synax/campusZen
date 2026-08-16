import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SchemaMarkup from "@/components/shared/SchemaMarkup";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata = {
    metadataBase: new URL("https://campuszen.tech"),
    title: {
        default: "CampusZen",
        template: "%s | CampusZen",
    },
    verification: {
        google: "K-xkYw1Y1PqYEcOS3grjVfobh5EH_UFVzU8jESjBzKg",
    },
    description:
        "The exclusive social network for Indian college students to connect, share, and grow.",
    keywords: [
        "student social network",
        "college students india",
        "campus community",
        "student platform india",
        "campuszen",
        "exclusive social media",
    ],
    authors: [{ name: "CampusZen" }],
    creator: "CampusZen",
    publisher: "CampusZen",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "CampusZen",
        description:
            "Connect with your campus community, share notes, and join exclusive student events.",
        url: "https://campuszen.tech",
        siteName: "CampusZen",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "CampusZen — Student Social Network",
            },
        ],
        locale: "en_IN",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "CampusZen",
        description:
            "The exclusive social network for Indian college students.",
        images: ["/og-image.png"],
        creator: "@campuszen",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: [
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            {
                url: "/android-chrome-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                url: "/android-chrome-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
        shortcut: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
};

export const viewport = {
    themeColor: "#6c3bff",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const pathname = window.location.pathname;
                                    // Check if we're on landing, signup, login, auth or public routes
                                    const isPublicOrAuthRoute = pathname === '/' ||
                                        pathname.startsWith('/login') ||
                                        pathname.startsWith('/signup') ||
                                        pathname.startsWith('/privacy') ||
                                        pathname.startsWith('/terms') ||
                                        pathname.startsWith('/docs') ||
                                        pathname.startsWith('/forgot-password');
                                    
                                    if (isPublicOrAuthRoute) {
                                        // Force dark mode for these routes
                                        document.documentElement.classList.remove('light');
                                        document.documentElement.classList.add('dark');
                                        // Remove any custom theme styles
                                        document.documentElement.style.removeProperty('--background');
                                        document.documentElement.style.removeProperty('--foreground');
                                        document.documentElement.style.removeProperty('--card');
                                        document.documentElement.style.removeProperty('--card-foreground');
                                        document.documentElement.style.removeProperty('--popover');
                                        document.documentElement.style.removeProperty('--popover-foreground');
                                        document.documentElement.style.removeProperty('--primary');
                                        document.documentElement.style.removeProperty('--primary-foreground');
                                        document.documentElement.style.removeProperty('--secondary');
                                        document.documentElement.style.removeProperty('--secondary-foreground');
                                        document.documentElement.style.removeProperty('--muted');
                                        document.documentElement.style.removeProperty('--muted-foreground');
                                        document.documentElement.style.removeProperty('--accent');
                                        document.documentElement.style.removeProperty('--accent-foreground');
                                        document.documentElement.style.removeProperty('--destructive');
                                        document.documentElement.style.removeProperty('--destructive-foreground');
                                        document.documentElement.style.removeProperty('--border');
                                        document.documentElement.style.removeProperty('--input');
                                        document.documentElement.style.removeProperty('--ring');
                                    } else {
                                        // Use normal theme logic for app routes
                                        const theme = localStorage.getItem('theme');
                                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                        const activeTheme = theme || (prefersDark ? 'dark' : 'light');
                                        document.documentElement.classList.add(activeTheme);
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body suppressHydrationWarning>
                <ThemeProvider>
                    <SchemaMarkup />
                    {children}
                    <Analytics />
                    <SpeedInsights />
                </ThemeProvider>
            </body>
        </html>
    );
}
