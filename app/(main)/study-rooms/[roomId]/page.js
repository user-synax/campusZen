"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Lock, ShieldCheck, Loader2, BookOpen, GraduationCap, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";

export default function StudyRoomDetailPage() {
  const params = useParams();
  const roomId = params.roomId;
  const router = useRouter();
  const { user: currentUser } = useUser();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/study-rooms/${roomId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Room not found");
        return;
      }
      setRoom(data);
    } catch (e) {
      toast.error("Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const handleJoinLeave = async () => {
    if (!room) return;
    setActionLoading(true);
    try {
      const action = room.isMember ? "leave" : "join";
      const res = await fetch(`/api/study-rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || `Failed to ${action}`);
        return;
      }
      toast.success(action === "join" ? "Joined room" : "Left room");
      setRoom((prev) => ({ ...prev, ...data.room, isMember: action === "join", locked: false }));
      if (action === "leave") {
        // stay but show join button
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnterCall = async () => {
    try {
      const res = await fetch(`/api/study-rooms/${roomId}/token`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to get call token");
        return;
      }
      // For MVP, navigate to call sub-route if exists, else show toast
      router.push(`/study-rooms/${roomId}/call`);
    } catch {
      toast.error("Failed to enter call");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#090909] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white font-semibold">Room not found</p>
        <Button variant="outline" onClick={() => router.push("/study-rooms")} className="mt-4 rounded-full border-[#262626] text-white">
          Back to Study Rooms
        </Button>
      </div>
    );
  }

  const isMember = !!room.isMember;
  const locked = !!room.locked;

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-[#090909]/80 backdrop-blur border-b border-[#262626] px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/study-rooms")} className="rounded-full text-white hover:bg-[#171717]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{room.name}</p>
          <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3" />
            {room.college} · {room.participantCount || room.members?.length || 0}/{room.maxMembers} members
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-6">
        <Card className="bg-[#171717] border-[#262626] p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {room.name}
                {room.requiresVerified ? (
                  locked ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-full px-2 py-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )
                ) : null}
              </h1>
              {room.topic && <p className="text-sm text-zinc-400 mt-1 inline-flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{room.topic}</p>}
              <p className="text-xs text-zinc-500 mt-2">Created by {room.createdBy?.name || "Unknown"} · {new Date(room.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#262626] border border-[#2f2f2f] flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-zinc-400" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#262626] border border-[#2f2f2f] rounded-full px-3 py-1.5 text-zinc-300">
              <Users className="w-3.5 h-3.5" />{room.participantCount || room.members?.length || 0} studying
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs bg-[#262626] border border-[#2f2f2f] rounded-full px-3 py-1.5 text-zinc-300">
              <GraduationCap className="w-3.5 h-3.5" />{room.college}
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            {locked ? (
              <Button disabled className="flex-1 rounded-full bg-[#262626] text-zinc-500 border border-[#2f2f2f] gap-2">
                <Lock className="w-4 h-4" /> Verified only
              </Button>
            ) : isMember ? (
              <>
                <Button onClick={handleEnterCall} className="flex-1 rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold gap-2">
                  <Video className="w-4 h-4" /> Enter Live Room
                </Button>
                <Button variant="outline" onClick={handleJoinLeave} disabled={actionLoading} className="rounded-full border-[#262626] text-zinc-300 hover:bg-[#262626] hover:text-white">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Leave"}
                </Button>
              </>
            ) : (
              <Button onClick={handleJoinLeave} disabled={actionLoading} className="flex-1 rounded-full bg-white text-black hover:bg-zinc-100 font-semibold gap-2">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Join Room
              </Button>
            )}
          </div>

          {room.requiresVerified && !currentUser?.isVerified && !isMember && (
            <p className="text-xs text-amber-400 text-center">Get verified to join this room — <button onClick={() => router.push("/verify-student")} className="underline">Verify now</button></p>
          )}
        </Card>

        {/* Members */}
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Members · {room.members?.length || 0}</h2>
          {Array.isArray(room.members) && room.members.length > 0 ? (
            <div className="grid gap-2">
              {room.members.map((m) => (
                <div key={m._id || m} className="flex items-center gap-3 p-3 rounded-xl bg-[#171717] border border-[#262626]">
                  <Avatar className="h-8 w-8 border border-[#2a2a2a]">
                    <AvatarImage src={m.avatar} alt={m.name} />
                    <AvatarFallback className="bg-[#262626] text-xs font-bold text-white">{m.name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate flex items-center gap-1">{m.name} {m.isVerified && <ShieldCheck className="w-3 h-3 text-[#22c55e]" />}</p>
                    <p className="text-xs text-zinc-500 truncate">@{m.username} · {m.college || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No members yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
