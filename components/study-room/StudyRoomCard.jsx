"use client";

import { Users, Lock, GraduationCap, BookOpen, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function StudyRoomCard({ room, currentUser, onJoin }) {
  const isMember = room.isMember || (currentUser && room.members?.some((id) => String(id) === String(currentUser._id) || String(id?._id) === String(currentUser._id)));
  const locked = room.locked || (room.requiresVerified && !currentUser?.isVerified && !isMember);
  const creator = room.createdBy;
  const membersCount = room.membersCount ?? room.participantCount ?? room.members?.length ?? 0;

  const handleClick = (e) => {
    e.preventDefault();
    if (locked) return;
    if (onJoin) onJoin(room);
  };

  return (
    <Card className="group relative overflow-hidden border border-[#262626] bg-[#171717] hover:bg-[#1e1e1e] transition-all duration-200 hover:border-[#2a2a2a] hover:shadow-lg hover:shadow-black/20">
      {/* Verified left accent if requiresVerified */}
      {room.requiresVerified && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#22c55e] opacity-80 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="p-4 pl-5 flex flex-col gap-3">
        {/* Header: name + lock */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[15px] leading-tight truncate text-white group-hover:text-white transition-colors">
                {room.name}
              </h3>
              {room.requiresVerified && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase rounded-full px-2 py-0.5 border ${
                    locked
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                  }`}
                >
                  {locked ? <Lock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  {locked ? "Locked" : "Verified"}
                </span>
              )}
            </div>

            {/* Topic pill */}
            {room.topic ? (
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium bg-[#262626] text-zinc-300 border border-[#2f2f2f] rounded-full px-2.5 py-1">
                <BookOpen className="w-3 h-3 text-zinc-400" />
                {room.topic}
              </span>
            ) : (
              <span className="mt-1.5 inline-flex text-xs text-zinc-500">No topic · General study</span>
            )}
          </div>

          {/* Participant count pill */}
          <div className="shrink-0 flex items-center gap-1.5 bg-[#262626] border border-[#2f2f2f] rounded-full px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-white">{membersCount}</span>
            <span className="text-[10px] text-zinc-500">/ {room.maxMembers || 50}</span>
          </div>
        </div>

        {/* College + creator row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#262626] border border-[#2f2f2f] flex items-center justify-center shrink-0">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400 truncate max-w-[160px]">{room.college}</span>
          </div>

          {creator && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Avatar className="h-6 w-6 border border-[#2f2f2f]">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="bg-[#262626] text-[10px] font-bold text-white">
                  {creator.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-zinc-500 hidden sm:inline truncate max-w-[90px]">{creator.name}</span>
              {creator.isVerified && <ShieldCheck className="w-3 h-3 text-[#22c55e] shrink-0" />}
            </div>
          )}
        </div>

        {/* Footer: join / enter */}
        <div className="flex items-center gap-2 pt-1">
          {locked ? (
            <Button
              disabled
              size="sm"
              className="w-full rounded-full bg-[#262626] text-zinc-500 border border-[#2f2f2f] cursor-not-allowed gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Verified only
            </Button>
          ) : isMember ? (
            <Button
              onClick={handleClick}
              size="sm"
              className="w-full rounded-full bg-white text-black hover:bg-zinc-100 font-semibold gap-1.5 hover:cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              Enter Room
            </Button>
          ) : (
            <Button
              onClick={handleClick}
              size="sm"
              className="w-full rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold gap-1.5 hover:cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              Join
            </Button>
          )}

          <span className="hidden sm:inline-flex text-[11px] text-zinc-600 whitespace-nowrap">
            {room.participantCount > 0 ? `${room.participantCount} studying` : "Be first to join"}
          </span>
        </div>

        {/* Last active */}
        {room.lastActiveAt && (
          <p className="text-[10px] text-zinc-600 -mt-1">
            Active {new Date(room.lastActiveAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(room.lastActiveAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </Card>
  );
}
