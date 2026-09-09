"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import useUser from "@/hooks/useUser";
import { isAdmin } from "@/lib/admin";
import VerificationQueueCard from "@/components/admin/VerificationQueueCard";
import { Button } from "@/components/ui/button";

export default function AdminVerificationsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Admin guard
  useEffect(() => {
    if (!userLoading) {
      if (!user || !isAdmin(user)) {
        router.push("/feed");
      }
    }
  }, [user, userLoading, router]);

  const fetchQueue = useCallback(
    async (pageNum = page) => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/admin/verifications?page=${pageNum}&limit=10`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          // keep badge in sync
          setPendingCount(data.total || 0);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Failed to fetch verifications:", err);
      } finally {
        setLoading(false);
      }
    },
    [page]
  );

  // Initial + page change fetch after auth resolved
  useEffect(() => {
    if (!userLoading && user && isAdmin(user)) {
      fetchQueue(page);
    }
  }, [page, user, userLoading, fetchQueue]);

  const handleAction = useCallback(() => {
    // Refetch current page; if last item on page was removed and page > 1, go back
    // Do immediate refetch; if users length will be 1 and we remove it, next fetch will be empty -> step back
    fetchQueue(page);
  }, [fetchQueue, page]);

  // If users becomes empty after refetch and page > 1, step back (handle in effect after data)
  useEffect(() => {
    if (!loading && users.length === 0 && page > 1 && total > 0) {
      setPage((p) => Math.max(1, p - 1));
    }
  }, [users, loading, page, total]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#090909]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user || !isAdmin(user)) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20 bg-[#090909] min-h-screen">
      {/* Header + tabs */}
      <div className="p-4 border-b border-[#1a1a1a] bg-[#090909]/80 backdrop-blur-xl sticky top-0 z-10">
        <h1 className="text-xl font-black tracking-tight text-white">
          Admin — Verifications
        </h1>
        <p className="text-xs text-[#999] mt-1">
          Review college ID cards and approve or reject verification requests.
        </p>

        {/* Tab nav: Users | Verifications */}
        <div className="flex gap-2 mt-4">
          <Link
            href="/admin"
            className="h-8 px-4 rounded-full bg-[#141414] border border-[#262626] text-[#999] hover:text-white hover:bg-[#1c1c1c] text-[13px] font-medium inline-flex items-center justify-center transition-colors duration-[var(--duration-fast)]"
          >
            Users
          </Link>
          <Link
            href="/admin/verifications"
            className="h-8 px-4 rounded-full bg-white text-black text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-white/90 transition-colors duration-[var(--duration-fast)]"
          >
            Verifications
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#090909] text-white text-[11px] font-bold">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && users.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <p className="text-[13px] text-[#999]">Loading verifications…</p>
          </div>
        ) : users.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {users.map((u) => (
              <VerificationQueueCard key={u._id} user={u} onAction={handleAction} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-[#262626] rounded-[16px] bg-[#141414]">
            <p className="text-[13px] font-medium text-white">No pending verifications</p>
            <p className="text-[12px] text-[#666] mt-1">
              All caught up — no ID cards awaiting review.
            </p>
          </div>
        )}
      </div>

      {/* Pagination — pill buttons like AdminUsersTable.js:212 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[#1a1a1a] flex items-center justify-between gap-2 bg-[#090909] sticky bottom-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-9 px-4 rounded-full bg-[#141414] border-[#262626] text-white hover:bg-[#1c1c1c] hover:text-white text-[13px] font-medium active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-[12px] font-medium text-[#999]">
            Page {page} of {totalPages} · {total} pending
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
            className="h-9 px-4 rounded-full bg-white text-black hover:bg-white/90 border border-white text-[13px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
