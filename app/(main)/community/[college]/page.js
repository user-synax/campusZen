"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import PostComposer from "@/components/post/PostComposer"
import PostCard from "@/components/post/PostCard"
import PostSkeleton from "@/components/post/PostSkeleton"
import EmptyState from "@/components/shared/EmptyState"
import { usePosts } from "@/hooks/usePosts"
import useUser from "@/hooks/useUser"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"
import InfiniteScrollSentinel from "@/components/shared/InfiniteScrollSentinel"
import { formatCollegeName } from "@/utils/formatters"
import VerifiedCommunityHeader from "@/components/community/VerifiedCommunityHeader"

export default function CollegeCommunityPage() {
  const params = useParams()
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

  const [stats, setStats] = useState({ postCount: 0, memberCount: 0, verifiedMemberCount: 0 })
  const [isMember, setIsMember] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/communities?name=${encodeURIComponent(displayName)}`)
      const data = await res.json()
      if (res.ok) {
        setStats({
          postCount: data.postCount ?? 0,
          memberCount: data.memberCount ?? 0,
          verifiedMemberCount: data.verifiedMemberCount ?? 0,
        })
        if (typeof data.isMember === "boolean") {
          setIsMember(data.isMember)
        }
      }
    } catch (error) {
      console.error('Failed to fetch community stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [displayName])

  useEffect(() => {
    if (displayName) {
      setStatsLoading(true)
      fetchStats()
    }
  }, [displayName, fetchStats])

  const handleJoin = useCallback(async () => {
    try {
      const slug = displayName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      const res = await fetch("/api/communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      if (res.ok) {
        setIsMember(true)
        await fetchStats()
      } else {
        const err = await res.json().catch(() => ({}))
        console.error("Join failed:", err)
      }
    } catch (error) {
      console.error("Join error:", error)
    }
  }, [displayName, fetchStats])

  const isAuthenticated = !!currentUser;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Verified-first community header */}
      {statsLoading ? (
        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full w-0 bg-[#22c55e]" />
          </div>
        </div>
      ) : (
        <VerifiedCommunityHeader
          displayName={displayName}
          stats={stats}
          isMember={isMember}
          onJoin={handleJoin}
          currentUser={currentUser}
        />
      )}

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
