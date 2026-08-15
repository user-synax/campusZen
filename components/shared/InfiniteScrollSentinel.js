"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InfiniteScrollSentinel({ loading, hasMore, error, onRetry }) {
  return (
    <div className="py-10 flex justify-center w-full min-h-[100px]">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading more posts...</span>
        </div>
      )}
      
      {error && !loading && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
          <p className="text-sm text-muted-foreground">Failed to load more</p>
          <Button variant="outline" size="sm" onClick={onRetry} className="rounded-full">
            Try again
          </Button>
        </div>
      )}
      
      {!hasMore && !loading && !error && (
        <div className="flex flex-col items-center gap-2 py-4 animate-in fade-in duration-500">
          <div className="h-px w-12 bg-border mb-2" />
          <p className="text-xs font-medium text-muted-foreground/60 tracking-wide uppercase">
            No more posts
          </p>
        </div>
      )}
    </div>
  )
}
