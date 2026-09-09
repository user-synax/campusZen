"use client";

import { ShieldCheck } from "lucide-react";

export default function VerifiedFilterToggle({ active, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full h-8 px-3 text-[12px] font-semibold border transition-colors duration-[var(--duration-fast)] hover:cursor-pointer ${
                active
                    ? "bg-[#22c55e] text-black border-[#22c55e]"
                    : "bg-[#141414] border-[#262626] text-[#999] hover:text-white"
            }`}
        >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Verified only</span>
        </button>
    );
}
