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
import { toast } from "sonner";
import { Mic, MicOff, PhoneOff, Loader2, Settings2, MicOffIcon } from "lucide-react";

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

function ParticipantRow() {
    const participants = useParticipants();
    return (
        <div className="flex flex-wrap gap-5 justify-center px-4 py-6">
            {participants.map((p) => {
                const meta = parseMeta(p.metadata);
                const name = p.name || meta.name || "User";
                const avatar = meta.avatar;
                return (
                    <div key={p.identity} className="flex flex-col items-center gap-1.5 w-20">
                        <div
                            className={`w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center bg-muted transition-colors ${
                                p.isSpeaking ? "border-green-500" : "border-border"
                            }`}
                        >
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xl font-bold">
                                    {name.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate w-full text-center">
                            {name}
                            {p.isLocal ? " (you)" : ""}
                        </span>
                    </div>
                );
            })}
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
        <div className="flex items-center justify-center gap-3 py-4 border-t border-border bg-background/90 backdrop-blur">
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="rounded-full active:scale-[0.98]"
                title={muted ? "Unmute" : "Mute"}
            >
                {muted ? (
                    <MicOffIcon className="w-5 h-5 text-red-500" />
                ) : (
                    <Mic className="w-5 h-5" />
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
                    <Settings2 className="w-5 h-5" />
                </Button>
                {picking && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-56 bg-background border border-border rounded-lg p-2 z-20">
                        <p className="text-[11px] text-muted-foreground px-1 pb-1">
                            Microphone
                        </p>
                        {devices.length === 0 && (
                            <p className="text-[11px] text-muted-foreground px-1">
                                No devices found
                            </p>
                        )}
                        {devices.map((d) => (
                            <button
                                key={d.deviceId}
                                onClick={() => chooseDevice(d.deviceId)}
                                className={`w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent/50 ${
                                    d.deviceId === currentDevice
                                        ? "text-primary font-semibold"
                                        : ""
                                }`}
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
                <PhoneOff className="w-5 h-5 text-red-500" />
            </Button>
        </div>
    );
}

function CallStatus({ onEnded }) {
    const connState = useConnectionState();
    const wasConnected = useRef(false);

    useEffect(() => {
        if (connState === ConnectionState.Connected) wasConnected.current = true;
    }, [connState]);

    useEffect(() => {
        if (wasConnected.current && connState === ConnectionState.Disconnected) {
            toast("The voice chat ended");
            const t = setTimeout(() => onEnded(), 1500);
            return () => clearTimeout(t);
        }
    }, [connState, onEnded]);

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
        <div className={`flex items-center justify-center gap-2 text-xs ${color}`}>
            {connState !== ConnectionState.Connected && (
                <Loader2 className="w-3 h-3 animate-spin" />
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
            className="flex flex-col h-full"
        >
            <MediaErrorWatcher />
            <RoomAudioRenderer />
            <div className="flex-1 overflow-y-auto">
                <ParticipantRow />
            </div>
            <CallStatus onEnded={handleEnded} />
            <Controls selectedDeviceId={selectedDeviceId} onLeave={onLeave} />
        </LiveKitRoom>
    );
}
