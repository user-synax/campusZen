"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useUser from "@/hooks/useUser";
import { isAdmin } from "@/lib/admin";
import { Loader2 } from "lucide-react";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default function AdminDashboard() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();

    useEffect(() => {
        if (!userLoading) {
            if (!user || !isAdmin(user)) {
                router.push("/feed");
            }
        }
    }, [user, userLoading, router]);

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !isAdmin(user)) return null;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
                <h1 className="text-xl font-black tracking-tight text-primary">
                    Admin — Users
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    View all users and manage bans. Search by name, username or email.
                </p>
            </div>

            <AdminUsersTable />
        </div>
    );
}
