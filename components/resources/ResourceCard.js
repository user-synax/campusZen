"use client";

import { useState } from "react";
import {
    Download,
    Bookmark,
    Share2,
    MoreVertical,
    AlertTriangle,
    FileText,
    GraduationCap,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CATEGORY_CONFIG, formatFileSize } from "@/utils/resource-helpers";
import { formatRelativeTime } from "@/utils/formatters";
import UserAvatar from "@/components/user/UserAvatar";

/**
 * ResourceCard Component
 * Displays a student-uploaded resource with engagement stats and actions.
 */
export default function ResourceCard({ resource, currentUserId }) {
    const [isSaved, setIsSaved] = useState(resource.isSaved || false);
    const [saveCount, setSaveCount] = useState(resource.saveCount || 0);
    const [isSaving, setIsSaving] = useState(false);

    const handleDownload = () => {
        // Fire and forget — never block the download
        fetch(`/api/resources/${resource._id}/download`, {
            method: "POST",
        }).catch((err) =>
            console.error("[Download Tracking Error]", err.message),
        );

        // The download is initiated by the link's href/target
    };

    const handleSave = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUserId) {
            toast.error("Log in to save resources");
            return;
        }

        try {
            setIsSaving(true);

            // Optimistic update
            const prevSaved = isSaved;
            const prevCount = saveCount;

            setIsSaved(!prevSaved);
            setSaveCount(prevCount + (prevSaved ? -1 : 1));

            const res = await fetch(`/api/resources/${resource._id}/save`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                setIsSaved(data.saved);
                setSaveCount(data.saveCount);
                toast.success(
                    data.saved ? "Resource saved" : "Removed from saved",
                );
            } else {
                // Revert on error
                setIsSaved(prevSaved);
                setSaveCount(prevCount);
                toast.error(data.error || "Failed to toggle save");
            }
        } catch (err) {
            toast.error("Connection error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const url = `${window.location.origin}/resources?id=${resource._id}`;
        navigator.clipboard.writeText(url);
        toast.success("Resource link copied!");
    };

    const category =
        CATEGORY_CONFIG[resource.category] || CATEGORY_CONFIG.other;

    return (
        <Card className="overflow-hidden rounded-2xl hover:bg-accent/10 hover:-translate-y-0.5 transition-all duration-300 group border border-border/50 bg-card/20 backdrop-blur-sm shadow-md hover:shadow-xl">
            {/* Category color bar */}
            <div
                className="h-1.5 shrink-0 transition-all"
                style={{ background: category.color }}
            />

            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                            <Badge
                                variant="outline"
                                className="text-[10px] font-bold px-1.5 py-0 border-none uppercase"
                                style={{
                                    borderColor: category.color + "50",
                                    color: category.color,
                                    backgroundColor: category.bgColor,
                                }}
                            >
                                {category.emoji} {category.label}
                            </Badge>
                            <span className="text-[9px] font-black border border-border/50 rounded-full px-1.5 py-0.5 text-muted-foreground uppercase bg-accent/30">
                                {resource.fileType}
                            </span>
                            {resource.isFeatured && (
                                <span className="text-[9px] font-black text-amber-500 flex items-center gap-0.5 uppercase tracking-wider rounded-full bg-amber-500/10 px-1.5 py-0.5">
                                    ⭐ Featured
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="font-black text-sm leading-tight tracking-tight text-foreground/90 line-clamp-2">
                            {resource.title}
                        </h3>

                        {/* Subject + Semester */}
                        {resource.subject && (
                            <p className="text-[11px] text-muted-foreground mt-1 font-bold flex items-center gap-1">
                                <FileText className="w-3 h-3 opacity-50" />
                                {resource.subject}
                                {resource.semester &&
                                    ` · Semester ${resource.semester}`}
                            </p>
                        )}
                    </div>

                    {/* File size */}
                    <p className="text-[10px] text-muted-foreground/60 font-mono font-bold shrink-0">
                        {formatFileSize(resource.fileSize)}
                    </p>
                </div>

                {/* Tags */}
                {resource.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="text-[9px] font-black bg-primary/5 text-primary/70 border border-primary/10 px-1.5 py-0.5 rounded-full"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Uploader + College */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-border/50">
                    <UserAvatar user={resource.uploadedBy} size="xs" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-foreground/80 truncate flex items-center gap-1 tracking-tight">
                            {resource.uploadedBy.name}
                            {resource.uploadedBy.isVerified && (
                                <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                            )}
                        </p>
                        {resource.college && (
                            <p className="text-[9px] font-bold text-muted-foreground/60 truncate uppercase tracking-tight">
                                {resource.college}
                            </p>
                        )}
                    </div>

                    {/* Engagement Stats */}
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50  shrink-0">
                        <span
                            title="Downloads"
                            className="flex items-center gap-0.5"
                        >
                            <Download className="w-3 h-3" />{" "}
                            {resource.downloadCount}
                        </span>
                        <span
                            title="Saves"
                            className="flex items-center gap-0.5"
                        >
                            <Bookmark className="w-3 h-3" /> {saveCount}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                    {/* Download */}
                    <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                        onClick={handleDownload}
                    >
                        <Button
                            size="sm"
                            className="group/btn w-full h-9 rounded-full text-xs font-black tracking-tight bg-primary hover:bg-primary/80 hover:cursor-pointer shadow-[0_2px_0_0_hsl(var(--primary)/0.45)] transition-transform active:translate-y-[1.5px] active:shadow-none"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download
                        </Button>
                    </a>

                    {/* Save — only if logged in */}
                    {currentUserId && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`icon-chunky h-9 px-3.5 rounded-xl border-border/50 transition-all ${isSaved
                                    ? "text-amber-500 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                                    : "hover:bg-accent/50"
                                }`}
                            title={
                                isSaved ? "Remove from saved" : "Save resource"
                            }
                        >
                            <Bookmark
                                className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`}
                            />
                        </Button>
                    )}

                    {/* Share */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleShare}
                        className="icon-chunky h-9 px-3.5 rounded-xl border-border/50 hover:bg-accent/50 text-muted-foreground"
                        title="Share link"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </Card>
    );
}