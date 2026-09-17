"use client"

import { memo } from 'react'
import { Skeleton } from "@/components/ui/skeleton"

const PostSkeleton = memo(function PostSkeleton() {
  return (
    <div className="p-1">
      <div className="flex gap-3">
        <Skeleton className="post-skeleton-bar post-skeleton-pulse w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 items-center">
            <Skeleton className="post-skeleton-bar post-skeleton-pulse h-4 w-24 rounded-md" />
            <Skeleton className="post-skeleton-bar post-skeleton-pulse h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="post-skeleton-bar post-skeleton-pulse h-4 w-full rounded-md" />
          <Skeleton className="post-skeleton-bar post-skeleton-pulse h-4 w-3/4 rounded-md" />
          <div className="flex gap-6 mt-4">
            <Skeleton className="post-skeleton-bar post-skeleton-pulse h-4 w-12 rounded-md" />
            <Skeleton className="post-skeleton-bar post-skeleton-pulse h-4 w-12 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
})

export default PostSkeleton
