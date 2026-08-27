import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import SchemaMarkup from "@/components/shared/SchemaMarkup";
import WebMCP from "@/components/shared/WebMCP";
import { ThemeProvider } from "@/context/ThemeContext";
import { LayoutModeProvider } from "@/context/LayoutModeContext";

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
                                    var pathname = window.location.pathname;
                                    var isPublicOrAuthRoute = pathname === '/' ||
                                        pathname.startsWith('/login') ||
                                        pathname.startsWith('/signup') ||
                                        pathname.startsWith('/privacy') ||
                                        pathname.startsWith('/terms') ||
                                        pathname.startsWith('/docs') ||
                                        pathname.startsWith('/features') ||
                                        pathname.startsWith('/forgot-password');
                                    
                                    var CSS_VARS = ['--background','--foreground','--card','--card-foreground','--popover','--popover-foreground','--primary','--primary-foreground','--secondary','--secondary-foreground','--muted','--muted-foreground','--accent','--accent-foreground','--destructive','--destructive-foreground','--border','--input','--ring'];
                                    function removeCssVars() {
                                        CSS_VARS.forEach(function(v) { document.documentElement.style.removeProperty(v); });
                                    }
                                    
                                    if (isPublicOrAuthRoute) {
                                        document.documentElement.classList.remove('light');
                                        document.documentElement.classList.add('dark');
                                        removeCssVars();
                                    } else {
                                        var theme = localStorage.getItem('theme');
                                        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                        var activeTheme = theme || (prefersDark ? 'dark' : 'light');
                                        
                                        if (activeTheme === 'light' || activeTheme === 'dark') {
                                            removeCssVars();
                                            document.documentElement.classList.add(activeTheme);
                                        } else {
                                            document.documentElement.classList.remove('light', 'dark');
                                            removeCssVars();
                                        }
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body suppressHydrationWarning>
                <ThemeProvider>
                    <LayoutModeProvider>
                        <SchemaMarkup />
                        <WebMCP />
                        {children}
                        <Analytics />
                        <SpeedInsights />
                    </LayoutModeProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
