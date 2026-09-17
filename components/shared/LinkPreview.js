"use client"

import { Link } from "lucide-react"

export default function LinkPreview({ url, clickable = true }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace('www.', '')
  } catch {
    hostname = url;
  }

  const content = (
    <div className="post-insert inline-flex max-w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:border-[#4ba9e1]/40">
      <Link className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium truncate">{hostname}</span>
    </div>
  )

  if (clickable) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block max-w-full"
      >
        {content}
      </a>
    )
  }

  return content
}

