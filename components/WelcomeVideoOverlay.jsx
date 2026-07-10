"use client";

import { useEffect, useRef, useState } from "react";

export default function WelcomeVideoOverlay() {
    const [isVisible, setIsVisible] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const videoRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Check for reduced motion preference
        const mediaQuery = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        );
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        // Reset state on every mount/visit
        setIsVisible(true);
        setIsFadingOut(false);

        // Cleanup any existing timeouts
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (prefersReducedMotion) {
            // Skip video and animation entirely for reduced motion
            timeoutRef.current = setTimeout(() => {
                setIsVisible(false);
            }, 100);
            return;
        }

        // Start fading out after 5 seconds
        timeoutRef.current = setTimeout(() => {
            setIsFadingOut(true);
            // Wait for fade-out animation to complete before unmounting
            setTimeout(() => {
                setIsVisible(false);
            }, 300); // 300ms for fade-out
        }, 5000);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };
    }, [prefersReducedMotion]);

    // Pause video when it's no longer visible
    useEffect(() => {
        if (!isVisible && videoRef.current) {
            videoRef.current.pause();
        }
    }, [isVisible]);

    if (!isVisible) return null;

    if (prefersReducedMotion) {
        // Show just the fallback background for reduced motion
        return <div className="fixed inset-0 z-[99999] bg-black/70" />;
    }

    return (
        <div
            className={`fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center overflow-hidden transition-opacity duration-300 ${isFadingOut ? "opacity-0" : "opacity-100"}`}
            style={{
                width: "100vw",
                height: "100vh",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
            }}
        >
            <video
                ref={videoRef}
                src="/welcome_video.mp4"
                preload="auto"
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ width: "100vw", height: "100vh" }}
                onError={(e) => {
                    console.warn("Welcome video failed to load", e);
                }}
            />
        </div>
    );
}
