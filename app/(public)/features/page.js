import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/landing/Footer";
import { AgentToolkit } from "@/components/features/AgentToolkit";
import { FeatureExplorer } from "@/components/features/FeatureExplorer";
import { FeaturesFaq } from "@/components/features/FeaturesFaq";
import { FeaturesHero } from "@/components/features/FeaturesHero";
import { JumpMenu } from "@/components/features/JumpMenu";
import { StartChecklist } from "@/components/features/StartChecklist";

export const metadata = {
    title: "Features — CampusZen",
    description:
        "Explore CampusZen's student social features: campus communities, feed, leaderboards, events, study resources, clips, shop, wallet, and a full AI-agent toolkit.",
};

/**
 * Features page.
 *
 * Stays a server component: the copy and metadata are static, and each section
 * below is its own client island so only the interactive parts ship JS. The page
 * content lives in `components/features/data.js`, which the islands import
 * directly — the lucide icons in it are component references, and those can't be
 * passed from a server component to a client one as props.
 *
 * `t-features` scopes every retuned motion variable in `app/transitions.css` to
 * this subtree, so the explorer's tab pill can read as a brand tint while the
 * navbar's stays neutral without either one touching `:root`.
 */
export default function FeaturesPage() {
    return (
        <>
            {/* Without JS the staggered rows would never receive `.is-shown` and
                the page would render blank. This makes the pre-reveal state the
                visible one instead, so the content is readable either way. */}
            <noscript>
                <style>{`.t-stagger-line{opacity:1!important;transform:none!important;filter:none!important}
.t-stream-w{opacity:1!important;filter:none!important}`}</style>
            </noscript>

            <main className="t-features pb-24 pt-28">
                <FeaturesHero />
                <FeatureExplorer />
                <AgentToolkit />
                <StartChecklist />
                <FeaturesFaq />

                <section className="mx-auto max-w-container px-4">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border bg-card p-10 text-center shadow-[var(--shadow-hard)]">
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Ready to join your campus?
                        </h2>
                        <p className="max-w-xl text-sm text-muted-foreground">
                            Sign up free, pick your college, and start connecting
                            with students across India.
                        </p>
                        <Link
                            href="/signup"
                            className="pill-chunky mt-2 inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                        >
                            Get started <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                <JumpMenu />
            </main>
            <Footer />
        </>
    );
}
