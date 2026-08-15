"use client"

import { useState, useRef, memo, useCallback } from 'react'
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageCircle, Bookmark } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import UserAvatar from "@/components/user/UserAvatar"
import LikeButton from './LikeButton'
import PostContent from './PostContent'
import PostOptionsMenu from './PostOptionsMenu'
import ShareButton from './ShareButton'
import ContentBlockRenderer from './ContentBlockRenderer'

// Lazy load heavy dialogs/modals
const CommentSection = dynamic(() => import('@/components/post/CommentSection'), { ssr: false })
const PollDisplay = dynamic(() => import('@/components/post/PollDisplay'), { ssr: false })
const PostImageGrid = dynamic(() => import('@/components/post/PostImageGrid'), { ssr: false })

import { cn } from "@/lib/utils"
import FormattedTime from "@/components/shared/FormattedTime"
import VerifiedBadge from '@/components/shared/VerifiedBadge'

const PostCard = memo(function PostCard({ post, currentUserId, currentUser, onDelete, onLike, onBookmark, isPinned = false }) {
  const router = useRouter()
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0)
  const [showComments, setShowComments] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(post._isBookmarked || false)
  const postRef = useRef(null)

  // useEffect for bookmark checking removed (handled by API)

  const handleBookmark = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setIsBookmarked(data.bookmarked);
      toast.success(data.message);
      if (onBookmark) onBookmark(post._id, data.bookmarked);
    } catch (error) {
      setIsBookmarked(wasBookmarked);
      toast.error(error.message || 'Failed to update bookmark');
    }
  }, [isBookmarked, onBookmark, post._id])

  return (
    <div
      ref={postRef}
      className="border-b border-border p-4 hover:bg-accent/10 transition-colors cursor-pointer group"
      onClick={() => router.push(`/post/${post._id}`)}
    >
      <div className="flex gap-3">
        <UserAvatar user={post.author} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Link
              href={`/profile/${post.author.username}`}
              className="hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-bold text-foreground">{post.author.name}</span>
                  {post.author?.isVerified && (
                    <VerifiedBadge size="sm" verificationType={post.author.verificationType} />
                  )}
                </Link>
                <span className="text-muted-foreground truncate">@{post.author.username}</span>
            <span className="text-muted-foreground">·</span>
            <Link 
              href={`/post/${post._id}`} 
              className="text-muted-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <FormattedTime date={post.createdAt} />
            </Link>
            {post.community && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border bg-secondary/30">
                {post.communityInfo?.emoji || '🎓'} {post.communityInfo?.name || post.community}
              </Badge>
            )}
          </div>
          
          <div className="mt-1">
            <PostContent content={post.content} isMarkdown={post.isMarkdown} />
          </div>

          {/* Rich Content Blocks (GIFs, emojis) */}
          {post.contentBlocks?.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <ContentBlockRenderer blocks={post.contentBlocks} className="mt-2" />
            </div>
          )}

          {post.images?.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <PostImageGrid images={post.images} />
            </div>
          )}

          {post.poll?.options?.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <PollDisplay 
                poll={post.poll} 
                postId={post._id} 
                currentUserId={currentUser?._id || currentUserId} 
                isExpired={post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()} 
              />
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3 text-muted-foreground">
            <div className="flex items-center gap-4 sm:gap-6">
              <LikeButton
                postId={post._id}
                initialLiked={post._isLiked}
                initialCount={post.likesCount || 0}
                onLike={onLike}
              />

              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  setShowComments(!showComments)
                }}
                className="icon-chunky hover:cursor-pointer flex items-center gap-1.5 text-xs hover:text-blue-400 transition-colors group/comment px-1"
              >
                <div className="p-2 rounded-full group-hover/comment:bg-blue-400/10">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="font-medium text-[10px] sm:text-xs pr-1">{commentsCount}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={handleBookmark}
                className={cn(
                  "p-2 rounded-full border-2 border-transparent transition-all duration-150 hover:cursor-pointer",
                  isBookmarked
                    ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                    : "hover:text-yellow-400 hover:bg-yellow-400/10 hover:border-border hover:shadow-[var(--shadow-hard-sm)]"
                )}
                title={isBookmarked ? 'Remove bookmark' : 'Save post'}
              >
                <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
              </button>

              <ShareButton post={post} />

              <div onClick={(e) => e.stopPropagation()}>
                <PostOptionsMenu 
                  post={post} 
                  currentUser={currentUser} 
                  onPostDeleted={onDelete}
                  onPostUpdated={(updatedPost) => {
                    post.content = updatedPost.content
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* CommentSection */}
          {showComments && (
            <div onClick={(e) => e.stopPropagation()}>
              <CommentSection 
                postId={post._id} 
                currentUser={currentUser} 
                onCountChange={(diff) => setCommentsCount(prev => prev + diff)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default PostCard