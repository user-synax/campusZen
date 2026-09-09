"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, ExternalLink, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/components/user/UserAvatar";

export default function VerificationQueueCard({ user, onAction }) {
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [loading, setLoading] = useState(null); // "approve" | "reject" | null

  const collegeIdUrl = user?.collegeIdUrl || "";
  const isPdf = collegeIdUrl
    ? collegeIdUrl.split("?")[0].toLowerCase().endsWith(".pdf")
    : false;

  const handleApprove = async () => {
    try {
      setLoading("approve");
      const res = await fetch(`/api/admin/verifications/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve");
      }
      toast.success("Verification approved");
      onAction?.();
    } catch (err) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error("Reason required");
      return;
    }
    try {
      setLoading("reject");
      const res = await fetch(`/api/admin/verifications/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: reason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject");
      }
      toast.success("Verification rejected");
      setShowReject(false);
      setReason("");
      onAction?.();
    } catch (err) {
      toast.error(err.message || "Failed to reject");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-[16px] overflow-hidden">
      {/* Header: avatar + meta */}
      <div className="p-4 flex items-start gap-3">
        <UserAvatar user={user} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold tracking-tight text-white truncate">
            {user.name}
          </p>
          <p className="text-[12px] text-[#999] truncate">@{user.username}</p>
          <p className="text-[12px] text-[#999] truncate mt-0.5">
            {user.college || "No college"}
          </p>
          {user.verificationRequestedAt && (
            <p className="text-[11px] text-[#666] mt-1">
              Requested{" "}
              {formatDistanceToNow(new Date(user.verificationRequestedAt), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[10px] font-bold tracking-wide px-2 py-1 rounded-full bg-[#facc1515] text-[#facc15] border border-[#facc1530]">
          Pending
        </span>
      </div>

      {/* ID preview */}
      <div className="px-4 pb-4">
        <p className="text-[11px] font-bold tracking-widest text-[#666] uppercase mb-2">
          College ID
        </p>
        <div className="rounded-[12px] border border-[#262626] bg-[#090909] overflow-hidden flex items-center justify-center min-h-[180px]">
          {isPdf ? (
            <a
              href={collegeIdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-10 px-4 text-[#999] hover:text-white transition-colors duration-[var(--duration-fast)]"
            >
              <FileText className="w-10 h-10 text-[#f59e0b]" />
              <span className="text-[13px] font-medium text-white flex items-center gap-1.5">
                View PDF <ExternalLink className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] text-[#666] break-all text-center max-w-full">
                {collegeIdUrl}
              </span>
            </a>
          ) : collegeIdUrl ? (
            // Use <img> for Appwrite URLs to avoid Next image optimization issues; object-contain + border
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collegeIdUrl}
              alt={`${user.name || "Student"} college ID`}
              className="w-full h-auto max-h-[360px] object-contain bg-[#090909]"
              loading="lazy"
            />
          ) : (
            <p className="text-[12px] text-[#666] py-10">No ID URL</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        {!showReject ? (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading !== null}
              className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#22c55e] text-black text-[13px] font-semibold hover:bg-[#16a34a] active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading === "approve" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Approve
            </button>
            <button
              onClick={() => setShowReject(true)}
              disabled={loading !== null}
              className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1c1c1c] border border-[#262626] text-white text-[13px] font-medium hover:bg-[#262626] hover:text-white active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-3 rounded-[12px] bg-[#090909] border border-[#1a1a1a]">
            <label className="text-[12px] font-medium text-white">
              Rejection reason <span className="text-[#ef4444]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the ID was rejected..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-[10px] bg-[#141414] border border-[#262626] px-3 py-2 text-[13px] text-white placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-[#4ba9e1]/30 focus:border-[#4ba9e1]/30 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReject(false);
                  setReason("");
                }}
                disabled={loading === "reject"}
                className="flex-1 h-9 rounded-full bg-[#1c1c1c] border border-[#262626] text-white text-[13px] font-medium hover:bg-[#262626] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading === "reject" || !reason.trim()}
                className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-[#dc2626] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading === "reject" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Confirm Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
