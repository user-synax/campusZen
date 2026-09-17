"use client";

import Image from "next/image";

/**
 * Responsive image grid for post images.
 * - 1 image  → full-width, 16/9 aspect ratio
 * - 2 images → side-by-side, 1/1 aspect ratio
 * - 3–6 images → first full-width (16/9), rest in 2-col grid (1/1)
 */
export default function PostImageGrid({ images }) {
    if (!images?.length) return null;

    const capped = images.slice(0, 6);

    const openImage = (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    if (capped.length === 1) {
        return (
            <div className="post-media mt-0 overflow-hidden">
                <ImageCell url={capped[0]} ratio="16/9" onClick={() => openImage(capped[0])} />
            </div>
        );
    }

    if (capped.length === 2) {
        return (
            <div className="post-media mt-0 grid grid-cols-2 gap-[2px] overflow-hidden">
                {capped.map((url, i) => (
                    <ImageCell key={i} url={url} ratio="1/1" onClick={() => openImage(url)} />
                ))}
            </div>
        );
    }

    const [first, ...rest] = capped;
    return (
        <div className="post-media mt-0 flex flex-col gap-[2px] overflow-hidden">
            <ImageCell url={first} ratio="16/9" onClick={() => openImage(first)} />
            <div className="grid grid-cols-2 gap-[2px]">
                {rest.map((url, i) => (
                    <ImageCell key={i} url={url} ratio="1/1" onClick={() => openImage(url)} />
                ))}
            </div>
        </div>
    );
}

function ImageCell({ url, ratio, onClick }) {
    const paddingMap = { "16/9": "pb-[56.25%]", "1/1": "pb-[100%]" };
    // Cap single-image height at 510px, keep 16/9 but max-h
    const capClass = ratio === "16/9" ? "max-h-[510px]" : "";
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative w-full ${paddingMap[ratio]} ${capClass} block overflow-hidden bg-secondary/60 hover:opacity-[0.97] hover:cursor-pointer transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]`}
            aria-label="View image"
        >
            <Image
                src={url}
                alt="Post image"
                fill
                loading="lazy"
                decoding="async"
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
                quality={75}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
        </button>
    );
}
