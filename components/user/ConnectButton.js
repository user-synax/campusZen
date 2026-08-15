"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ConnectButton({
    targetUserId,
    username,
    initialIsConnected = false,
    compact = false,
}) {
    const router = useRouter();
    const [isConnected, setIsConnected] = useState(initialIsConnected);
    const [isLoading, setIsLoading] = useState(false);

    const handleConnect = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isLoading || isConnected) return;

        setIsLoading(true);

        try {
            const res = await fetch("/api/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: targetUserId }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setIsConnected(true);

            toast.success(
                data.alreadyConnected
                    ? `Already connected with @${username}`
                    : `Connected with @${username}`,
                {
                    description: "Opening conversation…",
                },
            );

            // Navigate directly to the DM conversation
            if (data.conversationId) {
                router.push(`/chats/dm/${data.conversationId}`);
            }
        } catch (error) {
            toast.error("Failed to connect", {
                description: error.message || "An unknown error occurred",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isConnected) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className={cn(
                    "rounded-full opacity-60",
                    compact ? "px-3 h-8 text-xs" : "px-6",
                )}
            >
                Connected
            </Button>
        );
    }

    if (compact) {
        return (
            <Button
                variant="default"
                size="sm"
                disabled={isLoading}
                onClick={handleConnect}
                className={cn(
                    "rounded-full hover:cursor-pointer px-3 h-8 text-xs",
                )}
            >
                {isLoading ? (
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Connecting
                    </div>
                ) : (
                    <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Connect
                    </span>
                )}
            </Button>
        );
    }

    return (
        <Button
            variant="default"
            size="sm"
            disabled={isLoading}
            onClick={handleConnect}
            className={cn(
                "rounded-full hover:cursor-pointer hover:outline-4 hover:outline-accent",
                "px-6",
            )}
        >
            {isLoading ? (
                <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Connecting…
                </span>
            ) : (
                <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Connect
                </span>
            )}
        </Button>
    );
}
