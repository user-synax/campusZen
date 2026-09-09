"use client"

import { useState, useCallback } from 'react'
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Pin, 
  Link2, 
  VolumeX, 
  Ban, 
  Flag, 
  Copy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { isAdmin, isFounder } from '@/lib/admin'
import ReportModal from './ReportModal'
import EditPostModal from './EditPostModal'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/components/motion/context-menu'

export default function PostOptionsMenu({ 
  post, 
  currentUser, 
  onPostDeleted, 
  onPostUpdated 
}) {
  const [showReportModal, setShowReportModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [isMuting, setIsMuting] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)

  const authorId = post.author?._id || post.author
  const isOwner = authorId && currentUser?._id && (
    authorId === currentUser._id || 
    authorId.toString() === currentUser._id.toString()
  )
  const isAdminUser = currentUser && (currentUser.role === 'admin' || isFounder(currentUser) || isAdmin(currentUser))

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/post/${post._id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }, [post._id])

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(post.content || '')
      toast.success('Text copied')
    } catch (err) {
      toast.error('Failed to copy text')
    }
  }, [post.content])

  const handleMute = useCallback(async () => {
    if (isMuting) return
    setIsMuting(true)
    try {
      const res = await fetch('/api/users/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: post.author?._id || post.author })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(`Muted @${post.author?.username}`)
    } catch (error) {
      toast.error(error.message || 'Failed to mute user')
    } finally {
      setIsMuting(false)
    }
  }, [post.author, isMuting])

  const handleBlock = useCallback(async () => {
    if (isBlocking) return
    setIsBlocking(true)
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: post.author?._id || post.author })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(`Blocked @${post.author?.username}`)
      setShowBlockConfirm(false)
    } catch (error) {
      toast.error(error.message || 'Failed to block user')
    } finally {
      setIsBlocking(false)
    }
  }, [post.author, isBlocking])

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this post?')) return
    try {
      const res = await fetch(`/api/posts/${post._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success('Post deleted')
      if (onPostDeleted) onPostDeleted(post._id)
    } catch (error) {
      toast.error(error.message || 'Failed to delete post')
    }
  }, [post._id, onPostDeleted])

  const handlePin = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${post._id}/pin`, { method: 'PATCH' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(data.isPinned ? 'Pinned to profile' : 'Unpinned')
      if (onPostUpdated) onPostUpdated({ ...post, isPinned: data.isPinned })
    } catch (error) {
      toast.error(error.message || 'Failed to pin post')
    }
  }, [post._id, post, onPostUpdated])

  const handleAdminDelete = useCallback(async () => {
    if (!window.confirm('Remove this post as admin?')) return
    try {
      const res = await fetch(`/api/admin/posts/${post._id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success('Post removed')
      if (onPostDeleted) onPostDeleted(post._id)
    } catch (error) {
      toast.error(error.message || 'Failed to remove post')
    }
  }, [post._id, onPostDeleted])

  const handleTriggerClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.bottom + 8
    const evt = new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true })
    e.currentTarget.dispatchEvent(evt)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground hover:cursor-pointer transition-colors duration-[var(--duration-fast)]"
            onClick={handleTriggerClick}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onSelect={handleCopyText}>
            <Copy className="w-4 h-4" /> Copy text
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCopyLink}>
            <Link2 className="w-4 h-4" /> Copy link
          </ContextMenuItem>

          {isOwner ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => setShowEditModal(true)}>
                <Pencil className="w-4 h-4" /> Edit post
              </ContextMenuItem>
              <ContextMenuItem onSelect={handlePin}>
                <Pin className="w-4 h-4" /> {post.isPinned ? 'Unpin' : 'Pin to profile'}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem tone="destructive" onSelect={handleDelete}>
                <Trash2 className="w-4 h-4" /> Delete post
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={handleMute} disabled={isMuting}>
                <VolumeX className="w-4 h-4" /> Mute @{post.author?.username}
              </ContextMenuItem>
              <ContextMenuItem tone="destructive" onSelect={handleBlock}>
                <Ban className="w-4 h-4" /> Block @{post.author?.username}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => setShowReportModal(true)}>
                <Flag className="w-4 h-4" /> Report post
              </ContextMenuItem>
            </>
          )}

          {isAdminUser && !isOwner && (
            <>
              <ContextMenuSeparator />
              <ContextMenuLabel>Admin</ContextMenuLabel>
              <ContextMenuItem tone="destructive" onSelect={handleAdminDelete}>
                <Trash2 className="w-4 h-4" /> Remove post
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {showReportModal && (
        <ReportModal post={post} onClose={() => setShowReportModal(false)} onSuccess={() => { setShowReportModal(false); toast.success('Report submitted') }} />
      )}
      {showEditModal && (
        <EditPostModal post={post} onClose={() => setShowEditModal(false)} onSuccess={(p) => { setShowEditModal(false); if (onPostUpdated) onPostUpdated(p); toast.success('Post updated') }} />
      )}
    </>
  )
}
