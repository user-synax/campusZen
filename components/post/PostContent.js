"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { renderContentWithMentions, extractUrls } from "@/utils/hashtags";
import UserMention from "@/components/shared/UserMention";
import LinkPreview from "@/components/shared/LinkPreview";
import MarkdownRenderer from "@/components/shared/MarkdownRenderer";
import { containsMarkdown } from "@/utils/markdown";

export default function PostContent({
    content,
    isMarkdown: isMarkdownProp = false,
    forceMarkdown = false,
}) {
    const TRUNCATE_LENGTH = 300;
    const [expanded, setExpanded] = useState(false);

    if (!content) return null;

    // Use prop if available, otherwise detect from content
    const isMarkdown =
        forceMarkdown || isMarkdownProp || containsMarkdown(content);
    const shouldTruncate = content.length > TRUNCATE_LENGTH;
    const displayContent =
        expanded || !shouldTruncate
            ? content
            : content.slice(0, TRUNCATE_LENGTH);

    // Extract URLs for link preview (only for non-markdown content)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const urls = useMemo(
        () => (isMarkdown ? [] : extractUrls(content)),
        [content, isMarkdown],
    );

    // For markdown content, use MarkdownRenderer
    if (isMarkdown) {
        return (
            <div>
                <MarkdownRenderer
                    content={displayContent}
                    className="text-[15px] leading-relaxed"
                />
                {!expanded && shouldTruncate && "..."}

                {shouldTruncate && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="text-primary text-sm mt-1 hover:underline font-medium"
                    >
                        {expanded ? "Show less" : "Read more"}
                    </button>
                )}
            </div>
        );
    }

    // For plain text, use original rendering with mentions/hashtags
    return (
        <div>
            <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
                {renderContentWithMentions(displayContent).map((segment, i) => {
                    if (segment.type === "hashtag") {
                        return (
                            <Link
                                key={i}
                                href={`/hashtag/${segment.value}`}
                                className="text-blue-400 hover:text-blue-300 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                #{segment.value}
                            </Link>
                        );
                    } else if (segment.type === "mention") {
                        return <UserMention key={i} username={segment.value} />;
                    } else if (segment.type === "url") {
                        return (
                            <a
                                key={i}
                                href={segment.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {segment.value}
                            </a>
                        );
                    } else {
                        return <span key={i}>{segment.value}</span>;
                    }
                })}
                {!expanded && shouldTruncate && "..."}
            </div>

            {/* Show link previews if any URLs exist */}
            {urls.length > 0 && (
                <div className="mt-2 space-y-2">
                    {urls.map((url, i) => (
                        <LinkPreview key={i} url={url} />
                    ))}
                </div>
            )}

            {shouldTruncate && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpanded(!expanded);
                    }}
                    className="text-primary text-sm mt-1 hover:underline font-medium"
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}
        </div>
    );
}
