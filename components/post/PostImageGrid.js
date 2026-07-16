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
            <div className="mt-2 rounded-xl overflow-hidden">
                <ImageCell
                    url={capped[0]}
                    ratio="16/9"
                    onClick={() => openImage(capped[0])}
                />
            </div>
        );
    }

    if (capped.length === 2) {
        return (
            <div className="mt-2 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden">
                {capped.map((url, i) => (
                    <ImageCell
                        key={i}
                        url={url}
                        ratio="1/1"
                        onClick={() => openImage(url)}
                    />
                ))}
            </div>
        );
    }

    // 3–6 images: first full-width, rest in 2-col grid
    const [first, ...rest] = capped;
    return (
        <div className="mt-2 rounded-xl overflow-hidden flex flex-col gap-0.5">
            <ImageCell
                url={first}
                ratio="16/9"
                onClick={() => openImage(first)}
            />
            <div className="grid grid-cols-2 gap-0.5">
                {rest.map((url, i) => (
                    <ImageCell
                        key={i}
                        url={url}
                        ratio="1/1"
                        onClick={() => openImage(url)}
                    />
                ))}
            </div>
        </div>
    );
}

function ImageCell({ url, ratio, onClick }) {
    const paddingMap = { "16/9": "pb-[56.25%]", "1/1": "pb-[100%]" };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative w-full ${paddingMap[ratio]} block overflow-hidden bg-accent/20 hover:opacity-90 transition-opacity`}
            aria-label="View image"
        >
            <Image
                src={url}
                alt="Post image"
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
                quality={100}
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
            />
        </button>
    );
}
