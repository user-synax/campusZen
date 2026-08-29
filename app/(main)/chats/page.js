"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EmptyState from "@/components/shared/EmptyState";
import GroupChatItem from "@/components/chat/GroupChatItem";
import DMChatItem from "@/components/chat/DMChatItem";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import useUser from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin } from "@/lib/admin";
import { useTabData } from "@/hooks/useTabData";
import { ensureChatSocket } from "@/lib/chat-socket";

export default function ChatsPage() {
    const [activeTab, setActiveTab] = useState("dms");
    const [searchQuery, setSearchQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const { user: currentUser } = useUser();
    const router = useRouter();

    // Live online/offline status for DM conversations in the list. Driven by
    // the same app-wide socket connection (see ChatSocketProvider).
    const [onlineMap, setOnlineMap] = useState({});
    useEffect(() => {
        if (!currentUser) return;
        const me = currentUser._id;
        let active = true;
        let cleanup = () => {};
        ensureChatSocket()
            .then((socket) => {
                if (!active) return;
                const onOnline = (data) => {
                    if (!data?.user || data.user.id === me) return;
                    if (data.conversationId)
                        setOnlineMap((prev) => ({
                            ...prev,
                            [data.conversationId]: true,
                        }));
                };
                const onOffline = (data) => {
                    if (!data?.user || data.user.id === me) return;
                    if (data.conversationId)
                        setOnlineMap((prev) => ({
                            ...prev,
                            [data.conversationId]: false,
                        }));
                };
                const onSnapshot = (data) => {
                    if (data?.conversationId) {
                        const isOnline = (data.online || []).some(
                            (u) => u.id !== me,
                        );
                        setOnlineMap((prev) => ({
                            ...prev,
                            [data.conversationId]: isOnline,
                        }));
                    }
                };
                socket.on("presence:online", onOnline);
                socket.on("presence:offline", onOffline);
                socket.on("presence:snapshot", onSnapshot);
                const request = () => socket.emit("presence:request");
                if (socket.connected) request();
                else socket.once("connect", request);
                cleanup = () => {
                    socket.off("presence:online", onOnline);
                    socket.off("presence:offline", onOffline);
                    socket.off("presence:snapshot", onSnapshot);
                };
            })
            .catch(() => {});
        return () => {
            active = false;
            cleanup();
        };
    }, [currentUser?._id]);

    const {
        data: groups,
        loading: groupsLoading,
        fetchData: fetchGroups,
    } = useTabData(
        "chats-groups",
        async () => {
            const res = await fetch("/api/groups");
            if (!res.ok) throw new Error("Failed to fetch groups");
            const data = await res.json();
            return data.groups || [];
        },
        { ttl: 2 * 60 * 1000 }, // 2 minutes
    );

    const {
        data: dms,
        loading: dmsLoading,
        fetchData: fetchDMs,
    } = useTabData(
        "chats-dms",
        async () => {
            const res = await fetch("/api/dms");
            if (!res.ok) throw new Error("Failed to fetch DMs");
            const data = await res.json();
            return data.conversations || [];
        },
        { ttl: 2 * 60 * 1000 }, // 2 minutes
    );

    useEffect(() => {
        if (activeTab === "groups" && !groups) {
            fetchGroups();
        } else if (activeTab === "dms" && !dms) {
            fetchDMs();
        }
    }, [activeTab]);

    // Refetch when Pusher-driven cache invalidation fires
    useEffect(() => {
        const handleInvalidate = async (e) => {
            const { tab } = e.detail;
            if (tab === "groups" && activeTab === "groups") {
                await fetchGroups(true);
            } else if (tab === "dms" && activeTab === "dms") {
                await fetchDMs(true);
            }
        };
        window.addEventListener("chat-inbox-invalidate", handleInvalidate);
        return () => window.removeEventListener("chat-inbox-invalidate", handleInvalidate);
    }, [activeTab, fetchGroups, fetchDMs]);

    const filteredGroups = groups
        ? groups.filter((group) =>
              group.name.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : [];

    const filteredDMs = dms
        ? dms.filter(
              (conv) =>
                  conv.otherParticipant?.name
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  conv.otherParticipant?.username
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()),
          )
        : [];

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur border-b z-10 px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h1 className="text-xl font-bold">💬 Chats</h1>
                    {isAdmin(currentUser) && activeTab === "groups" && (
                        <Button
                            size="sm"
                            onClick={() => setCreateOpen(true)}
                            className="bg-primary text-primary-foreground hover:opacity-90"
                        >
                            <Plus className="w-4 h-4 mr-1" /> New Group
                        </Button>
                    )}
                </div>

                <Tabs
                    defaultValue="dms"
                    value={activeTab}
                    onValueChange={setActiveTab}
                >
                    <TabsList className="w-full mb-3">
                        <TabsTrigger
                            value="dms"
                            className="flex-1 flex items-center gap-2 hover:cursor-pointer"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Direct Messages
                        </TabsTrigger>
                        <TabsTrigger
                            value="groups"
                            className="flex-1 flex items-center gap-2 hover:cursor-pointer"
                        >
                            <Users className="w-4 h-4" />
                            Groups
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={
                            activeTab === "dms"
                                ? "Search conversations..."
                                : "Search groups..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm bg-accent/50 border-border/50 focus-visible:ring-primary/50"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "dms" ? (
                    dmsLoading ? (
                        Array(5)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 px-4 py-3 border-b border-border/50"
                                >
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))
                    ) : filteredDMs.length === 0 ? (
                        <div className="mt-20">
                            <EmptyState
                                icon={MessageSquare}
                                title={
                                    searchQuery
                                        ? "No conversations found"
                                        : "No direct messages yet"
                                }
                                description={
                                    searchQuery
                                        ? "Try searching for something else"
                                        : "Start a conversation from a user's profile"
                                }
                            />
                        </div>
                    ) : (
                        filteredDMs.map((conv) => (
                            <DMChatItem
                                key={conv._id}
                                conversation={conv}
                                currentUserId={currentUser?._id}
                                online={onlineMap[conv._id] || false}
                                onClick={() =>
                                    router.push(`/chats/dm/${conv._id}`)
                                }
                            />
                        ))
                    )
                ) : groupsLoading ? (
                    Array(5)
                        .fill(0)
                        .map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 px-4 py-3 border-b border-border/50"
                            >
                                <Skeleton className="w-12 h-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))
                ) : filteredGroups.length === 0 ? (
                    <div className="mt-20">
                        <EmptyState
                            icon={Users}
                            title={
                                searchQuery
                                    ? "No groups found"
                                    : "No group chats yet"
                            }
                            description={
                                searchQuery
                                    ? "Try searching for something else"
                                    : "Create a group or discover college groups"
                            }
                            actionLabel={searchQuery ? null : "Discover Groups"}
                            onAction={() => router.push("/chats/discover")}
                        />
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <GroupChatItem
                            key={group._id}
                            group={group}
                            currentUserId={currentUser?._id}
                            onClick={() => router.push(`/chats/${group._id}`)}
                        />
                    ))
                )}
            </div>

            {/* Modals */}
            <CreateGroupModal open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    );
}
