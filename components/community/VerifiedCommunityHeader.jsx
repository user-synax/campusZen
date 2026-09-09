"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function VerifiedCommunityHeader({
  displayName,
  stats = {},
  isMember = false,
  onJoin,
  currentUser,
}) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);

  const postCount = stats.postCount ?? 0;
  const memberCount = stats.memberCount ?? 0;
  const verifiedMemberCount = stats.verifiedMemberCount ?? 0;

  const verifiedRatio =
    memberCount > 0 ? Math.min(100, Math.round((verifiedMemberCount / memberCount) * 100)) : 0;

  const handleJoin = async () => {
    if (onJoin) {
      setJoining(true);
      try {
        await onJoin();
      } finally {
        setJoining(false);
      }
      return;
    }
    // Fallback: direct POST if parent did not provide onJoin
    setJoining(true);
    try {
      const slug = displayName?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "";
      await fetch("/api/communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
    } finally {
      setJoining(false);
    }
  };

  const showJoinButton = !isMember && !!currentUser;

  return (
    <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-10">
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full hover:bg-accent shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-lg truncate leading-tight">🎓 {displayName}</h1>
                {currentUser?.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full px-2 py-0.5 shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {memberCount} members · {verifiedMemberCount} verified · {postCount} posts
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {showJoinButton ? (
              <Button
                onClick={handleJoin}
                disabled={joining}
                size="sm"
                className="rounded-full px-5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join"
                )}
              </Button>
            ) : isMember ? (
              <span className="inline-flex items-center text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1.5 bg-accent/20">
                Joined
              </span>
            ) : null}
          </div>
        </div>

        {/* Verified ratio progress bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden border border-[#262626]">
            <div
              className="h-full bg-[#22c55e] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${verifiedRatio}%` }}
              role="progressbar"
              aria-valuenow={verifiedRatio}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${verifiedRatio}% verified`}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
            <span className="text-muted-foreground">{verifiedRatio}% verified</span>
            {verifiedMemberCount > 0 && memberCount > 0 && (
              <span className="text-[#22c55e] font-medium">
                {verifiedMemberCount} of {memberCount} verified
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
