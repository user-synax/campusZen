"use client"

import { useEffect, useRef } from 'react'
import { Users, FileText, BookOpen, Code } from 'lucide-react'

export default function Stats({ users = 50, posts = 120, resources = 20, codeAreas = 3 }) {
  const sectionRef = useRef(null)
  const staggerRef = useRef(null)
  const tiltRefs = useRef([])
  const cardRefs = useRef([])
  const digitRefs = useRef([])

  const STATS_CONFIG = [
    { label: 'Users', value: users, suffix: '+', icon: Users },
    { label: 'Posts', value: posts, suffix: '+', icon: FileText },
    { label: 'Resources', value: resources, suffix: '+', icon: BookOpen },
    { label: 'Code Areas', value: codeAreas, suffix: '', icon: Code },
  ]

  // transitions-dev: 02-number-pop-in — re-enter each digit with a blurred slide.
  const setDigits = (group, str) => {
    if (!group) return
    group.classList.remove('is-animating')
    group.replaceChildren()
    const chars = String(str).split('')
    chars.forEach((ch, i) => {
      const span = document.createElement('span')
      span.className = 't-digit'
      span.textContent = ch
      if (i === chars.length - 2) span.dataset.stagger = '1'
      else if (i === chars.length - 1) span.dataset.stagger = '2'
      group.appendChild(span)
    })
    void group.offsetHeight // force reflow so the animation replays
    group.classList.add('is-animating')
  }

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    const reveal = () => {
      staggerRef.current?.classList.add('is-shown')
      tiltRefs.current.forEach((wrap, i) => {
        if (!wrap) return
        // Stagger the card entrances; instant under reduced motion.
        setTimeout(() => wrap.classList.add('is-in'), reduce.matches ? 0 : i * 90)
      })
      digitRefs.current.forEach((group, i) => {
        if (!group) return
        const stat = STATS_CONFIG[i]
        const str = stat.value + stat.suffix
        setTimeout(() => setDigits(group, str), reduce.matches ? 0 : 220 + i * 90)
      })
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      reveal()
    }, { threshold: 0.2 })
    if (sectionRef.current) observer.observe(sectionRef.current)

    // transitions-dev: 19-card-tilt — pointer-tracked 3D tilt + cursor glare.
    const cleanups = []
    tiltRefs.current.forEach((wrap, i) => {
      const card = cardRefs.current[i]
      if (!wrap || !card) return

      const MAX = 12 // peak tilt in degrees at the card edges
      const reset = () => {
        wrap.classList.remove('is-hover')
        card.classList.remove('is-tilting')
        card.style.setProperty('--tilt-rx', '0deg')
        card.style.setProperty('--tilt-ry', '0deg')
      }
      const track = (e) => {
        if (reduce.matches) return
        if (e.pointerType === 'touch' || e.pointerType === 'pen') return
        const r = wrap.getBoundingClientRect()
        const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
        wrap.classList.add('is-hover')
        card.classList.add('is-tilting')
        card.style.setProperty('--tilt-ry', ((px - 0.5) * MAX).toFixed(2) + 'deg')
        card.style.setProperty('--tilt-rx', ((0.5 - py) * MAX).toFixed(2) + 'deg')
        card.style.setProperty('--tilt-gx', (px * 100).toFixed(1) + '%')
        card.style.setProperty('--tilt-gy', (py * 100).toFixed(1) + '%')
      }
      const onDown = (e) => {
        if (e.pointerType !== 'mouse') {
          try { wrap.setPointerCapture(e.pointerId) } catch (_) {}
        }
      }

      wrap.addEventListener('pointermove', track)
      wrap.addEventListener('pointerdown', onDown)
      wrap.addEventListener('pointerup', reset)
      wrap.addEventListener('pointercancel', reset)
      wrap.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') reset() })
      cleanups.push(() => {
        wrap.removeEventListener('pointermove', track)
        wrap.removeEventListener('pointerdown', onDown)
        wrap.removeEventListener('pointerup', reset)
        wrap.removeEventListener('pointercancel', reset)
        wrap.removeEventListener('pointerleave', reset)
      })
    })

    return () => {
      observer.disconnect()
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return (
    <section ref={sectionRef} className="stats-section relative py-24 px-4 bg-background">
      <div className="stats-glow" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <div ref={staggerRef} className="t-stagger">
            <p className="t-stagger-line t-stagger-line--1 stats-eyebrow">
              <span className="t-shimmer" data-text="Platform Impact">Platform Impact</span>
            </p>
            <h2 className="t-stagger-line t-stagger-line--2 stats-heading">
              Trusted by students across India
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {STATS_CONFIG.map((stat, i) => (
            <div
              key={i}
              ref={el => (tiltRefs.current[i] = el)}
              className="t-tilt stat-tilt"
            >
              <div
                ref={el => (cardRefs.current[i] = el)}
                className="t-tilt-card stat-card card-chunky"
              >
                <div className="stat-body">
                  <div className="stat-icon">
                    <stat.icon className="h-7 w-7 text-primary" />
                  </div>

                  <span
                    ref={el => (digitRefs.current[i] = el)}
                    className="t-digit-group stat-number"
                  >
                    {stat.value}{stat.suffix}
                  </span>

                  <div className="stat-label">{stat.label}</div>
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
