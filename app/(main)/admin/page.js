"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useUser from "@/hooks/useUser";
import { isAdmin } from "@/lib/admin";
import { Loader2 } from "lucide-react";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        if (!userLoading) {
            if (!user || !isAdmin(user)) {
                router.push("/feed");
            }
        }
    }, [user, userLoading, router]);

    useEffect(() => {
        if (!user || !isAdmin(user)) return;
        let cancelled = false;
        fetch("/api/admin/verifications?limit=1", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => {
                if (!cancelled) setPendingCount(d.total || 0);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [user]);

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !isAdmin(user)) return null;

    return (
        <div className="max-w-5xl mx-auto pb-20 bg-[#090909] min-h-screen">
            <div className="p-4 border-b border-[#1a1a1a] bg-[#090909]/80 backdrop-blur-xl sticky top-0 z-10">
                <h1 className="text-xl font-black tracking-tight text-white">
                    Admin — Users
                </h1>
                <p className="text-xs text-[#999] mt-1">
                    View all users and manage bans. Search by name, username or email.
                </p>

                {/* Tab nav: Users | Verifications */}
                <div className="flex gap-2 mt-4">
                    <Link
                        href="/admin"
                        className="h-8 px-4 rounded-full bg-white text-black text-[13px] font-semibold inline-flex items-center justify-center hover:bg-white/90 transition-colors duration-[var(--duration-fast)]"
                    >
                        Users
                    </Link>
                    <Link
                        href="/admin/verifications"
                        className="h-8 px-4 rounded-full bg-[#141414] border border-[#262626] text-[#999] hover:text-white hover:bg-[#1c1c1c] text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-[var(--duration-fast)]"
                    >
                        Verifications
                        {pendingCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#f59e0b] text-black text-[11px] font-bold">
                                {pendingCount}
                            </span>
                        )}
                    </Link>
                </div>
            </div>

            <AdminUsersTable />
        </div>
    );
}
