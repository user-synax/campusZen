import PostSkeleton from "@/components/post/PostSkeleton"

export default function FeedLoading() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10">
        <h1 className="text-xl font-bold tracking-tight">Home</h1>
      </div>
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
