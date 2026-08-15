"use client"

import { useLayoutEffect, useRef } from 'react'
import { gsap, shouldAnimate } from '@/lib/gsap-config'
import { Users, FileText, BookOpen, Code } from 'lucide-react'

export default function Stats({ users = 50, posts = 120, resources = 20, codeAreas = 3 }) {
  const gridRef = useRef(null)
  const cardRefs = useRef([])
  const numberRefs = useRef([])

  const STATS_CONFIG = [
    { label: 'Users', value: users, suffix: '+', icon: Users },
    { label: 'Posts', value: posts, suffix: '+', icon: FileText },
    { label: 'Resources', value: resources, suffix: '+', icon: BookOpen },
    { label: 'Code Areas', value: codeAreas, suffix: '', icon: Code },
  ]

  useLayoutEffect(() => {
    if (!shouldAnimate()) {
      // No animation — just show final values, cards render at full opacity
      numberRefs.current.forEach((el, i) => {
        if (el && STATS_CONFIG[i]) el.textContent = STATS_CONFIG[i].value + STATS_CONFIG[i].suffix
      })
      return
    }

    const cards = cardRefs.current.filter(Boolean)
    // Set the hidden starting state synchronously (pre-paint) so there's no flash
    gsap.set(cards, { opacity: 0, y: 24 })

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()

      gsap.to(cards, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.1,
      })

      STATS_CONFIG.forEach((stat, i) => {
        const el = numberRefs.current[i]
        if (!el) return

        const obj = { val: 0 }
        gsap.to(obj, {
          val: stat.value,
          duration: 2.5,
          delay: 0.15,
          ease: 'power3.out',
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + stat.suffix
          },
          onComplete: () => {
            el.textContent = stat.value + stat.suffix
          }
        })
      })
    }, { threshold: 0.2 })

    if (gridRef.current) observer.observe(gridRef.current)
    return () => observer.disconnect()
  }, [users, posts, resources, codeAreas])

  return (
    <section className="py-24 px-4 relative overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Platform Impact
          </h2>
          <p className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
            Trusted by students across India
          </p>
        </div>

        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {STATS_CONFIG.map((stat, i) => (
            <div
              key={i}
              ref={el => (cardRefs.current[i] = el)}
              className="card-chunky relative p-6 bg-card transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/25 flex items-center justify-center">
                  <stat.icon className="w-7 h-7 text-primary" />
                </div>

                <div
                  className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tighter"
                  ref={el => (numberRefs.current[i] = el)}
                >
                  {stat.value}{stat.suffix}
                </div>

                <div className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}