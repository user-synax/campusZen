"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import {
  Search,
  X,
  Upload,
  BookOpen,
  Filter,
  ChevronDown
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'sonner'
import useUser from '@/hooks/useUser'
import { useDebounce } from '@/hooks/useDebounce'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { CATEGORIES_LIST } from '@/utils/resource-helpers'
import ResourceCard from '@/components/resources/ResourceCard'
import ResourceSkeleton from '@/components/resources/ResourceSkeleton'
import ResourceUploadModal from '@/components/resources/ResourceUploadModal'
import EmptyState from '@/components/shared/EmptyState'
import InfiniteScrollSentinel from '@/components/shared/InfiniteScrollSentinel'

function ResourcesContent() {
  const { user } = useUser()
  const searchParams = useSearchParams()

  const [resources, setResources] = useState([])
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [search, setSearch] = useState('')
  const [college, setCollege] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const debouncedCollege = useDebounce(college, 400)

  const fetchResources = useCallback(async (pageNum, append = false) => {
    try {
      if (append) setLoadingMore(true)
      else setLoading(true)

      const params = new URLSearchParams({
        page: pageNum,
        limit: 12,
        sort,
        ...(category !== 'all' && { category }),
        ...(debouncedSearch.length >= 2 && { search: debouncedSearch }),
        ...(debouncedCollege && { college: debouncedCollege })
      })

      const res = await fetch(`/api/resources/browse?${params}`)
      const data = await res.json()

      if (res.ok) {
        if (append) {
          setResources(prev => [...prev, ...data.resources])
        } else {
          setResources(data.resources)
        }
        setHasMore(data.hasMore)
      } else {
        toast.error(data.error || 'Failed to fetch resources')
      }
    } catch (err) {
      toast.error('Connection error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [category, debouncedSearch, debouncedCollege, sort])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchResources(1, false)
  }, [category, debouncedSearch, debouncedCollege, sort, fetchResources])

  const { sentinelRef } = useInfiniteScroll({
    fetchMore: () => {
      const nextPage = page + 1
      setPage(nextPage)
      fetchResources(nextPage, true)
    },
    hasMore,
    loading: loadingMore
  })

  return (
    <div className="dark flex flex-col min-h-screen bg-background text-foreground pb-20 md:pb-6">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">

        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-[0_2px_0_0_hsl(var(--primary)/0.4)]">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-foreground">Resources</h1>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Community shared notes</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setUploadOpen(true)}
            className="group h-8 px-3.5 rounded-full text-xs font-semibold shadow-[0_2px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-[1.5px] active:shadow-none"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, subject or tags…"
              className="pl-10 pr-9 h-9 text-sm bg-accent/50 border-border/60 focus-visible:border-primary/40 focus-visible:ring-0 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {CATEGORIES_LIST.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`
                pill-chunky flex items-center gap-1 px-3 py-1.5 rounded-full
                text-xs whitespace-nowrap font-medium transition-colors shrink-0
                ${category === cat.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary filters */}
        <div className="flex gap-2 px-4 pb-3.5">
          <div className="relative flex-1">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="Filter by college…"
              className="pl-8 h-8 text-xs bg-accent/30 border-border/50 rounded-xl"
            />
          </div>
          <div className="relative shrink-0 w-32 sm:w-36">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-8 w-full appearance-none px-2.5 pr-7 text-xs bg-accent/30 border border-border/50 rounded-xl outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="saved">Bookmarked</option>
              <option value="oldest">Oldest</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 p-4">
        {loading && resources.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4">
            {Array(6).fill(0).map((_, i) => <ResourceSkeleton key={i} />)}
          </div>
        ) : resources.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={BookOpen}
              title={search ? `No results for "${search}"` : 'No resources yet'}
              description={
                search
                  ? 'Try different keywords or adjust your filters'
                  : 'Be the first to upload and help fellow students'
              }
              actionLabel="Upload a Resource"
              onAction={() => setUploadOpen(true)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-3 sm:gap-4">
              {resources.map(r => (
                <ResourceCard
                  key={r._id}
                  resource={r}
                  currentUserId={user?._id}
                />
              ))}
            </div>
            <div ref={sentinelRef}>
              <InfiniteScrollSentinel
                loading={loadingMore}
                hasMore={hasMore}
              />
            </div>
          </div>
        )}
      </div>

      <ResourceUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          toast.success('Resource submitted for review!')
        }}
      />
    </div>
  )
}

export default function ResourcesPage() {
  return (
    <Suspense fallback={
      <div className="dark min-h-screen bg-background text-foreground p-4 space-y-4">
        <div className="h-16 w-full bg-accent/20 border border-border/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array(6).fill(0).map((_, i) => <ResourceSkeleton key={i} />)}
        </div>
      </div>
    }>
      <ResourcesContent />
    </Suspense>
  )
}