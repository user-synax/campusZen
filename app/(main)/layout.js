"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Dock from "@/components/layout/Dock";
import RightPanel from "@/components/layout/RightPanel";
import MobileNav from "@/components/layout/MobileNav";
import MobileFAB from "@/components/layout/MobileFAB";
import { useLayoutMode } from "@/context/LayoutModeContext";
import FeedRefreshButton from "@/components/feed/FeedRefreshButton";
import { Toaster } from "@/components/ui/sonner";
import VerificationBanner from "@/components/shared/VerificationBanner";
import useUser from "@/hooks/useUser";
import { NotificationProvider } from "@/context/NotificationContext";
import { CatProvider } from "@/context/CatContext";
import { useRealtime } from "@/hooks/useRealtime";
import CustomCursor from "@/components/shared/FloatingCat";
import CursorSelector from "@/components/shared/CursorSelector";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTabTitle } from "@/hooks/useTabTitle";
import ChatSocketProvider from "@/components/chat/ChatSocketProvider";
import { ChatUnreadProvider } from "@/context/ChatUnreadContext";
import { toast } from "sonner";
import clientCache from "@/lib/client-cache";
import { useCallStore } from "@/lib/store/callStore";

// Component to initialize tab title
function TabTitleInitializer() {
    useTabTitle();
    return null;
}

export default function MainLayout({ children }) {
    const { user } = useUser();
    const pathname = usePathname();
    const router = useRouter();

    // Register service worker and handle push permissions
    usePushNotifications();

    // Subscribe to user-level realtime events via Socket.IO user room
    const invalidateGroupCache = useCallback(() => {
        clientCache.delete(JSON.stringify(["tab", "chats-groups"]));
    }, []);
    const invalidateDMCache = useCallback(() => {
        clientCache.delete(JSON.stringify(["tab", "chats-dms"]));
    }, []);
    useRealtime({
        "group:created": invalidateGroupCache,
        "group:joined": invalidateGroupCache,
        "group:left": useCallback(({ groupId }) => {
            invalidateGroupCache();
            if (pathname === `/chats/${groupId}`) {
                router.push("/chats");
            }
        }, [invalidateGroupCache, pathname, router]),
        "message:new": useCallback(() => {
            invalidateGroupCache();
            invalidateDMCache();
            window.dispatchEvent(new CustomEvent("chat-inbox-invalidate", { detail: { tab: "groups" } }));
            window.dispatchEvent(new CustomEvent("chat-inbox-invalidate", { detail: { tab: "dms" } }));
        }, [invalidateGroupCache, invalidateDMCache]),
        "vc:started": useCallback(({ groupId, startedBy }) => {
            const name = startedBy?.name || "Someone";
            toast(`${name} started a voice chat`, {
                action: {
                    label: "Join",
                    onClick: () => {
                        if (pathname === `/chats/${groupId}`) {
                            window.dispatchEvent(new CustomEvent("vc-join", { detail: { groupId } }));
                        } else {
                            sessionStorage.setItem("pendingVcJoin", groupId);
                            router.push(`/chats/${groupId}`);
                        }
                    },
                },
            });
        }, [pathname, router]),
        "vc:update": useCallback(({ groupId, active, participantCount, participants }) => {
            if (!active) {
                useCallStore.getState().clearCall(groupId);
            } else {
                useCallStore.getState().setCall(groupId, {
                    active,
                    participantCount,
                    participants,
                });
            }
        }, []),
    }, { disabled: !user?._id });

    // Check if we are inside a specific chat room
    const isChatRoom = pathname.startsWith("/chats/") && pathname !== "/chats";

    // Check if we are in study rooms (list page or room page)
    const isStudyRoom = pathname.startsWith("/study-rooms");

    // Check if we are on whiteboard (full screen mode)
    const isWhiteboard = pathname === "/whiteboard";

    // Read chosen navigation mode (sidebar | dock), persisted via localStorage
    const { layoutMode } = useLayoutMode();

    return (
        <NotificationProvider>
                <CatProvider>
                    <ChatSocketProvider />
                    <TabTitleInitializer />
                <ChatUnreadProvider>
                <div
                    className={`flex min-h-screen bg-background text-foreground selection:bg-primary/20 overflow-hidden ${isWhiteboard ? "fixed inset-0" : ""}`}
                >
                    {/* Fixed Left Sidebar - Hide for whiteboard */}
                    {!isWhiteboard && layoutMode === "sidebar" && <Sidebar />}

                    {/* Floating Bottom Dock (alternative nav mode) - Hide for whiteboard */}
                    {!isWhiteboard && layoutMode === "dock" && <Dock />}

                    {/* Main Content Area — small layout */}
                    <main
                        className={`flex-1 flex flex-col ${isWhiteboard ? "m-0 w-screen h-screen" : layoutMode === "dock" ? "md:ml-0 lg:ml-0" : "md:ml-[68px] lg:ml-[260px]"} ${isStudyRoom || isWhiteboard ? "" : "xl:mr-[340px]"} ${isChatRoom ? "pb-0 h-[100dvh] overflow-hidden" : layoutMode === "dock" ? "pb-20 md:pb-28 min-h-screen" : "pb-20 min-h-screen md:pb-0"} overflow-x-hidden`}
                    >
                        {/* Broadcast banner — site-wide announcement */}
                        {/* Verification prompt for unverified students */}
                        {!isStudyRoom && !isWhiteboard && (
                            <VerificationBanner />
                        )}

                        <div
                            className={`w-full ${isStudyRoom ? "max-w-7xl mx-auto" : isWhiteboard ? "" : "max-w-[680px] sm:border-x"} border-border ${isChatRoom ? "flex-1 h-full overflow-hidden" : isWhiteboard ? "flex-1 h-full" : "min-h-screen"} bg-background sm:bg-background/50 sm:backdrop-blur-sm ${!isStudyRoom && !isWhiteboard ? "mx-auto self-center" : ""}`}
                        >
                            {children}
                        </div>
                    </main>

                    {/* Fixed Right Panel - Hide for study rooms and whiteboard */}
                    {!isStudyRoom && !isWhiteboard && <RightPanel />}

                    {/* Mobile Bottom Navigation — Hide in chat room */}
                    {!isChatRoom && <MobileNav />}

                    {/* Mobile Floating Action Button — Hide in chat room */}
                    {!isChatRoom && <MobileFAB />}

                    {/* Feed Refresh Button — Only on feed page */}
                    {pathname === "/feed" && <FeedRefreshButton />}

                    {/* Custom Cursor */}
                    {!isWhiteboard && <CustomCursor />}
                    {/* Cursor Selector Popup */}
                    <CursorSelector />

                    {/* Toast Notifications */}
                    <Toaster position="bottom-center" />
                </div>
                </ChatUnreadProvider>
            </CatProvider>
        </NotificationProvider>
    );
}
