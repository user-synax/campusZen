"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Reusable Logo component for CampusZen.
 * @param {Object} props
 * @param {string} props.className - Additional classes for the container
 * @param {boolean} props.showText - Whether to show the "CampusZen" text
 * @param {string} props.size - Size of the icon ('sm', 'md', 'lg')
 * @param {string} props.href - Destination link (defaults to /feed)
 */
export default function Logo({
  className,
  showText = true,
  size = "md",
  href = "/"
}) {

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl"
  }

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 group transition-all duration-300", className)}
    >
      <img src="/campusZen.png" alt="CampusZen Logo" className="w-10 h-10" />
      {showText && (
        <span className={cn(
          "font-black tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary",
          textSizes[size] || textSizes.md
        )}>
          Campus<span className="text-primary group-hover:text-foreground transition-colors duration-300">Zen</span>
        </span>
      )}
    </Link>
  )
}
