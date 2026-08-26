"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Logo from "@/components/shared/Logo";

export default function NotFound() {
    return (
        <div className="flex flex-col min-h-screen bg-[#0f0f0f] text-[#f0f0f0] overflow-hidden relative">
            <header className="absolute top-0 w-full p-6 flex justify-center z-20">
                <Logo size="lg" />
            </header>
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
                <div className="relative mb-8">
                    <h1
                        className="text-9xl md:text-[12rem] font-black tracking-tighter select-none leading-none drop-shadow-2xl"
                    >
                        404
                    </h1>
                    <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/20 rounded-full blur-xl animate-ping" />
                </div>

                <div className="space-y-4 max-w-lg">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                        Page Not Found
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground/80 leading-relaxed">
                        Looks like this page took a gap year 👀
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full max-w-sm justify-center">
                    <Button
                        asChild
                        size="lg"
                        className="rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-14 px-8"
                    >
                        <Link href="/feed">Go to Feed</Link>
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        size="lg"
                        className="rounded-full border border-white/10 hover:bg-white/5 h-14 px-8"
                    >
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>

                <nav
                    aria-label="Machine-readable resources"
                    className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground/70"
                >
                    <Link href="/sitemap.xml" className="underline-offset-4 hover:underline">
                        XML sitemap
                    </Link>
                    <Link href="/llms.txt" className="underline-offset-4 hover:underline">
                        llms.txt
                    </Link>
                    <Link href="/openapi.json" className="underline-offset-4 hover:underline">
                        OpenAPI spec
                    </Link>
                    <Link href="/markdown" className="underline-offset-4 hover:underline">
                        Docs
                    </Link>
                </nav>

                {/* Plain-text recovery block for agents/bots */}
                <pre className="sr-only">
{`# 404 — Page Not Found (CampusZen)

The requested path does not exist on CampusZen.

## Where to look next

- XML sitemap: https://campuszen.tech/sitemap.xml
- llms.txt (agent guide): https://campuszen.tech/llms.txt
- OpenAPI spec: https://campuszen.tech/openapi.json
- Developer portal: https://campuszen.tech/developers
- Docs: https://campuszen.tech/markdown

## Public pages

- Home: https://campuszen.tech/
- Log in: https://campuszen.tech/login
- Sign up: https://campuszen.tech/signup
- Terms: https://campuszen.tech/terms
- Privacy: https://campuszen.tech/privacy

## Authenticated product

- Feed: https://campuszen.tech/feed
- Communities: https://campuszen.tech/community/<college-slug>
- Resources: https://campuszen.tech/resources`}
                </pre>
            </main>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -40px); }
        }
        @keyframes shadow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 15s ease-in-out infinite 2s;
        }
        .animate-float-reverse {
          animation: float 12s ease-in-out infinite reverse;
        }
      `,
                }}
            />
        </div>
    );
}
