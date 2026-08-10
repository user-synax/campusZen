"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    X,
    BarChart2,
    Loader2,
    ImagePlus,
    FileCode,
    Eye,
    Edit3,
    Lock,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import UserAvatar from "@/components/user/UserAvatar";
import PollCreator from "@/components/post/PollCreator";
import LinkPreview from "@/components/shared/LinkPreview";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import GifPicker from "@/components/post/GifPicker";
import EmojiPicker from "@/components/post/EmojiPicker";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { cn } from "@/lib/utils";
import { containsMarkdown } from "@/utils/markdown";
import useUser from "@/hooks/useUser";
import { useDebounce } from "@/hooks/useDebounce";

const TAG_OPTIONS = [
    "Programming",
    "Web Development",
    "AI",
    "Hackathons",
    "Placements",
    "Startups",
    "Design",
    "Photography",
    "Gaming",
    "Cricket",
    "Music",
    "Memes",
    "Finance",
    "Entrepreneurship",
    "College Life",
    "Events",
    "Next.js",
    "React",
    "JavaScript",
    "Python",
    "Java",
    "C++",
    "Machine Learning",
    "Data Science",
];

// Character Progress Ring — compact, only reads as "urgent" near the limit
function CharacterProgressRing({ length = 0, maxLength = 2000 }) {
    const radius = 11;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(length / maxLength, 1);
    const strokeDashoffset = circumference - progress * circumference;
    const remaining = Math.max(maxLength - length, 0);
    const showNumber = remaining <= 200;

    const getColor = () => {
        const pct = (length / maxLength) * 100;
        if (pct >= 100) return "#ef4444"; // red
        if (pct >= 95) return "#f97316"; // orange
        if (pct >= 80) return "#facc15"; // yellow
        return "hsl(var(--primary))";
    };

    if (!showNumber) return null;

    return (
        <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
            <svg className="-rotate-90 w-7 h-7" viewBox="0 0 28 28">
                <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-muted-foreground/15"
                />
                <circle
                    cx="14"
                    cy="14"
                    r={radius}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-out"
                />
            </svg>
            <span
                className={cn(
                    "absolute text-[9px] font-semibold tabular-nums",
                    length > maxLength ? "text-red-500" : "text-foreground",
                )}
            >
                {remaining}
            </span>
        </div>
    );
}

// Small "Pro" lock badge shown on gated toolbar actions
function ProLockBadge() {
    return (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <Lock className="w-2 h-2" strokeWidth={3} />
        </span>
    );
}

export default function PostComposer({
    onPostCreated,
    defaultCommunity,
    noBorder = false,
}) {
    const { user: currentUser } = useUser();
    const router = useRouter();
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [manualCommunity, setManualCommunity] = useState("");
    const [communities, setCommunities] = useState([]);
    const [showPoll, setShowPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [tags, setTags] = useState([]);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedViolations, setBlockedViolations] = useState([]);

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const res = await fetch("/api/communities");
                if (res.ok) {
                    const data = await res.json();
                    setCommunities(data);
                }
            } catch (error) {
                console.error("Failed to fetch communities:", error);
            }
        };
        fetchCommunities();
    }, []);

    const activeCommunity =
        communities.find(
            (c) => c.slug === (defaultCommunity || manualCommunity),
        ) ||
        communities.find(
            (c) => c.name === (defaultCommunity || manualCommunity),
        );

    // Markdown state
    const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);

    // Image state
    const [selectedImages, setSelectedImages] = useState([]); // File[]
    const fileInputRef = useRef(null);
    const markdownFileInputRef = useRef(null);

    // Auto-grow textarea, capped so the composer stays compact
    const textareaRef = useRef(null);
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
    }, [content, isMarkdownPreview]);

    // Content blocks for GIFs and emojis
    const [contentBlocks, setContentBlocks] = useState([]);
    const [selectedGIFs, setSelectedGIFs] = useState([]);

    // Link preview state
    const [linkPreview, setLinkPreview] = useState(null);
    const debouncedContent = useDebounce(content, 500);

    // Detect URL for link preview
    useEffect(() => {
        const urlRegex = /(https?:\/\/[^\s)]+)/g;
        const match = debouncedContent.match(urlRegex);
        let url = match ? match[0] : null;

        // Clean up trailing dots or commas often typed at end of sentence
        if (url) {
            url = url.replace(/[.,;!]+$/, "");
        }

        if (url) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLinkPreview({ url });
        } else {
            setLinkPreview(null);
        }
    }, [debouncedContent]);

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remaining = 6 - selectedImages.length;
        if (files.length > remaining) {
            toast.error(`Maximum 6 images allowed`, {
                description: `You can only add ${remaining} more image${remaining === 1 ? "" : "s"}.`,
            });
        }
        const accepted = files.slice(0, remaining);
        if (accepted.length) {
            setSelectedImages((prev) => [...prev, ...accepted]);
        }
        // Reset input so the same file can be re-selected if removed
        e.target.value = "";
    };

    const removeImage = (index) => {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    };

    // Add GIF to content blocks
    const addGif = (gif) => {
        // Store GIF metadata for content block.
        // We use the Giphy CDN url directly instead of re-uploading.
        const gifBlock = {
            type: "gif",
            content: gif.url,
            metadata: {
                title: gif.title,
                width: gif.width,
                height: gif.height,
                aspectRatio: `${gif.width}/${gif.height}`,
                previewUrl: gif.previewUrl,
                id: gif.id,
                isUploading: false,
            },
        };
        setContentBlocks((prev) => [...prev, gifBlock]);
        setSelectedGIFs((prev) => [...prev, gif]);
    };

    // Remove GIF from content blocks
    const removeGif = (index) => {
        setContentBlocks((prev) => prev.filter((_, i) => i !== index));
        setSelectedGIFs((prev) => prev.filter((_, i) => i !== index));
    };

    // Add emoji to content
    const addEmoji = (emoji) => {
        // Add emoji as text content
        setContent((prev) => prev + emoji);
    };

    // Handle markdown file import
    const handleMarkdownFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
            toast.error("Please select a .md or .txt file");
            e.target.value = "";
            return;
        }

        if (file.size > 50 * 1024) {
            // 50KB limit
            toast.error("File too large (max 50KB)");
            e.target.value = "";
            return;
        }

        try {
            const text = await file.text();
            setContent(text);
            toast.success("Markdown file loaded!");
        } catch (err) {
            toast.error("Failed to read file");
        }
        e.target.value = "";
    };

    const handleSubmit = async () => {
        if (!content.trim() || content.length > 2000) return;

        // Reset blocked state first
        setIsBlocked(false);
        setBlockedViolations([]);

        // Poll validation
        if (showPoll) {
            if (!pollOptions[0].trim() || !pollOptions[1].trim()) {
                toast.error("Poll needs at least 2 options", {
                    description: "Please fill in the first two options.",
                });
                return;
            }
        }

        // Moderation check FIRST
        try {
            const moderationRes = await fetch("/api/posts/moderation-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    community: defaultCommunity || manualCommunity,
                    tags,
                }),
            });

            const moderationData = await moderationRes.json();

            if (moderationData.isBlocked) {
                setIsBlocked(true);
                setBlockedViolations(moderationData.violations);
                toast.error("Content blocked", {
                    description:
                        "Your post contains inappropriate content and has been reported.",
                });
                return;
            }
        } catch (err) {
            console.error("Moderation check failed", err);
            toast.error("Content check failed, please try again");
            return;
        }

        // Upload images first if any are selected
        let uploadedImageUrls = [];
        let updatedContentBlocks = [...contentBlocks];

        if (selectedImages.length > 0) {
            setIsUploadingImages(true);
            try {
                // Create form data
                const formData = new FormData();
                selectedImages.forEach((file) => {
                    formData.append("images", file);
                });

                // Upload via our new endpoint
                const uploadRes = await fetch("/api/posts/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const err = await uploadRes.json();
                    throw new Error(err.message || "Upload failed");
                }

                const { uploadedUrls } = await uploadRes.json();
                uploadedImageUrls = uploadedUrls;
            } catch (err) {
                toast.error("Image upload failed", {
                    description:
                        err.message ||
                        "Please try again. Your post content has been preserved.",
                });
                setIsUploadingImages(false);
                return;
            }
            setIsUploadingImages(false);
        }

        // Detect if content is markdown
        const containsMd = containsMarkdown(content);

        const payload = {
            content,
            community: defaultCommunity || manualCommunity,
            poll: showPoll ? pollOptions.filter((o) => o.trim()) : null,
            images: uploadedImageUrls,
            linkPreview: linkPreview?.url ? { url: linkPreview.url } : null,
            isMarkdown: containsMd,
            contentBlocks:
                updatedContentBlocks.length > 0 ? updatedContentBlocks : null,
            tags,
        };

        setIsLoading(true);
        try {
            const res = await fetch("/api/posts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const newPost = await res.json();

            if (!res.ok) {
                throw new Error(newPost.message || "Failed to create post");
            }

            setContent("");
            setManualCommunity("");
            setShowPoll(false);
            setPollOptions(["", ""]);
            setLinkPreview(null);
            setSelectedImages([]);
            setContentBlocks([]);
            setSelectedGIFs([]);
            if (onPostCreated) onPostCreated(newPost);

            toast.success("Posted!", {
                description: "Your post is live.",
            });
        } catch (error) {
            toast.error("Failed to post", {
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const iconBtnBase =
        "icon-chunky relative inline-flex items-center justify-center h-8 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent";

    // More popover state (Poll / Document)
    const [showMorePopover, setShowMorePopover] = useState(false);
    const morePopoverRef = useRef(null);
    const moreBtnRef = useRef(null);

    // Close popover on outside click
    useEffect(() => {
        if (!showMorePopover) return;
        const handler = (e) => {
            if (
                morePopoverRef.current &&
                !morePopoverRef.current.contains(e.target) &&
                moreBtnRef.current &&
                !moreBtnRef.current.contains(e.target)
            ) {
                setShowMorePopover(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showMorePopover]);

    // Reset blocked state when user edits content
    useEffect(() => {
        if (isBlocked) {
            setIsBlocked(false);
            setBlockedViolations([]);
        }
    }, [content]);

    return (
        <div
            className={cn(
                "px-4 py-3.5 transition-colors duration-300",
                isBlocked
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-background/50",
                !noBorder && "border-b border-border",
            )}
        >
            {/* Warning banner if content blocked */}
            {isBlocked && (
                <div className="mb-3 flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3">
                    <div className="p-2 bg-red-500/20 rounded-full">
                        <svg
                            className="w-5 h-5 text-red-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-400 text-sm">
                            Content Blocked
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your post has been flagged for violating our
                            community guidelines:{" "}
                            {blockedViolations
                                .map(
                                    (v) =>
                                        v.charAt(0).toUpperCase() + v.slice(1),
                                )
                                .join(", ")}
                            .
                        </p>
                    </div>
                    <button
                        onClick={() => setIsBlocked(false)}
                        className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Community Indicator */}
            {(defaultCommunity || manualCommunity) && (
                <div className="hidden sm:flex items-center gap-2 mb-3 px-1">
                    <Badge
                        variant="secondary"
                        className={cn(
                            "gap-1.5 py-1 px-2.5 rounded-full font-medium",
                            isBlocked
                                ? "bg-red-500/15 text-red-400 border-red-500/30"
                                : "bg-primary/10 text-primary border border-primary/15",
                        )}
                    >
                        <span className="leading-none">
                            {activeCommunity?.emoji || "🌐"}
                        </span>
                        <span>
                            Posting to{" "}
                            {activeCommunity?.name ||
                                defaultCommunity ||
                                manualCommunity}
                        </span>
                        {!defaultCommunity && (
                            <button
                                onClick={() => setManualCommunity("")}
                                className="ml-0.5 hover:text-destructive transition-colors"
                                aria-label="Clear community"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </Badge>
                </div>
            )}

            <div className="flex gap-3">
                <UserAvatar user={currentUser} size="md" />
                <div className="flex-1 min-w-0">
                    {/* Composer surface — text input + markdown toggle share one quiet, focus-aware card */}
                    <div className="rounded-xl transition-colors duration-200 -mx-2 -mt-1.5 px-2 pt-1.5 focus-within:bg-muted/40">
                        {/* Markdown preview/edit toggle — segmented control, only shown once there's something to toggle */}
                        {content && (
                            <div className="inline-flex items-center gap-0.5 p-0.5 mb-1.5 bg-muted rounded-full">
                                <button
                                    type="button"
                                    onClick={() => setIsMarkdownPreview(false)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150",
                                        !isMarkdownPreview
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Edit3 className="w-3 h-3" />
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMarkdownPreview(true)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150",
                                        isMarkdownPreview
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Eye className="w-3 h-3" />
                                    Preview
                                </button>
                            </div>
                        )}

                        {/* Edit mode */}
                        {!isMarkdownPreview && (
                            <Textarea
                                ref={textareaRef}
                                placeholder="What's happening on campus?"
                                className="resize-none border-none bg-transparent p-2 min-h-[44px] max-h-[280px] overflow-y-auto font-sans text-[15px] leading-relaxed placeholder:text-muted-foreground/60 rounded-lg shadow-none focus-visible:ring-0 focus-visible:outline-none"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                maxLength={2000}
                            />
                        )}

                        {/* Preview mode */}
                        {isMarkdownPreview && (
                            <div
                                className="min-h-[44px] px-2 pb-2 cursor-text"
                                onClick={() => setIsMarkdownPreview(false)}
                            >
                                {content ? (
                                    <MarkdownRenderer
                                        content={content}
                                        className="text-[15px]"
                                    />
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Nothing to preview...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    <div className="mt-2.5">
                        <MultiSelect
                            options={TAG_OPTIONS}
                            selected={tags}
                            onChange={setTags}
                            placeholder="Select tags..."
                            maxSelected={5}
                            disabled={isLoading || isUploadingImages}
                        />
                    </div>

                    {/* Link Preview */}
                    {linkPreview && (
                        <div className="mt-2.5 flex items-start gap-2">
                            <div className="flex-1 min-w-0 rounded-xl border border-border/60 overflow-hidden">
                                <LinkPreview
                                    url={linkPreview.url}
                                    clickable={false}
                                />
                            </div>
                            <button
                                onClick={() => setLinkPreview(null)}
                                className="p-1 rounded-full hover:bg-accent text-muted-foreground transition-colors shrink-0"
                                aria-label="Remove link preview"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Poll Creator */}
                    {showPoll && (
                        <div className="mt-2.5">
                            <PollCreator
                                options={pollOptions}
                                onChange={setPollOptions}
                                onRemove={() => {
                                    setShowPoll(false);
                                    setPollOptions(["", ""]);
                                }}
                            />
                        </div>
                    )}

                    {/* Image Preview Strip */}
                    {selectedImages.length > 0 && (
                        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {selectedImages.map((file, i) => (
                                <div
                                    key={i}
                                    className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-accent/20 ring-1 ring-border/60 group"
                                >
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove image"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* GIF Preview Strip */}
                    {selectedGIFs.length > 0 && (
                        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {selectedGIFs.map((gif, i) => (
                                <div
                                    key={i}
                                    className="relative shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-accent/20 ring-1 ring-border/60 group"
                                >
                                    <img
                                        src={gif.previewUrl}
                                        alt={gif.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeGif(i)}
                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-background/90 backdrop-blur-sm shadow-sm hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove GIF"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <span className="absolute bottom-1 left-1 text-[9px] font-medium tracking-wide bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded">
                                        GIF
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 pt-2.5 border-t border-border/70 gap-2.5">
                        <div className="flex items-center gap-0.5 w-full sm:w-auto">
                            {/* Image attachment button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            title="Add image"
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                iconBtnBase,
                                                selectedImages.length > 0
                                                    ? "px-2 gap-1 text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary"
                                                    : "w-8 px-0",
                                            )}
                                            onClick={(e) => {
                                                if (!currentUser?.isPro) {
                                                    e.preventDefault();
                                                    router.push("/billing");
                                                } else {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            disabled={
                                                selectedImages.length >= 6 ||
                                                !currentUser?.isPro
                                            }
                                            aria-label="Add image"
                                        >
                                            <ImagePlus className="w-4 h-4" />
                                            {selectedImages.length > 0 && (
                                                <span className="text-[10px] font-medium tabular-nums">
                                                    {selectedImages.length}/6
                                                </span>
                                            )}
                                            {!currentUser?.isPro && (
                                                <ProLockBadge />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    {!currentUser?.isPro && (
                                        <TooltipContent>
                                            <span>Pro Feature</span>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                            {/* Markdown file input (hidden, triggered from popover) */}
                            <input
                                ref={markdownFileInputRef}
                                type="file"
                                accept=".md,.txt"
                                className="hidden"
                                onChange={handleMarkdownFileSelect}
                            />

                            <span
                                className="w-px h-5 bg-border/70 mx-1"
                                aria-hidden="true"
                            />

                            {/* GIF Picker Button */}
                            <GifPicker
                                onSelect={addGif}
                                trigger={
                                    <Button
                                        title="Add GIF"
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            iconBtnBase,
                                            "w-8 px-0 text-[11px] font-bold tracking-tight",
                                            selectedGIFs.length > 0 &&
                                                "text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary",
                                        )}
                                        aria-label="Add GIF"
                                    >
                                        GIF
                                    </Button>
                                }
                            />

                            {/* Emoji Picker Button */}
                            <EmojiPicker
                                onSelect={addEmoji}
                                trigger={
                                    <Button
                                        title="Add emoji"
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn(iconBtnBase, "w-8 px-0")}
                                        aria-label="Add emoji"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="10"
                                            ></circle>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                            <line
                                                x1="9"
                                                y1="9"
                                                x2="9.01"
                                                y2="9"
                                            ></line>
                                            <line
                                                x1="15"
                                                y1="9"
                                                x2="15.01"
                                                y2="9"
                                            ></line>
                                        </svg>
                                    </Button>
                                }
                            />

                            {/* ··· More button — Poll + Document popover */}
                            <div className="relative">
                                <Button
                                    ref={moreBtnRef}
                                    title="More options"
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        iconBtnBase,
                                        "w-8 px-0",
                                        showMorePopover &&
                                            "bg-muted text-foreground",
                                    )}
                                    onClick={() =>
                                        setShowMorePopover((prev) => !prev)
                                    }
                                    aria-label="More options"
                                    aria-expanded={showMorePopover}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>

                                {/* Popover panel */}
                                {showMorePopover && (
                                    <div
                                        ref={morePopoverRef}
                                        className="card-chunky absolute bottom-full mb-2 left-0 z-50 bg-popover overflow-hidden min-w-[160px]"
                                    >
                                        {/* Poll row */}
                                        <button
                                            type="button"
                                            className={cn(
                                                "flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium transition-colors duration-150",
                                                showPoll
                                                    ? "text-primary bg-primary/10"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                                            )}
                                            onClick={(e) => {
                                                if (!currentUser?.isPro) {
                                                    e.preventDefault();
                                                    router.push("/billing");
                                                } else {
                                                    setShowPoll(!showPoll);
                                                    setShowMorePopover(false);
                                                }
                                            }}
                                        >
                                            <BarChart2 className="w-4 h-4 shrink-0" />
                                            <span>Poll</span>
                                            {!currentUser?.isPro && (
                                                <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                                                    Pro
                                                </span>
                                            )}
                                        </button>

                                        {/* Document row */}
                                        <button
                                            type="button"
                                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors duration-150"
                                            onClick={() => {
                                                markdownFileInputRef.current?.click();
                                                setShowMorePopover(false);
                                            }}
                                        >
                                            <FileCode className="w-4 h-4 shrink-0" />
                                            <span>Document</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                            <CharacterProgressRing
                                length={content.length}
                                maxLength={2000}
                            />
                            <Button
                                onClick={handleSubmit}
                                disabled={
                                    !content.trim() ||
                                    content.length > 2000 ||
                                    isLoading ||
                                    isUploadingImages
                                }
                                size="sm"
                                className="pill-chunky hover:cursor-pointer px-5 text-sm font-medium h-8 transition-transform duration-150"
                            >
                                {isUploadingImages ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                        Uploading...
                                    </>
                                ) : isLoading ? (
                                    "Posting..."
                                ) : (
                                    "Post"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}