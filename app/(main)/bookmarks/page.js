"use client"

import { useState, useEffect, useCallback } from "react"
import { Bookmark, Lock } from "lucide-react"
import PostCard from "@/components/post/PostCard"
import PostSkeleton from "@/components/post/PostSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/button"
import useUser from "@/hooks/useUser"
import { toast } from "sonner"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel"
import { useTabData } from "@/hooks/useTabData"
import clientCache from "@/lib/client-cache"

export default function BookmarksPage() {
  const { user: currentUser, loading: userLoading } = useUser()
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)

  const { 
    data: initialPosts, 
    loading: initialLoading, 
    fetchData: fetchInitialBookmarks,
    setData: setTabData
  } = useTabData(
    'bookmarks',
    async () => {
      const res = await fetch(`/api/bookmarks?page=1&limit=20`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to fetch bookmarks")
      setHasMore(data.hasMore)
      setTotal(data.total)
      return data.posts
    },
    { ttl: 60 * 1000 } // 1 minute
  )

  const [posts, setPosts] = useState(initialPosts || [])

  useEffect(() => {
    if (initialPosts) {
      setPosts(initialPosts)
    }
  }, [initialPosts])

  const fetchMoreBookmarks = useCallback(async (pageNum) => {
    if (userLoading || initialLoading) return;
    
    try {
      const res = await fetch(`/api/bookmarks?page=${pageNum}&limit=20`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message || "Failed to fetch bookmarks")
      
      setPosts(prev => [...prev, ...data.posts])
      setHasMore(data.hasMore)
      setTotal(data.total)
      setPage(pageNum)
      
      // Update cache with new posts
      const cached = clientCache.get(['tab', 'bookmarks'])
      if (cached) {
        clientCache.set(['tab', 'bookmarks'], [...cached, ...data.posts], 60 * 1000)
      }
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err)
      toast.error("Failed to load bookmarks")
    }
  }, [userLoading, initialLoading])

  useEffect(() => {
    if (!userLoading && !initialPosts) {
      fetchInitialBookmarks()
    }
  }, [userLoading, initialPosts, fetchInitialBookmarks])

  const loadMore = useCallback(() => {
    if (!hasMore || initialLoading) return
    fetchMoreBookmarks(page + 1)
  }, [page, hasMore, initialLoading, fetchMoreBookmarks])

  const { sentinelRef } = useInfiniteScroll({
    fetchMore: loadMore,
    hasMore,
    loading: initialLoading
  })

  // Handle unbookmarking on the bookmarks page
  const handleBookmarkToggle = (postId, bookmarked) => {
    if (!bookmarked) {
      // If unbookmarked, remove from list immediately (optimistic)
      const newPosts = posts.filter(p => p._id !== postId)
      setPosts(newPosts)
      setTabData(newPosts)
      clientCache.set(['tab', 'bookmarks'], newPosts, 60 * 1000)
      setTotal(prev => Math.max(0, prev - 1))
    }
  }

  const handleDeletePost = (postId) => {
    const newPosts = posts.filter(p => p._id !== postId)
    setPosts(newPosts)
    setTabData(newPosts)
    clientCache.set(['tab', 'bookmarks'], newPosts, 60 * 1000)
    setTotal(prev => Math.max(0, prev - 1))
  }

  const handleLikePost = useCallback(async (postId) => {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      if (!res.ok) throw new Error('Failed to like post')
      
      const data = await res.json()
      
      const newPosts = posts.map(p => {
        if (p._id === postId) {
          return {
            ...p,
            likesCount: data.likesCount,
            _isLiked: data.liked
          }
        }
        return p
      })
      setPosts(newPosts)
      setTabData(newPosts)
      clientCache.set(['tab', 'bookmarks'], newPosts, 60 * 1000)
      
      return data
    } catch (err) {
      console.error('Like error:', err)
      throw err
    }
  }, [posts, setTabData])

  return (
    <div className="flex-1 max-w-2xl border-r border-border min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-10">
        <h1 className="text-xl font-bold">Bookmarks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Only visible to you</p>
      </div>

      {/* Private notice */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-accent/50 border border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="w-3 h-3" />
          Your bookmarks are private. No one else can see this page.
        </p>
      </div>

      {/* Bookmarked posts */}
      <div className="mt-2">
        {initialLoading && posts.length === 0 ? (
          Array(3).fill(0).map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="mt-20">
            <EmptyState
              icon={Bookmark}
              title="No saved posts yet"
              description="Tap the bookmark icon on any post to save it here for later."
            />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  currentUserId={currentUser?._id} 
                  currentUser={currentUser}
                  onBookmarkToggle={handleBookmarkToggle}
                  onDelete={handleDeletePost}
                  onLike={handleLikePost}
                />
              ))}
            </div>
            
            <div ref={sentinelRef}>
              <InfiniteScrollSentinel 
                loading={initialLoading} 
                hasMore={hasMore} 
                error={null} 
                onRetry={loadMore} 
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
