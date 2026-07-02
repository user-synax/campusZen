"use client"

import { useState, useCallback } from 'react'
import { Share2, Link2, X, Twitter, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://campuszen.tech'

export default function ShareButton({ post, size = "sm" }) {
  const [open, setOpen] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const getShareUrl = useCallback(() => {
    return `${APP_URL}/post/${post._id}`
  }, [post._id])

  const getShareText = useCallback(() => {
    const content = post.content || ''
    if (content.length <= 100) return content
    return content.slice(0, 97) + '...'
  }, [post.content])

  const getAuthorName = useCallback(() => {
    return post.author?.name || 'Someone'
  }, [post.author])

  const trackShare = useCallback(async () => {
    try {
      await fetch(`/api/posts/${post._id}/share`, {
        method: 'POST'
      })
    } catch (err) {
      console.error('Share tracking failed:', err)
    }
  }, [post._id])

  const handleNativeShare = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!navigator.share) return

    setIsSharing(true)
    try {
      await navigator.share({
        title: `${getAuthorName()} on CampusZen`,
        text: getShareText(),
        url: getShareUrl()
      })
      await trackShare()
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Native share failed:', err)
      }
    } finally {
      setIsSharing(false)
    }
  }, [getAuthorName, getShareText, getShareUrl, trackShare])

  const handleCopyLink = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(getShareUrl())
      toast.success('Link copied! 🔗')
      await trackShare()
      setOpen(false)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }, [getShareUrl, trackShare])

  const handleTwitterShare = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const text = encodeURIComponent(`${getShareText()} - via @CampusZen`)
    const url = encodeURIComponent(getShareUrl())
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
    trackShare()
    setOpen(false)
  }, [getShareText, getShareUrl, trackShare])

  const handleWhatsAppShare = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const text = encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    trackShare()
    setOpen(false)
  }, [getShareText, getShareUrl, trackShare])

  const iconSize = size === "md" ? "w-5 h-5" : "w-4 h-4"
  const buttonPadding = size === "md" ? "p-2 px-4" : "p-2"

  const shareCount = post.shareCount || 0

  if (typeof window !== 'undefined' && navigator.share) {
    return (
      <button
        onClick={handleNativeShare}
        disabled={isSharing}
        className={`flex items-center gap-1.5 text-xs transition-colors hover:text-green-400 hover:bg-green-400/10 ${buttonPadding} rounded-full`}
      >
        <Share2 className={iconSize} />
        {shareCount > 0 && (
          <span className="font-medium">{shareCount}</span>
        )}
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className={`flex items-center gap-1.5 text-xs transition-all hover:text-green-400 hover:bg-green-400/10 ${buttonPadding} rounded-full active:scale-95`}
        >
          <Share2 className={iconSize} />
          {shareCount > 0 && (
            <span className="font-medium">{shareCount}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        side="bottom"
        sideOffset={8}
        className="w-56 p-2 bg-background/95 backdrop-blur-md border border-border shadow-xl rounded-xl"
      >
        <div className="space-y-1">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">Copy Link</span>
          </button>
          
          <button
            onClick={handleTwitterShare}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-black/80 flex items-center justify-center">
              <Twitter className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">Share on X</span>
          </button>
          
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-medium">WhatsApp</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}