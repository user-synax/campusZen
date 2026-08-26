"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { Button } from "@/components/ui/button"
import PostComposer from "@/components/post/PostComposer"
import PostCard from "@/components/post/PostCard"
import PostSkeleton from "@/components/post/PostSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import { usePosts } from "@/hooks/usePosts"
import useUser from "@/hooks/useUser"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel"
import { formatCollegeName } from "@/utils/formatters"

export default function CollegeCommunityPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useUser()
  
  const collegeSlug = params.college
  const displayName = formatCollegeName(collegeSlug)
  
  const { 
    posts, 
    loading: postsLoading, 
    error: postsError,
    hasMore, 
    loadMore, 
    addPost, 
    removePost, 
    updatePostLike 
  } = usePosts({ community: displayName })

  const { sentinelRef } = useInfiniteScroll({
    fetchMore: loadMore,
    hasMore,
    loading: postsLoading
  })

  const handleDeletePost = useCallback((postId) => {
    removePost(postId)
  }, [removePost])

  const handleLikePost = useCallback(async (postId) => {
    return await updatePostLike(postId)
  }, [updatePostLike])

  const [stats, setStats] = useState({ postCount: 0, memberCount: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/communities?name=${encodeURIComponent(displayName)}`)
        const data = await res.json()
        if (res.ok) {
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch community stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    if (displayName) fetchStats()
  }, [displayName])

  const isAuthenticated = !!currentUser;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Community header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">🎓 {displayName}</h1>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '...' : `${stats.postCount} posts · ${stats.memberCount} members`}
            </p>
          </div>
        </div>
      </div>

      {/* Composer pre-filled with this community (authenticated users only) */}
      {isAuthenticated && (
        <PostComposer 
          defaultCommunity={displayName} 
          onPostCreated={addPost} 
        />
      )}

      {/* Posts Section */}
      <div className="flex-1">
        {!isAuthenticated ? (
          <EmptyState 
            icon={GraduationCap} 
            title={`${displayName} community`} 
            description="Log in to view discussions and join the conversation with your college mates." 
          />
        ) : postsLoading && posts.length === 0 ? (
          [1, 2, 3].map(i => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <EmptyState 
            icon={GraduationCap} 
            title={`Welcome to ${displayName}`} 
            description="Be the first to share something with your college community!" 
          />
        ) : (
          <>
            <div className="divide-y divide-border">
              {posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  currentUserId={currentUser?._id} 
                  currentUser={currentUser}
                  onDelete={handleDeletePost} 
                  onLike={handleLikePost} 
                />
              ))}
            </div>
            
            <div ref={sentinelRef}>
              <InfiniteScrollSentinel 
                loading={postsLoading} 
                hasMore={hasMore} 
                error={postsError} 
                onRetry={loadMore} 
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
