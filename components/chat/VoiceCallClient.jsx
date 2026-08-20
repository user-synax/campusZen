"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useParticipants,
    useLocalParticipant,
    useConnectionState,
    useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { micErrorMessage } from "@/lib/callErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Mic,
    MicOff,
    MicOffIcon,
    PhoneOff,
    Loader2,
    Settings2,
    Volume2,
} from "lucide-react";

function parseMeta(meta) {
    try {
        return JSON.parse(meta || "{}");
    } catch {
        return {};
    }
}

function MediaErrorWatcher() {
    const room = useRoomContext();
    useEffect(() => {
        const handler = (e) => {
            toast.error(micErrorMessage(e) || "Microphone error");
        };
        room.on(RoomEvent.MediaDevicesError, handler);
        return () => room.off(RoomEvent.MediaDevicesError, handler);
    }, [room]);
    return null;
}

function ParticipantTile({ p }) {
    const meta = parseMeta(p.metadata);
    const name = p.name || meta.name || "User";
    const avatar = meta.avatar;
    const speaking = p.isSpeaking;
    const muted = !p.isMicrophoneEnabled;
    const initial = (name.charAt(0) || "?").toUpperCase();

    return (
        <div className="flex w-full max-w-[7.5rem] flex-col items-center gap-2">
            <div className="relative">
                <div
                    className={cn(
                        "h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-muted ring-2 transition-all duration-200",
                        speaking
                            ? "scale-[1.04] ring-green-500 shadow-[0_0_0_5px_rgba(34,197,94,0.18)]"
                            : "ring-border",
                    )}
                >
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                            {initial}
                        </div>
                    )}
                </div>

                {muted && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground ring-2 ring-background">
                        <MicOff className="h-3 w-3" />
                    </span>
                )}
            </div>

            <span
                className={cn(
                    "max-w-[6.5rem] truncate text-center text-xs font-medium",
                    speaking ? "text-foreground" : "text-muted-foreground",
                )}
            >
                {name}
                {p.isLocal ? " (you)" : ""}
            </span>
        </div>
    );
}

function RoomView() {
    const participants = useParticipants();
    const count = participants.length;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Volume2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">Voice Channel</p>
                    <p className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "person" : "people"} connected
                    </p>
                </div>
                <div className="ml-auto">
                    <CallStatus />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 place-items-center gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4">
                    {participants.map((p) => (
                        <ParticipantTile key={p.identity} p={p} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function Controls({ selectedDeviceId, onLeave }) {
    const { localParticipant } = useLocalParticipant();
    const connState = useConnectionState();
    const [muted, setMuted] = useState(false);
    const [devices, setDevices] = useState([]);
    const [currentDevice, setCurrentDevice] = useState(selectedDeviceId);
    const [picking, setPicking] = useState(false);

    const refreshDevices = useCallback(async () => {
        try {
            const all = await navigator.mediaDevices.enumerateDevices();
            setDevices(all.filter((d) => d.kind === "audioinput"));
        } catch {
            /* ignore */
        }
    }, []);

    // Populate the device list as soon as we can (labels appear after permission).
    useEffect(() => {
        refreshDevices();
    }, [refreshDevices]);

    // Enable the microphone only once the room is actually connected.
    useEffect(() => {
        if (connState !== ConnectionState.Connected || !localParticipant) return;
        let cancelled = false;
        (async () => {
            try {
                if (!localParticipant.isMicrophoneEnabled) {
                    await localParticipant.setMicrophoneEnabled(true);
                }
                if (currentDevice && !cancelled) {
                    await localParticipant.setMicrophoneDevice(currentDevice);
                }
            } catch (e) {
                toast.error(micErrorMessage(e));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [connState, localParticipant, currentDevice]);

    const toggleMute = async () => {
        if (!localParticipant) return;
        const next = !localParticipant.isMicrophoneEnabled;
        await localParticipant.setMicrophoneEnabled(next);
        setMuted(!next);
    };

    const chooseDevice = async (id) => {
        if (!localParticipant || !id) return;
        try {
            await localParticipant.setMicrophoneDevice(id);
            setCurrentDevice(id);
        } catch (e) {
            toast.error(micErrorMessage(e));
        }
        setPicking(false);
    };

    return (
        <div className="flex items-center justify-center gap-3 border-t border-border bg-background/90 py-4 backdrop-blur">
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="rounded-full active:scale-[0.98]"
                title={muted ? "Unmute" : "Mute"}
            >
                {muted ? (
                    <MicOffIcon className="h-5 w-5 text-red-500" />
                ) : (
                    <Mic className="h-5 w-5" />
                )}
            </Button>

            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        refreshDevices();
                        setPicking((v) => !v);
                    }}
                    className="rounded-full active:scale-[0.98]"
                    title="Switch microphone"
                >
                    <Settings2 className="h-5 w-5" />
                </Button>
                {picking && (
                    <div className="absolute bottom-12 left-1/2 z-20 w-56 -translate-x-1/2 rounded-lg border border-border bg-background p-2">
                        <p className="px-1 pb-1 text-[11px] text-muted-foreground">
                            Microphone
                        </p>
                        {devices.length === 0 && (
                            <p className="px-1 text-[11px] text-muted-foreground">
                                No devices found
                            </p>
                        )}
                        {devices.map((d) => (
                            <button
                                key={d.deviceId}
                                onClick={() => chooseDevice(d.deviceId)}
                                className={cn(
                                    "w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/50",
                                    d.deviceId === currentDevice
                                        ? "font-semibold text-primary"
                                        : "",
                                )}
                            >
                                {d.label || "Microphone"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={onLeave}
                className="rounded-full active:scale-[0.98] hover:bg-red-500/10"
                title="Leave call"
            >
                <PhoneOff className="h-5 w-5 text-red-500" />
            </Button>
        </div>
    );
}

function CallStatus() {
    const connState = useConnectionState();
    const wasConnected = useRef(false);
    const router = useRouter();
    const groupIdRef = useRef(null);
    groupIdRef.current = typeof window !== "undefined" ? window.location.pathname.split("/")[2] : null;

    useEffect(() => {
        if (connState === ConnectionState.Connected) wasConnected.current = true;
    }, [connState]);

    useEffect(() => {
        if (wasConnected.current && connState === ConnectionState.Disconnected) {
            toast("The voice chat ended");
            const t = setTimeout(() => {
                if (groupIdRef.current) router.push(`/chats/${groupIdRef.current}`);
            }, 1500);
            return () => clearTimeout(t);
        }
    }, [connState, router]);

    let label = "Connecting…";
    let color = "text-muted-foreground";
    if (connState === ConnectionState.Connected) {
        label = "Connected";
        color = "text-green-500";
    } else if (
        connState === ConnectionState.Reconnecting ||
        connState === ConnectionState.SignalReconnecting
    ) {
        label = "Reconnecting…";
        color = "text-yellow-500";
    } else if (connState === ConnectionState.Disconnected) {
        label = "Disconnected";
        color = "text-red-500";
    }

    return (
        <div className={cn("flex items-center gap-2 text-xs", color)}>
            {connState !== ConnectionState.Connected && (
                <Loader2 className="h-3 w-3 animate-spin" />
            )}
            <span>{label}</span>
        </div>
    );
}

export default function VoiceCallClient({ token, serverUrl, groupId, selectedDeviceId, onLeave }) {
    const router = useRouter();
    const handleEnded = () => router.push(`/chats/${groupId}`);

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={false}
            audio={true}
            onError={(e) => {
                console.error("[lk] onError", e);
                toast.error(e?.message || "Could not connect to the voice server");
            }}
            onDisconnected={(reason) => {
                console.error("[lk] onDisconnected", reason);
            }}
            className="flex h-full flex-col"
        >
            <MediaErrorWatcher />
            <RoomAudioRenderer />
            <RoomView />
            <Controls selectedDeviceId={selectedDeviceId} onLeave={onLeave || handleEnded} />
        </LiveKitRoom>
    );
}
