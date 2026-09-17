import PostSkeleton from "@/components/post/PostSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function CommunityLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Community Header Skeleton */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10">
        <div className="flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Composer Skeleton Placeholder */}
      <div className="border-b border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Posts Skeleton — spaced cards */}
      <div className="feed-stack">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="post-skeleton-card p-3 sm:p-4">
            <PostSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}
