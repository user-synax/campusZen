"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const SHOWCASE_ITEMS = [
    {
        src: "/p1.png",
        alt: "Student Feed feature showing campus posts",
        title: "Student Feed",
        description: "Stay connected with your campus community in real-time.",
    },
    {
        src: "/p2.png",
        alt: "Resource Vault showing study materials",
        title: "Resource Vault",
        description: "Access verified notes, PYQs, and formula sheets.",
    },
    {
        src: "/p3.png",
        alt: "Campus Communities showing code areas",
        title: "Campus Communities",
        description: "Join interest-based communities and code areas.",
    },
]

export default function ProductShowcase() {
    const sectionRef = useRef(null)
    const staggerRef = useRef(null)
    const wrapRefs = useRef([])
    const cardRefs = useRef([])
    const skelRefs = useRef([])

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")

        const reveal = () => {
            staggerRef.current?.classList.add("is-shown")
            wrapRefs.current.forEach((wrap, i) => {
                if (!wrap) return
                setTimeout(() => wrap.classList.add("is-in"), reduce.matches ? 0 : i * 110)
            })
            // Skeleton reveal for any image that already finished loading.
            skelRefs.current.forEach((skel) => {
                const img = skel?.querySelector("img")
                if (skel && img?.complete) skel.classList.add("is-revealed")
            })
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return
            observer.disconnect()
            reveal()
        }, { threshold: 0.15 })
        if (sectionRef.current) observer.observe(sectionRef.current)

        // transitions-dev: 19-card-tilt — pointer-tracked 3D tilt + cursor glare.
        const cleanups = []
        wrapRefs.current.forEach((wrap, i) => {
            const card = cardRefs.current[i]
            if (!wrap || !card) return

            const MAX = 10
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

        // Safety: if an image is slow, reveal its skeleton anyway.
        const fallback = setTimeout(() => {
            skelRefs.current.forEach((skel) => skel?.classList.add("is-revealed"))
        }, 1600)

        return () => {
            observer.disconnect()
            clearTimeout(fallback)
            cleanups.forEach((fn) => fn())
        }
    }, [])

    return (
        <section ref={sectionRef} className="py-24 px-4 bg-background">
            <div className="max-w-6xl mx-auto">
                <div className="mb-16 text-center">
                    <div ref={staggerRef} className="t-stagger">
                        <p className="t-stagger-line t-stagger-line--1 stats-eyebrow">
                            <span className="t-shimmer" data-text="See it in action">
                                See it in action
                            </span>
                        </p>
                        <h2 className="t-stagger-line t-stagger-line--2 stats-heading">
                            CampusZen in action
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
                    {SHOWCASE_ITEMS.map((item, i) => (
                        <div
                            key={item.title}
                            ref={el => (wrapRefs.current[i] = el)}
                            className="t-tilt showcase-tilt"
                        >
                            <div
                                ref={el => (cardRefs.current[i] = el)}
                                className="t-tilt-card showcase-card card-chunky overflow-hidden"
                            >
                                <div
                                    ref={el => (skelRefs.current[i] = el)}
                                    className="t-skel showcase-frame"
                                >
                                    <div className="t-skel-skeleton is-pulsing">
                                        <div className="showcase-skel-fill" />
                                    </div>
                                    <div className="t-skel-content">
                                        <Image
                                            src={item.src}
                                            alt={item.alt}
                                            fill
                                            sizes="(min-width: 768px) 33vw, 100vw"
                                            className="object-cover"
                                            onLoad={() =>
                                                skelRefs.current[i]?.classList.add("is-revealed")
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="showcase-meta">
                                    <h3 className="showcase-title">{item.title}</h3>
                                    <p className="showcase-desc">{item.description}</p>
                                </div>

                                <div className="t-tilt-glare" aria-hidden="true" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
