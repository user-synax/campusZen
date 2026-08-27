"use client"

// Dynamically import the client-only Hero with no SSR
import Hero from './Hero'

export default function HeroClient({ stats }) {
  return <Hero stats={stats} />
}
