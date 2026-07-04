"use client";

import { useEffect, useRef, useState } from "react";

export default function ClipPlayer({ clip, isActive, onView }) {
    const videoRef = useRef(null);
    const [viewRecorded, setViewRecorded] = useState(false);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.play().catch(() => {});
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [isActive]);

    useEffect(() => {
        if (isActive && !viewRecorded && onView) {
            const timer = setTimeout(() => {
                onView();
                setViewRecorded(true);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isActive, viewRecorded, onView]);

    return (
        <video
            ref={videoRef}
            src={clip.videoUrl}
            className="h-full w-full object-contain bg-black"
            loop
            playsInline
            preload="metadata"
            poster={clip.thumbnailUrl}
        />
    );
}
