version: alpha
name: CampusZen Design System
description: "CampusZen — student-first social platform for Indian colleges. Dark canvas (#090909) with white pill CTAs, charcoal cards (#141414/#1c1c1c), hairline #262626, and single accent #4ba9e1 for links/focus. Motion tokens drive all micro-interactions; Tailwind 4 + @tailwindcss/postcss with CSS @theme. No Framer gradients."

colors:
  canvas: "#090909"
  surface-1: "#141414"
  surface-2: "#1c1c1c"
  hairline: "#262626"
  ink: "#ffffff"
  ink-muted: "#999999"
  accent-blue: "#4ba9e1"
  accent-deep: "#3a8fcc"
  success: "#22c55e"
  background-light: "hsl(0 0% 100%)"
  foreground-light: "hsl(0 0% 0%)"

typography:
  display:
    fontFamily: GT Walsheim Medium
    fallback: Inter, system-ui, sans-serif
    token: "{--font-gilroy}"
  body:
    fontFamily: Inter Variable
    token: "{--font-inter}"
    size: 13px
    lineHeight: 1.5
    letterSpacing: -0.01em
    features: '"rlig" 1, "calt" 1'

motion:
  duration-stagger: 40ms
  duration-micro: 80ms
  duration-quick: 150ms
  duration-fast: 250ms
  duration-medium: 350ms
  duration-slow: 400ms
  duration-very-slow: 500ms
  ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)
  ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1)
  distance-micro: 4px
  distance-small: 6px
  distance-medium: 12px
  blur-small: 2px

rounded:
  cards: 20px
  buttons: 100px
  pills: 9999px
  xs: 4px
  sm: 6px
  md: 10px
  lg: 15px
  xl: 20px
  xxl: 30px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 15px
  lg: 20px
  xl: 30px
  xxl: 40px
  section: 96px

shadows:
  hard: 3px 3px 0px hsl(var(--shadow-ink) / 0.14)
  hard-hover: 4px 4px 0px hsl(var(--shadow-ink) / 0.18)
  md: rgba(255,255,255,0.10) 0 0 0 0.5px, rgba(0,0,0,0.25) 0 10px 30px 0

components:
  button-primary:
    background: "{colors.primary}" # white pill on dark, black on light
    text: "{colors.primary-foreground}"
    rounded: 100px
    padding: 10px 15px
  button-secondary:
    background: "{colors.surface-1}"
    rounded: 100px
  card:
    background: hsl(var(--card))
    border: 2px solid hsl(var(--border))
    rounded: 20px
    shadow: var(--shadow-md)
  card-chunky:
    border: 2px solid hsl(var(--border))
    rounded: 20px
    shadow: var(--shadow-hard)
  chip-chunky:
    border: 2px solid transparent
    rounded: 14px
  input:
    background: hsl(var(--card))
    border: hsl(var(--border))
    rounded: 10px

## Overview

CampusZen is dark-first. Canvas `#090909` hosts white display type (GT Walsheim Medium) and Inter Variable body. One accent `#4ba9e1` for hyperlinks/focus — never as surface. Cards lift via `surface-1` (#141414) → `surface-2` (#1c1c1c) + hairline #262626. Light mode inverts to white canvas with black pills. Motion uses tokens `--duration-*`/`--ease-*` for staggered reveals, tilt, shimmer, and reduced-motion support.

## Colors

- **Canvas #090909** / **Surface-1 #141414** / **Surface-2 #1c1c1c** / **Hairline #262626** — dark stack.
- **Ink #ffffff** / **Ink-muted #999999** — hierarchy via muted, not weight.
- **Accent #4ba9e1** — links, focus rings, selection; signal only.
- **Semantic success #22c55e**.

Light tokens in `app/globals.css:86` (`:root` --background 0 0% 100%), dark in `.dark` (`app/globals.css:122` --background 0 0% 3.5%).

## Typography

- **Display:** GT Walsheim Medium via `var(--font-gilroy)`; fallbacks Inter/system-ui.
- **Body:** Inter Variable via `var(--font-inter)` 13px/1.5/-0.01em, `rlig`+`calt`.
- Uses Tailwind 4 `@theme` mapping (`app/globals.css:53` --color-background → hsl(var(--background))).

## Motion

Tokens in `app/globals.css:6` (`:root` --duration-*, --ease-*, --distance-*, --blur-*). Sections (stats/showcase/pricing/about) use `is-in` entrance (translateY 24px + opacity) with `--duration-slow`/`--ease-smooth-out`, plus `t-stagger`, `t-tilt`, `t-shimmer` from `app/transitions.css`.

## Layout

- Base 14px (14.5px @1024px) `app/globals.css:162`.
- Grid: `max-w-container 1200px`, `p-2.5` nav, `rounded-[20px]` cards, `rounded-full` pills.
- Custom scrollbar 6px, thin Firefox variant.

## Components

- **Pill buttons** (`button-primary` white pill, `button-secondary` charcoal) — only shapes; no ghost.
- **Cards** (`card-chunky`, `stat-card`, `plan-card`) — 2px border, hard shadow, hover lift to `hsl(var(--primary)/0.3)`.
- **Docs prose** (`.docs-prose` in `app/globals.css:588`) — markdown rendering.
- **Sections:** stats glow, showcase skeleton, pricing toggle (`t-tabs`), about values — now in `app/styles/campus-sections.css` (split from `globals.css` for bundle).

## Do's and Don'ts

- Do use `hsl(var(--card))`/`hsl(var(--border))` via `@theme`; don't hardcode hex outside tokens.
- Do use `#4ba9e1` only for links/focus; don't as CTA fill.
- Do keep pill `rounded:100px`; don't square CTAs.
- Do import tokens via `@import "tailwindcss"` → `@theme`; don't duplicate in `tailwind.config.js`.

## Responsive

- Tablet 810px collapse 4-up →2-up →1-up; nav hamburger <810px.
- Tap targets ≥44px (`button-primary` 10px vertical + 14px line-height).
- `prefers-reduced-motion` disables parallax/shimmer in `app/globals.css:219`.

## Iteration Guide

1. Edit tokens in `app/globals.css:6` or `app/styles/campus-sections.css`; keep `tailwind.config.js:1` minimal (App Router, Tailwind 4).
2. Reference `{colors.*}` / `{motion.*}` / `{rounded.*}` tokens — not raw hex.
3. Run `npx @google/design.md lint DESIGN.md` — no `orphaned-tokens`.

## Known Gaps

- GT Walsheim is proprietary; fallback Inter at 600 weight with -0.02em tracking.
- No violet gradients — `--gradient-*` set to `none` (`app/globals.css:41`).
