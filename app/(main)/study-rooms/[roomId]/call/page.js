"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PhoneCall, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { micErrorMessage } from "@/lib/callErrors";
import dynamic from "next/dynamic";

const VoiceCallClient = dynamic(() => import("@/components/chat/VoiceCallClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Loading voice engine…</span>
    </div>
  ),
});

export default function StudyRoomCallPage() {
  const params = useParams();
  const roomId = params.roomId;
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [token, setToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [joining, setJoining] = useState(false);
  const [micError, setMicError] = useState(null);
  const [micState, setMicState] = useState("idle");
  const [permState, setPermState] = useState("unknown");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      setSelectedDeviceId((prev) => prev || mics[0]?.deviceId || "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let perm;
    const update = (p) => {
      setPermState(p.state);
      if (p.state === "granted") setMicState("granted");
      else if (p.state === "denied") {
        setMicState("denied");
        setMicError("Microphone access is blocked. Allow it via the lock icon in your browser's address bar, then tap Retry.");
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
        const r1 = await fetch(`/api/study-rooms/${roomId}`);
        if (r1.ok) {
          const data = await r1.json();
          setRoom(data);
        }
      } catch {}
      // populate mic devices after permission check
      await loadDevices();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const requestMic = useCallback(async () => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setMicError("Microphone needs a secure (HTTPS) connection. Open the app on localhost or over HTTPS.");
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
      if (typeof window !== "undefined") {
        console.error("[mic] getUserMedia failed", { name: e?.name, message: e?.message });
      }
      setMicError(micErrorMessage(e));
      setMicState(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "denied" : "blocked");
      return false;
    }
  }, [loadDevices]);

  const join = useCallback(async () => {
    setJoining(true);
    setMicError(null);
    try {
      const ok = await requestMic();
      if (!ok) {
        setJoining(false);
        return;
      }
      const res = await fetch(`/api/study-rooms/${roomId}/token`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not join study room");
        setJoining(false);
        return;
      }
      setLivekitUrl(data.url || data.livekitUrl);
      setToken(data.token);
    } catch (e) {
      toast.error("Could not join study room");
      setJoining(false);
    }
  }, [roomId, requestMic]);

  const leave = useCallback(() => {
    router.push(`/study-rooms/${roomId}`);
  }, [roomId, router]);

  if (token && livekitUrl) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#090909] text-white">
        <VoiceCallClient token={token} serverUrl={livekitUrl} groupId={roomId} selectedDeviceId={selectedDeviceId} onLeave={leave} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#090909] text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#262626] bg-[#090909]">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/study-rooms/${roomId}`)} className="rounded-full text-white hover:bg-[#171717]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{room?.name || "Study room call"}</p>
          <p className="text-xs text-zinc-500">{room?.college || "LiveKit"}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-24 h-24 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center">
          <PhoneCall className="w-10 h-10 text-[#22c55e]" />
        </div>

        {micState === "granted" ? (
          <p className="text-sm text-[#22c55e]">Microphone ready</p>
        ) : micState === "denied" || micState === "blocked" ? (
          <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-red-500">
              <MicOff className="w-5 h-5" />
              <span className="font-semibold text-sm">Microphone access needed</span>
            </div>
            <p className="text-xs text-zinc-400">{micError}</p>
            {permState === "denied" ? (
              <p className="text-[11px] text-zinc-500">
                Your browser has this site <b>blocked</b>. Open lock icon → Site settings → Microphone → <b>Allow</b>, then reload.
              </p>
            ) : (
              <p className="text-[11px] text-zinc-500">Tap <b>Allow microphone</b> and choose Allow when prompted.</p>
            )}
            <Button onClick={requestMic} className="mt-1 gap-2 bg-white text-black hover:bg-zinc-100">
              <Mic className="w-4 h-4" /> Allow microphone
            </Button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 text-center">Tap Join and allow microphone access when your browser asks.</p>
        )}

        <div className="w-full max-w-xs">
          <label className="text-[11px] text-zinc-500 px-1">Microphone</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full mt-1 rounded-md border border-[#262626] bg-[#171717] text-white px-3 py-2 text-sm"
          >
            {devices.length === 0 && <option value="">No microphones found</option>}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Microphone"}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={join} disabled={joining} className="rounded-full px-6 gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold">
          {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          {joining ? "Connecting…" : "Join study room"}
        </Button>
        <p className="text-[11px] text-zinc-600">Room: {room?.livekitRoomName || `study-${roomId}`}</p>
      </div>
    </div>
  );
}
