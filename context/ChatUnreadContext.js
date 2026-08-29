"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { usePathname } from "next/navigation";
import useUser from "@/hooks/useUser";
import { ensureChatSocket } from "@/lib/chat-socket";

const ChatUnreadContext = createContext({ total: 0, counts: {}, lastSenders: {} });

function idFromMessage(msg) {
    if (!msg) return null;
    return msg.conversationId || msg.groupId || null;
}

function isViewingConversation(pathname, id) {
    const dmPath = `/chats/dm/${id}`;
    const groupPath = `/chats/${id}`;
    return (
        pathname === dmPath ||
        pathname.startsWith(dmPath + "/") ||
        pathname === groupPath ||
        pathname.startsWith(groupPath + "/")
    );
}

async function fetchServerCounts() {
    try {
        const [gRes, dRes] = await Promise.all([
            fetch("/api/groups"),
            fetch("/api/dms"),
        ]);
        const counts = {};
        if (gRes.ok) {
            const { groups } = await gRes.json();
            for (const g of groups || []) counts[String(g._id)] = g.unreadCount || 0;
        }
        if (dRes.ok) {
            const { conversations } = await dRes.json();
            for (const c of conversations || [])
                counts[String(c._id)] = c.unreadCount || 0;
        }
        return counts;
    } catch {
        return null;
    }
}

export function ChatUnreadProvider({ children }) {
    const { user } = useUser();
    const pathname = usePathname();
    const [counts, setCounts] = useState({});

    const myIdRef = useRef(null);
    const pathRef = useRef(pathname);
    pathRef.current = pathname;
    const myId = user?._id || user?.id;
    myIdRef.current = myId;

    // Seed on mount + reconcile after navigation (server resets counts once a
    // conversation is opened/read).
    useEffect(() => {
        let active = true;
        fetchServerCounts().then((c) => {
            if (active && c) setCounts(c);
        });
        return () => {
            active = false;
        };
    }, [pathname, myId]);

    // Real-time: listen on the personal room for every incoming message.
    useEffect(() => {
        if (!myId) return;
        let socket = null;
        let handler = null;
        let cancelled = false;

        ensureChatSocket()
            .then((s) => {
                if (cancelled) return;
                socket = s;
                handler = (msg) => {
                    if (!msg) return;
                    const senderId = msg.sender?._id || msg.senderId;
                    if (
                        senderId &&
                        String(senderId) === String(myIdRef.current)
                    )
                        return;
                    const id = idFromMessage(msg);
                    if (!id) return;
                    // Don't bump the badge for the conversation currently open.
                    if (isViewingConversation(pathRef.current || "", id)) return;
                    const key = String(id);
                    setCounts((prev) => ({
                        ...prev,
                        [key]: (prev[key] || 0) + 1,
                    }));
                };
                socket.on("message:new", handler);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            if (socket && handler) socket.off("message:new", handler);
        };
    }, [myId]);

    const total = useMemo(() => {
        let sum = 0;
        for (const k in counts) sum += counts[k] || 0;
        return Math.min(sum, 99);
    }, [counts]);

    const value = useMemo(() => ({ total, counts }), [total, counts]);

    return (
        <ChatUnreadContext.Provider value={value}>
            {children}
        </ChatUnreadContext.Provider>
    );
}

/** Returns the total unread chat count (DMs + groups). Kept named so the three
 *  nav components don't need import changes. */
export function useChatUnreadCount() {
    return useContext(ChatUnreadContext).total;
}

export function useChatUnread() {
    return useContext(ChatUnreadContext);
}
