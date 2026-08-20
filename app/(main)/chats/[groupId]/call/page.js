"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PhoneCall, Mic, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { micErrorMessage } from "@/lib/callErrors";
import { useCallStore } from "@/lib/store/callStore";
import dynamic from "next/dynamic";

const VoiceCallClient = dynamic(() => import("@/components/chat/VoiceCallClient"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Connecting to voice chat…</span>
        </div>
    ),
});

export default function GroupCallPage() {
    const params = useParams();
    const groupId = params.groupId;
    const router = useRouter();

    const [group, setGroup] = useState(null);
    const [joining, setJoining] = useState(false);
    const [token, setToken] = useState(null);
    const [livekitUrl, setLivekitUrl] = useState(null);
    const [micError, setMicError] = useState(null);
    // micState: idle | granted | denied | blocked
    const [micState, setMicState] = useState("idle");
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState("");

    const callData = useCallStore((s) => s.calls?.[groupId]);
    const setCall = useCallStore((s) => s.setCall);

    const loadDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            const mics = all.filter((d) => d.kind === "audioinput");
            setDevices(mics);
            setSelectedDeviceId((prev) => prev || mics[0]?.deviceId || "");
        } catch {
            /* ignore */
        }
    }, []);

    // Reflect the browser's mic permission so we can guide the user
    useEffect(() => {
        if (!navigator.permissions?.query) return;
        let perm;
        const update = (p) => {
            if (p.state === "granted") setMicState("granted");
            else if (p.state === "denied") {
                setMicState("denied");
                setMicError(
                    "Microphone access is blocked. Allow it via the mic/lock icon in your browser's address bar, then tap Retry.",
                );
            } else setMicState("idle");
        };
        navigator.permissions
            .query({ name: "microphone" })
            .then((p) => {
                perm = p;
                update(p);
                p.addEventListener("change", () => update(p));
            })
            .catch(() => {});
        return () => perm?.removeEventListener?.("change", () => update(perm));
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const r1 = await fetch(`/api/groups/${groupId}`);
                if (r1.ok) setGroup(await r1.json());
                const r2 = await fetch(`/api/groups/${groupId}/calls`);
                if (r2.ok) {
                    const d = await r2.json();
                    if (d.active) {
                        setCall(groupId, {
                            active: true,
                            participantCount: d.participantCount || 0,
                            participants: d.participants || [],
                        });
                    }
                }
            } catch {
                /* ignore */
            }
        })();
        loadDevices();
    }, [groupId, loadDevices, setCall]);

    // Ask for microphone permission. Must run inside a user gesture so the
    // browser actually shows the prompt.
    const requestMic = useCallback(async () => {
        if (typeof window !== "undefined" && !window.isSecureContext) {
            setMicError(
                "Microphone needs a secure (HTTPS) connection. Open the app on localhost or over HTTPS.",
            );
            setMicState("blocked");
            return false;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            setMicError(null);
            setMicState("granted");
            await loadDevices();
            return true;
        } catch (e) {
            setMicError(micErrorMessage(e));
            setMicState(
                e?.name === "NotAllowedError" || e?.name === "SecurityError"
                    ? "denied"
                    : "blocked",
            );
            return false;
        }
    }, [loadDevices]);

    const join = useCallback(async () => {
        setJoining(true);
        setMicError(null);
        try {
            // Always (re)request permission here — this is the user gesture that
            // makes the browser prompt appear. If already granted it returns instantly.
            const ok = await requestMic();
            if (!ok) {
                setJoining(false);
                return;
            }
            let res = await fetch(`/api/groups/${groupId}/calls/start`, {
                method: "POST",
            });
            let data = await res.json();
            if (res.status === 409) {
                res = await fetch(`/api/groups/${groupId}/calls/token`, {
                    method: "POST",
                });
                data = await res.json();
            }
            if (!res.ok) {
                toast.error(data.error || data.message || "Could not join voice chat");
                setJoining(false);
                return;
            }
            setLivekitUrl(data.livekitUrl);
            setToken(data.token);
        } catch (e) {
            toast.error("Could not join voice chat");
            setJoining(false);
        }
    }, [groupId, requestMic]);

    const leave = useCallback(() => {
        router.push(`/chats/${groupId}`);
    }, [groupId, router]);

    if (token && livekitUrl) {
        return (
            <div className="flex flex-col h-[100dvh] bg-background">
                <VoiceCallClient
                    token={token}
                    serverUrl={livekitUrl}
                    groupId={groupId}
                    selectedDeviceId={selectedDeviceId}
                    onLeave={leave}
                />
            </div>
        );
    }

    const liveCount = callData?.participantCount || 0;

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/chats/${groupId}`)}
                    className="rounded-full active:scale-[0.98]"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                        {group?.name || "Group voice chat"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {liveCount > 0 ? `${liveCount} in call` : "Voice chat"}
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <PhoneCall className="w-10 h-10 text-primary" />
                </div>

                {/* Mic permission status */}
                {micState === "granted" ? (
                    <p className="text-sm text-green-500">Microphone ready</p>
                ) : micState === "denied" ? (
                    <div className="max-w-sm text-center text-sm text-red-500">
                        {micError}
                    </div>
                ) : micState === "blocked" ? (
                    <div className="max-w-sm flex items-start gap-2 text-center text-sm text-red-500">
                        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{micError}</span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center">
                        Tap Join and allow microphone access when your browser asks.
                    </p>
                )}

                {/* Device picker */}
                <div className="w-full max-w-xs">
                    <label className="text-[11px] text-muted-foreground px-1">
                        Microphone
                    </label>
                    <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                        {devices.length === 0 && (
                            <option value="">No microphones found</option>
                        )}
                        {devices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || "Microphone"}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <Button
                        onClick={join}
                        disabled={joining}
                        className="rounded-full px-6 gap-2 active:scale-[0.98]"
                    >
                        {joining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Mic className="w-4 h-4" />
                        )}
                        {joining ? "Connecting…" : "Join voice chat"}
                    </Button>

                    {micState === "denied" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={requestMic}
                            className="text-xs active:scale-[0.98]"
                        >
                            Retry microphone access
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
