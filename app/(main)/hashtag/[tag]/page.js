"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/post/PostCard"
import PostSkeleton from "@/components/post/PostSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import useUser from "@/hooks/useUser"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel"

export default function HashtagPage({ params }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const tag = decodeURIComponent(resolvedParams.tag)
  const { user: currentUser } = useUser()
  
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchPosts = useCallback(async (pageNum, append = false) => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/hashtags/${encodeURIComponent(tag)}?page=${pageNum}&limit=20`)
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message || 'Failed to fetch hashtag posts')
      
      if (append) {
        setPosts(prev => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }
      setTotal(data.total)
      setHasMore(data.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error("Failed to fetch hashtag posts:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tag, loading])

  useEffect(() => {
     setPage(1)
     fetchPosts(1, false)
   }, [tag])

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return
    fetchPosts(page + 1, true)
  }, [page, hasMore, loading, fetchPosts])

  const handleLikePost = useCallback(async (postId) => {
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })

      if (!res.ok) throw new Error('Failed to like post')
      
      const data = await res.json()
      
      setPosts(prev => prev.map(p => {
        if (p._id === postId) {
          return {
            ...p,
            likesCount: data.likesCount,
            _isLiked: data.liked
          }
        }
        return p
      }))
      
      return data
    } catch (err) {
      console.error('Like error:', err)
      throw err
    }
  }, [])

  const { sentinelRef } = useInfiniteScroll({
    fetchMore: loadMore,
    hasMore,
    loading
  })

  return (
    <div className="flex-1 max-w-2xl border-r border-border min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-10 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">#{tag}</h1>
          <p className="text-sm text-muted-foreground">{total} posts</p>
        </div>
      </div>

      {/* Posts feed */}
      <div className="divide-y divide-border">
        {loading && page === 1 ? (
          Array(4).fill(0).map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={Hash}
              title={`No posts for #${tag}`}
              description="Be the first to use this hashtag!"
            />
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUserId={currentUser?._id} 
                currentUser={currentUser}
                onLike={handleLikePost} 
              />
            ))}
            
            <div ref={sentinelRef}>
              <InfiniteScrollSentinel 
                loading={loading} 
                hasMore={hasMore} 
                error={error} 
                onRetry={loadMore} 
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
