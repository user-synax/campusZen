"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/feed");
    }, [router]);

    return null;
}
