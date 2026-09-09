"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUser from "@/hooks/useUser";

const STORAGE_KEY = "cx-verify-nudge-dismissed";
const DISMISS_DAYS = 7;

export default function VerificationNudgeBanner() {
  const { user } = useUser();
  const [dismissed, setDismissed] = useState(true); // hide until checked

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { at } = JSON.parse(raw);
        const ageDays = (Date.now() - (at || 0)) / (1000 * 60 * 60 * 24);
        if (ageDays < DISMISS_DAYS) {
          setDismissed(true);
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
      setDismissed(false);
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!user) return null;
  if (user.isVerified) return null;
  if (user.verificationStatus === "pending") return null;
  if (dismissed) return null;

  const isRejected = user.verificationStatus === "rejected";

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="mx-3 sm:mx-4 mt-3 rounded-[14px] border border-[#22c55e30] p-3 flex gap-3 items-start sm:items-center bg-[linear-gradient(135deg,#22c55e15,#16a34a10)]">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#22c55e15] border border-[#22c55e30]">
        {isRejected ? (
          <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-[#22c55e]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">
          {isRejected ? "Verification rejected — try again" : "Get verified — unlock study rooms & boosted reach"}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {isRejected && user.verificationRejectedReason
            ? user.verificationRejectedReason
            : "Verify your college ID to join verified study rooms, get a green badge, and rank higher in feeds & communities."}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link href="/verify-student">
          <Button size="sm" className="h-8 rounded-full px-4 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-[12px]">
            Verify now
          </Button>
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-background/60 border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
