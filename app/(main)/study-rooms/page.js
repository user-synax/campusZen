"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, GraduationCap, ShieldCheck, Loader2, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";
import { useDebounce } from "@/hooks/useDebounce";
import StudyRoomCard from "@/components/study-room/StudyRoomCard";
import CreateStudyRoomDialog from "@/components/study-room/CreateStudyRoomDialog";
import EmptyState from "@/components/shared/EmptyState";

export default function StudyRoomsPage() {
  const router = useRouter();
  const { user: currentUser, loading: userLoading } = useUser();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [activeTab, setActiveTab] = useState("college"); // college | discover
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [joiningId, setJoiningId] = useState(null);

  const fetchRooms = useCallback(
    async (nextPage = 1, append = false) => {
      if (!currentUser) return;
      try {
        if (!append) setLoading(true);
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("limit", "20");
        params.set("showLocked", "true");
        const qVal = debouncedSearch?.trim() || search.trim();
        if (qVal && qVal.length >= 2) {
          params.set("q", qVal);
        }
        if (activeTab === "college") {
          if (currentUser.college) params.set("college", currentUser.college);
          else params.set("college", "all");
        } else {
          params.set("college", "all");
        }

        const res = await fetch(`/api/study-rooms?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to load study rooms");
          return;
        }
        const newRooms = data.rooms || [];
        if (append) {
          setRooms((prev) => [...prev, ...newRooms]);
        } else {
          setRooms(newRooms);
        }
        setTotal(data.total || 0);
        setHasMore(!!data.hasMore);
        setPage(data.page || nextPage);
      } catch (err) {
        console.error("[StudyRooms] fetch failed", err);
        toast.error("Failed to load study rooms");
      } finally {
        setLoading(false);
      }
    },
    [currentUser, activeTab, debouncedSearch, search]
  );

  useEffect(() => {
    if (!currentUser || userLoading) return;
    fetchRooms(1, false);
  }, [fetchRooms, currentUser, userLoading]);

  // Reset page when tab or search changes
  useEffect(() => {
    if (!currentUser) return;
    setRooms([]);
    fetchRooms(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch]);

  const handleCreated = useCallback(
    (newRoom) => {
      // Prepend or refetch
      fetchRooms(1, false);
    },
    [fetchRooms]
  );

  const handleRoomAction = useCallback(
    async (room) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      if (room.locked) {
        toast.error("Verified only — get verified to join this room");
        router.push("/verify-student");
        return;
      }

      const isMember = room.isMember;
      setJoiningId(room._id);

      try {
        if (!isMember) {
          // Join flow
          const res = await fetch(`/api/study-rooms/${room._id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "join" }),
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Failed to join room");
            return;
          }
          toast.success(`Joined "${room.name}"`);
          // Update local state optimistically
          setRooms((prev) =>
            prev.map((r) =>
              r._id === room._id
                ? {
                    ...r,
                    ...data.room,
                    isMember: true,
                    locked: false,
                    membersCount: data.room.members?.length ?? data.room.participantCount,
                  }
                : r
            )
          );
          // Optionally navigate to call page if you want LiveKit
          // router.push(`/study-rooms/${room._id}/call`);
        } else {
          // Already member → try to get LiveKit token and navigate to call
          const tokenRes = await fetch(`/api/study-rooms/${room._id}/token`);
          const tokenData = await tokenRes.json();
          if (!tokenRes.ok) {
            toast.error(tokenData.error || "Failed to generate call token");
            return;
          }
          toast.success("Entering room — LiveKit ready");
          // For MVP: keep on list but mark active; if call page exists, navigate
          // Check if call page exists by attempting navigation; fallback to toast
          // We'll try to route to /study-rooms/[id]/call if implemented, else stay
          try {
            router.push(`/study-rooms/${room._id}`);
          } catch {}
        }
      } catch (e) {
        toast.error("Something went wrong");
      } finally {
        setJoiningId(null);
      }
    },
    [currentUser, router]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    fetchRooms(page + 1, true);
  }, [hasMore, loading, page, fetchRooms]);

  const filteredCountLabel = useMemo(() => {
    if (loading && rooms.length === 0) return "Loading...";
    if (total === 0) return "No rooms";
    return `${total} room${total !== 1 ? "s" : ""}`;
  }, [total, loading, rooms.length]);

  // Guard: if not logged in after loading, show login prompt but don't auto-redirect aggressively
  if (!userLoading && !currentUser) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#090909] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-white">Study Rooms</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm">
          College-gated LiveKit rooms for verified students. Please log in to discover and join study rooms.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-6 rounded-full bg-white text-black hover:bg-zinc-100 font-semibold">
          Log in to continue
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#090909]/80 backdrop-blur-xl border-b border-[#262626]">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </span>
              Study Rooms
              <span className="hidden sm:inline-flex text-[11px] font-bold tracking-widest uppercase bg-[#22c55e] text-white rounded-full px-2 py-0.5">Live</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1 hidden sm:block">
              College-gated LiveKit rooms · {currentUser?.college || "Discover"} · {filteredCountLabel}
            </p>
          </div>
          <div className="shrink-0">
            <CreateStudyRoomDialog currentUser={currentUser} onCreated={handleCreated} />
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="px-4 sm:px-6 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 rounded-full bg-[#171717] border border-[#262626]">
              <button
                onClick={() => setActiveTab("college")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:cursor-pointer ${
                  activeTab === "college" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Your College
                </span>
              </button>
              <button
                onClick={() => setActiveTab("discover")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:cursor-pointer ${
                  activeTab === "discover" ? "bg-white text-black shadow" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Discover
                </span>
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="hidden sm:inline">{currentUser?.college || "No college set"}</span>
              {currentUser?.isVerified ? (
                <span className="inline-flex items-center gap-1 text-[#22c55e] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <Lock className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder={activeTab === "college" ? "Search your college rooms... (e.g. DSA, GATE)" : "Search all study rooms..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#171717] border-[#262626] text-white placeholder:text-zinc-600 focus-visible:ring-[#22c55e]/20"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 py-6">
        {loading && rooms.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-[#262626] bg-[#171717] p-4 space-y-3">
                <Skeleton className="h-5 w-3/4 bg-[#262626]" />
                <Skeleton className="h-4 w-1/2 bg-[#262626]" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-[#262626]" />
                  <Skeleton className="h-8 w-24 rounded-full bg-[#262626]" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white">{search ? "No results found" : activeTab === "college" ? "No rooms for your college yet" : "No study rooms yet"}</h3>
            <p className="text-sm text-zinc-500 mt-1 text-center max-w-md">
              {search
                ? `No rooms matching "${search}"`
                : activeTab === "college"
                  ? `Be the first to create a study room for ${currentUser?.college || "your college"} — lock it to verified students for focused study.`
                  : "Be the first to create a college-gated LiveKit room. Verified students get boosted reach."}
            </p>
            <div className="mt-6">
              <CreateStudyRoomDialog
                currentUser={currentUser}
                onCreated={handleCreated}
                trigger={
                  <Button className="rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold gap-2">
                    <BookOpen className="w-4 h-4" />
                    Create Study Room
                  </Button>
                }
              />
            </div>
            {!currentUser?.isVerified && (
              <p className="text-xs text-amber-400 mt-3 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Get verified to create verified-only rooms
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div key={room._id} className={joiningId === room._id ? "opacity-70 pointer-events-none" : ""}>
                  <StudyRoomCard room={room} currentUser={currentUser} onJoin={handleRoomAction} />
                  {joiningId === room._id && (
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mt-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Joining...
                    </div>
                  )}
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="rounded-full bg-[#171717] border-[#262626] text-white hover:bg-[#262626] hover:text-white gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
            <p className="text-center text-[11px] text-zinc-600 mt-6">
              {total} room{total !== 1 ? "s" : ""} · {rooms.length} shown · {activeTab === "college" ? currentUser?.college : "Discover all colleges"}
            </p>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-[#262626] bg-[#0a0a0a] px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
            Verified rooms are college-gated and boost your study credibility.
          </span>
          {!currentUser?.isVerified && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/verify-student")}
              className="rounded-full border-[#262626] bg-transparent text-zinc-300 hover:bg-[#171717] hover:text-white gap-1.5 h-7 text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Get Verified
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
