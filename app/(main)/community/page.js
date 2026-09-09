"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { GraduationCap, Search, ShieldCheck } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import EmptyState from "@/components/shared/EmptyState"
import CreateCommunityDialog from "@/components/post/CreateCommunityDialog"
import { useDebounce } from "@/hooks/useDebounce"
import useUser from "@/hooks/useUser"

export default function CommunitiesPage() {
  const { user: currentUser } = useUser()
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const fetchCommunities = async () => {
    try {
      const res = await fetch('/api/communities')
      const data = await res.json()
      if (res.ok) {
        setCommunities(data)
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunities()
  }, [])

  const { filteredCommunities, collegeCommunitySlug } = useMemo(() => {
    const collegeName = currentUser?.college?.trim() || ""
    const slugify = (name) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    let collegeCommunity = null
    let rest = [...communities]
    if (collegeName) {
      const expectedSlug = slugify(collegeName)
      const idx = rest.findIndex(
        (c) => c.name.toLowerCase() === collegeName.toLowerCase() || c.slug === expectedSlug
      )
      if (idx !== -1) {
        collegeCommunity = rest[idx]
        rest.splice(idx, 1)
      }
    }
    // sort rest by verifiedMemberCount desc then postCount desc
    rest.sort(
      (a, b) =>
        (b.verifiedMemberCount || 0) - (a.verifiedMemberCount || 0) ||
        (b.postCount || 0) - (a.postCount || 0)
    )
    const ordered = collegeCommunity ? [collegeCommunity, ...rest] : rest
    const filtered = ordered.filter((c) =>
      c.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
    return { filteredCommunities: filtered, collegeCommunitySlug: collegeCommunity?.slug || null }
  }, [communities, currentUser?.college, debouncedSearch])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Communities</h1>
        <CreateCommunityDialog onCreated={fetchCommunities} />
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search communities..." 
            className="pl-9 bg-accent/20 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4 border-border">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="flex flex-col items-center">
            <EmptyState
              icon={GraduationCap}
              title={search ? "No results found" : "No communities yet"}
              description={search ? `We couldn't find any community matching "${search}"` : "Be the first to post from your college to create a community!"}
            />
            {!search && <CreateCommunityDialog onCreated={fetchCommunities} />}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCommunities.map(community => {
              const isPinned = community.slug === collegeCommunitySlug
              return (
                <Link key={community.slug} href={`/community/${community.slug}`}>
                  <Card
                    className={`p-4 transition-all cursor-pointer group ${
                      isPinned
                        ? "border-[#22c55e]/50 bg-[#22c55e]/[0.06] hover:bg-[#22c55e]/10 shadow-[0_0_0_1px_rgba(34,197,94,0.15)]"
                        : "border-border hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                            🎓 {community.name}
                          </h3>
                          {isPinned && (
                            <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase bg-[#22c55e] text-white rounded-full px-2 py-0.5">
                              Your College
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <p className="text-sm text-muted-foreground">
                            {community.postCount} posts · {community.memberCount} members
                          </p>
                          {(community.verifiedMemberCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full px-2 py-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              {community.verifiedMemberCount} verified
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant={isPinned ? "default" : "outline"}
                        size="sm"
                        className={`rounded-full px-4 shrink-0 transition-all ${
                          isPinned
                            ? "bg-[#22c55e] hover:bg-[#16a34a] text-white border-transparent"
                            : "group-hover:bg-primary group-hover:text-primary-foreground"
                        }`}
                      >
                        {isPinned ? "Open" : "View"}
                      </Button>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
