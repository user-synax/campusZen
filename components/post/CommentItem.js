"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import VerifiedBadge from '@/components/shared/VerifiedBadge'
import { renderContentWithMentions } from "@/utils/hashtags"
import UserMention from "@/components/shared/UserMention"
import FormattedTime from "@/components/shared/FormattedTime"

/**
 * Reusable CommentItem component.
 * 
 * @param {Object} props
 * @param {Object} props.comment - Comment data
 * @param {string} props.currentUserId - ID of the logged-in user
 * @param {Function} props.onDelete - Callback to delete the comment
 */
export default function CommentItem({ comment, currentUserId, onDelete }) {
  const isOwner = comment.author?._id === currentUserId || comment.author === currentUserId

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 mt-0.5 shrink-0">
        <AvatarImage src={comment.author?.avatar} alt={comment.author?.name} />
        <AvatarFallback>{comment.author?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="comment-bubble px-4 py-2.5 inline-block max-w-full">
          <div className="flex items-center gap-2 mb-0.5 min-w-0">
            <Link 
              href={`/profile/${comment.author?.username}`} 
              className="hover:underline flex items-center gap-1 min-w-0"
            >
              <span className="text-[13px] font-bold tracking-[-0.13px] text-foreground truncate">{comment.author?.name || 'User'}</span>
              {comment.author?.isVerified && (
                <VerifiedBadge size="sm" verificationType={comment.author.verificationType} />
              )}
            </Link>
            <FormattedTime date={comment.createdAt} className="text-[11px] text-muted-foreground shrink-0 tabular-nums" />
          </div>
          <div className="text-[14px] wrap-break-words leading-[1.45] tracking-[-0.14px] text-foreground/90">
            {renderContentWithMentions(comment.content).map((segment, i) => {
              if (segment.type === 'hashtag') {
                return (
                  <Link 
                    key={i} 
                    href={`/hashtag/${segment.value}`}
                    className="post-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{segment.value}
                  </Link>
                )
              } else if (segment.type === 'mention') {
                return (
                  <UserMention key={i} username={segment.value} />
                )
              } else {
                return <span key={i}>{segment.value}</span>
              }
            })}
          </div>
        </div>
      </div>
      
      {/* Delete button — visible on hover for own comments */}
      {!comment.isOptimistic && isOwner && (
        <button 
          onClick={() => onDelete?.(comment._id)} 
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-2 -m-1 text-muted-foreground hover:text-destructive transition-opacity duration-[var(--duration-fast)] self-start mt-1" 
          title="Delete comment"
          aria-label="Delete comment"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
