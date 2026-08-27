"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
    Check,
    Sparkles,
    ArrowRight,
    ArrowUpRight,
    Building2,
    Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PLANS = [
    {
        name: "Free",
        description: "For every verified student.",
        numeric: true,
        priceMonthly: 0,
        priceAnnual: 0,
        cadenceMonthly: "/forever",
        cadenceAnnual: "/forever",
        features: [
            { text: "Join campus & interest communities" },
            { text: "Post, react, and bookmark" },
            { text: "Browse events and RSVP" },
            { text: "Access study resources" },
            { text: "Clips, chats, and connect" },
            { text: "Public API & agent access" },
        ],
        cta: "Create free account",
        ctaHref: "/signup",
        featured: false,
    },
    {
        name: "Pro",
        description: "For students who want more from their profile.",
        numeric: true,
        priceMonthly: 49,
        priceAnnual: 490,
        cadenceMonthly: "/month",
        cadenceAnnual: "/year",
        features: [
            { text: "Everything in Free" },
            { text: "Create polls in posts" },
            { text: "Upload more media per post", tip: "Up to 10 images and 2 videos per post." },
            { text: "Profile & theme customization", tip: "Custom bio, accent color, and avatar frame." },
            { text: "Premium avatar frames" },
            { text: "Priority in Connect suggestions", tip: "Surfaced higher when peers browse Connect." },
        ],
        cta: "Go Pro",
        ctaHref: "/billing",
        featured: true,
    },
    {
        name: "College / Enterprise",
        description: "For institutions and large communities.",
        numeric: false,
        priceLabel: "Custom",
        cadence: "",
        features: [
            { text: "Everything in Pro" },
            { text: "Shared college workspace" },
            { text: "Branded community pages" },
            { text: "Admin controls & analytics" },
            { text: "SSO / roster sync (on request)" },
            { text: "Dedicated support" },
        ],
        cta: "Contact us",
        ctaHref: "/about",
        featured: false,
    },
]

const FAQS = [
    {
        q: "Is CampusZen really free for students?",
        a: "Yes. Students can join communities, post, react, bookmark, and access study resources for free. A Pro tier adds polls, more media, and customization.",
    },
    {
        q: "What does Pro unlock?",
        a: "Pro unlocks post polls, higher media limits, profile and theme customization, premium avatar frames, and priority placement in Connect suggestions.",
    },
    {
        q: "How do I pay?",
        a: "You can upgrade from the in-app billing screen, where promotional codes can be redeemed. College and enterprise plans are quoted per institution.",
    },
    {
        q: "Do agents pay to use the API?",
        a: "No. The public API, OpenAPI spec, MCP servers, and llms.txt are available to agents without a paywall. Authenticated actions use the same student session.",
    },
]

function PlanCTA({ href, children, featured }) {
    const [hover, setHover] = useState(false)
    return (
        <Link
            href={href}
            className={cn(
                "btn-chunky plan-cta inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold",
                featured
                    ? "bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
            )}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
        >
            <span>{children}</span>
            <span className="t-icon-swap" data-state={hover ? "b" : "a"}>
                <ArrowRight className="t-icon h-4 w-4" data-icon="a" />
                <ArrowUpRight className="t-icon h-4 w-4" data-icon="b" />
            </span>
        </Link>
    )
}

function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="t-acc faq-item card-chunky" data-open={open ? "true" : "false"}>
            <button
                className="t-acc-head"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <span>{q}</span>
                <span className="t-acc-chevron" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6.5L8 10.5L12 6.5" />
                    </svg>
                </span>
            </button>
            <div className="t-acc-panel">
                <div className="t-acc-panel-inner">
                    <p>{a}</p>
                </div>
            </div>
        </div>
    )
}

export default function PricingView() {
    const staggerRef = useRef(null)
    const wrapRefs = useRef([])
    const cardRefs = useRef([])
    const digitRefs = useRef([])
    const tabsRef = useRef(null)
    const pillRef = useRef(null)

    const [billing, setBilling] = useState("monthly")

    // transitions-dev: 02-number-pop-in — re-enter each price digit with a blur.
    const setDigits = (group, str) => {
        if (!group) return
        group.classList.remove("is-animating")
        group.replaceChildren()
        const chars = String(str).split("")
        chars.forEach((ch, i) => {
            const span = document.createElement("span")
            span.className = "t-digit"
            span.textContent = ch
            if (i === chars.length - 2) span.dataset.stagger = "1"
            else if (i === chars.length - 1) span.dataset.stagger = "2"
            group.appendChild(span)
        })
        void group.offsetHeight
        group.classList.add("is-animating")
    }

    const revealPrices = (b) => {
        PLANS.forEach((p, i) => {
            const g = digitRefs.current[i]
            if (!g || !p.numeric) return
            const val = b === "monthly" ? p.priceMonthly : p.priceAnnual
            setDigits(g, `₹${val}`)
        })
    }

    // transitions-dev: 16-tabs-sliding — slide the pill to the active tab.
    const movePill = (animate) => {
        const bar = tabsRef.current
        const pill = pillRef.current
        if (!bar || !pill) return
        const tabs = [...bar.querySelectorAll(".t-tab")]
        const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]
        if (!active) return
        if (!animate) {
            const prev = pill.style.transition
            pill.style.transition = "none"
            pill.style.transform = `translateX(${active.offsetLeft}px)`
            pill.style.width = `${active.offsetWidth}px`
            void pill.offsetWidth
            pill.style.transition = prev
        } else {
            pill.style.transform = `translateX(${active.offsetLeft}px)`
            pill.style.width = `${active.offsetWidth}px`
        }
    }

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")

        const reveal = () => {
            staggerRef.current?.classList.add("is-shown")
            wrapRefs.current.forEach((w, i) => {
                if (!w) return
                setTimeout(() => w.classList.add("is-in"), reduce.matches ? 0 : i * 110)
            })
            setTimeout(() => revealPrices(billing), reduce.matches ? 0 : 220)
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            observer.disconnect()
            reveal()
        }, { threshold: 0.15 })
        if (staggerRef.current) observer.observe(staggerRef.current)

        // transitions-dev: 19-card-tilt — pointer-tracked 3D tilt + cursor glare.
        const cleanups = []
        wrapRefs.current.forEach((wrap, i) => {
            const card = cardRefs.current[i]
            if (!wrap || !card) return

            const MAX = 9
            const reset = () => {
                wrap.classList.remove("is-hover")
                card.classList.remove("is-tilting")
                card.style.setProperty("--tilt-rx", "0deg")
                card.style.setProperty("--tilt-ry", "0deg")
            }
            const track = (e) => {
                if (reduce.matches) return
                if (e.pointerType === "touch" || e.pointerType === "pen") return
                const r = wrap.getBoundingClientRect()
                const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
                const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
                wrap.classList.add("is-hover")
                card.classList.add("is-tilting")
                card.style.setProperty("--tilt-ry", ((px - 0.5) * MAX).toFixed(2) + "deg")
                card.style.setProperty("--tilt-rx", ((0.5 - py) * MAX).toFixed(2) + "deg")
                card.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%")
                card.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%")
            }
            const onDown = (e) => {
                if (e.pointerType !== "mouse") {
                    try { wrap.setPointerCapture(e.pointerId) } catch (_) {}
                }
            }
            wrap.addEventListener("pointermove", track)
            wrap.addEventListener("pointerdown", onDown)
            wrap.addEventListener("pointerup", reset)
            wrap.addEventListener("pointercancel", reset)
            wrap.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") reset() })
            cleanups.push(() => {
                wrap.removeEventListener("pointermove", track)
                wrap.removeEventListener("pointerdown", onDown)
                wrap.removeEventListener("pointerup", reset)
                wrap.removeEventListener("pointercancel", reset)
                wrap.removeEventListener("pointerleave", reset)
            })
        })

        // Slide the billing pill to its starting tab, then track resize.
        movePill(false)
        const onResize = () => movePill(false)
        window.addEventListener("resize", onResize)

        return () => {
            observer.disconnect()
            window.removeEventListener("resize", onResize)
            cleanups.forEach((fn) => fn())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Re-slide the pill and re-pop the prices whenever billing changes.
    useEffect(() => {
        movePill(true)
        revealPrices(billing)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [billing])

    return (
        <main className="pt-28 pb-24">
            {/* Hero */}
            <section className="pricing-hero relative overflow-hidden">
                <div className="pricing-glow" aria-hidden="true" />
                <div className="relative z-10 mx-auto max-w-container px-4 text-center">
                    <div ref={staggerRef} className="t-stagger">
                        <p className="t-stagger-line t-stagger-line--1 stats-eyebrow">
                            <span className="t-shimmer" data-text="Pricing">
                                Pricing
                            </span>
                        </p>
                        <h1 className="t-stagger-line t-stagger-line--2 stats-heading text-balance">
                            Free for students. Pro when you want more.
                        </h1>
                    </div>
                    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        Start free, upgrade for polls and customization, or bring
                        CampusZen to your whole college.
                    </p>
                </div>
            </section>

            {/* Billing toggle */}
            <section className="mx-auto mt-12 max-w-container px-4">
                <div className="flex flex-col items-center">
                    <div className="pricing-toggle" ref={tabsRef}>
                        <div className="t-tabs" role="tablist" aria-label="Billing period">
                            <span className="t-tabs-pill" ref={pillRef} aria-hidden="true" />
                            <button
                                className="t-tab"
                                role="tab"
                                aria-selected={billing === "monthly"}
                                onClick={() => setBilling("monthly")}
                            >
                                Monthly
                            </button>
                            <button
                                className="t-tab"
                                role="tab"
                                aria-selected={billing === "annual"}
                                onClick={() => setBilling("annual")}
                            >
                                Annual
                            </button>
                        </div>
                    </div>
                    <p className="pricing-billing-note" aria-live="polite">
                        {billing === "annual" ? "Save 2 months with annual billing" : " "}
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section className="mx-auto mt-10 max-w-container px-4">
                <div className="pricing-grid grid grid-cols-1 gap-6 lg:grid-cols-3 md:gap-8">
                    {PLANS.map((plan, i) => (
                        <div
                            key={plan.name}
                            ref={el => (wrapRefs.current[i] = el)}
                            className="t-tilt pricing-tilt"
                        >
                            {plan.featured && (
                                <span className="t-badge" data-open="true">
                                    <span className="t-badge-dot">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Most popular
                                    </span>
                                </span>
                            )}
                            <div
                                ref={el => (cardRefs.current[i] = el)}
                                className={cn(
                                    "t-tilt-card plan-card card-chunky overflow-hidden",
                                    plan.featured && "plan-card--featured",
                                )}
                            >
                                <h3 className="plan-name">{plan.name}</h3>
                                <p className="plan-desc">{plan.description}</p>

                                <div className="plan-price">
                                    {plan.numeric ? (
                                        <span
                                            ref={el => (digitRefs.current[i] = el)}
                                            className="t-digit-group price-digits"
                                        >
                                            {`₹${billing === "monthly" ? plan.priceMonthly : plan.priceAnnual}`}
                                        </span>
                                    ) : (
                                        <span className="price-digits">{plan.priceLabel}</span>
                                    )}
                                    <span className="plan-cadence">
                                        {plan.numeric
                                            ? billing === "monthly"
                                                ? plan.cadenceMonthly
                                                : plan.cadenceAnnual
                                            : plan.cadence}
                                    </span>
                                </div>

                                <ul className="plan-features">
                                    {plan.features.map((f) => (
                                        <li key={f.text} className="plan-feature">
                                            <Check className="h-4 w-4" />
                                            <span>{f.text}</span>
                                            {f.tip && (
                                                <span className="t-tt-wrap">
                                                    <button
                                                        className="t-tt-trigger"
                                                        aria-label="More info"
                                                        aria-describedby={`tip-${i}-${f.text.slice(0, 6)}`}
                                                    >
                                                        <Info className="h-4 w-4" />
                                                    </button>
                                                    <span
                                                        className="t-tt"
                                                        role="tooltip"
                                                        id={`tip-${i}-${f.text.slice(0, 6)}`}
                                                    >
                                                        {f.tip}
                                                    </span>
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <PlanCTA href={plan.ctaHref} featured={plan.featured}>
                                    {plan.cta}
                                </PlanCTA>

                                <div className="t-tilt-glare" aria-hidden="true" />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-center text-xs text-muted-foreground">
                    Prices in INR. Promotional codes can be redeemed in-app at
                    /billing. College plans are quoted per institution.
                </p>
            </section>

            {/* FAQ */}
            <section className="mx-auto mt-24 max-w-3xl px-4">
                <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Frequently asked questions
                </h2>
                <div className="mt-10 space-y-4">
                    {FAQS.map((item) => (
                        <FaqItem key={item.q} q={item.q} a={item.a} />
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="mx-auto mt-24 max-w-container px-4">
                <div className="pricing-cta-card flex flex-col items-center gap-4 p-10 text-center">
                    <Building2 className="h-8 w-8 text-primary" />
                    <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-balance">
                        Bring CampusZen to your college
                    </h2>
                    <p className="max-w-xl text-sm text-muted-foreground">
                        Workspaces, branded pages, and admin analytics for
                        institutions. Talk to us about a campus plan.
                    </p>
                    <Link
                        href="/about"
                        className="btn-chunky mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                    >
                        Get in touch <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    )
}
