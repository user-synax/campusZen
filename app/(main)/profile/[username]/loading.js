import PostSkeleton from "@/components/post/PostSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Skeleton */}
      <div>
        <div className="h-32 bg-secondary animate-pulse" />
        <div className="px-4 pb-4">
          <div className="flex justify-between items-end -mt-12 mb-3">
            <Skeleton className="w-24 h-24 rounded-full border-4 border-background shrink-0" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <div className="space-y-3 mt-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Posts Skeleton — spaced cards */}
      <div className="feed-stack">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="post-skeleton-card p-3 sm:p-4">
            <PostSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}
