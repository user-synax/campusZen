"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, Users, GraduationCap, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CreateStudyRoomDialog({ currentUser, onCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [college, setCollege] = useState("");
  const [requiresVerified, setRequiresVerified] = useState(true);
  const [maxMembers, setMaxMembers] = useState(50);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentUser?.college) {
      setCollege((prev) => prev || currentUser.college);
    }
  }, [open, currentUser?.college]);

  const canSubmit = name.trim().length >= 2 && name.trim().length <= 60 && college.trim().length > 0 && !loading;

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    // Verified gate for verified-only rooms
    if (requiresVerified && !currentUser?.isVerified) {
      toast.error("Only verified students can create verified-only rooms");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/study-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          topic: topic.trim(),
          college: college.trim(),
          requiresVerified,
          maxMembers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || data.message || "Failed to create room");
        return;
      }
      toast.success("Study room created");
      setName("");
      setTopic("");
      setMaxMembers(50);
      setOpen(false);
      if (onCreated) onCreated(data);
    } catch (err) {
      toast.error("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const isVerified = !!currentUser?.isVerified;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="rounded-full bg-white text-black hover:bg-zinc-100 font-semibold gap-2 hover:cursor-pointer">
            <Users className="w-4 h-4" />
            New Study Room
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-[#171717] border-[#262626] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            Create Study Room
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            College-gated LiveKit room. Verified students get priority.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="study-name" className="text-zinc-300 text-xs font-semibold tracking-wide">
              Room name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="study-name"
              placeholder="e.g. DSA Marathon — End Sem"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-zinc-500 focus-visible:ring-[#22c55e]/50"
            />
            <p className="text-[11px] text-zinc-500 text-right">{name.length}/60</p>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label htmlFor="study-topic" className="text-zinc-300 text-xs font-semibold tracking-wide">
              Topic <span className="text-zinc-500 font-normal">(optional)</span>
            </Label>
            <Input
              id="study-topic"
              placeholder="e.g. GATE, DSA, End sem, ML"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={100}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-zinc-500 focus-visible:ring-[#22c55e]/50"
            />
            <p className="text-[11px] text-zinc-500 text-right">{topic.length}/100</p>
          </div>

          {/* College */}
          <div className="space-y-1.5">
            <Label htmlFor="study-college" className="text-zinc-300 text-xs font-semibold tracking-wide flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              College <span className="text-red-400">*</span>
            </Label>
            <Input
              id="study-college"
              placeholder="e.g. IIT Bombay"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="bg-[#0a0a0a] border-[#2a2a2a] text-white placeholder:text-zinc-500 focus-visible:ring-[#22c55e]/50"
            />
            {!college.trim() && currentUser?.college && (
              <p className="text-[11px] text-zinc-500">Default: {currentUser.college}</p>
            )}
          </div>

          {/* Requires Verified */}
          <div className="flex items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#0a0a0a] p-3.5">
            <div className="flex items-start gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${requiresVerified ? "bg-[#22c55e]/15" : "bg-[#262626]"}`}>
                {requiresVerified ? (
                  <ShieldCheck className="w-4 h-4 text-[#22c55e]" />
                ) : (
                  <Lock className="w-4 h-4 text-zinc-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Verified only</p>
                <p className="text-xs text-zinc-500 mt-1">Only verified students can join</p>
              </div>
            </div>
            <Switch
              checked={requiresVerified}
              onCheckedChange={(v) => {
                if (v && !isVerified) {
                  toast.error("You need to be verified to enable this");
                  return;
                }
                setRequiresVerified(v);
              }}
              className="data-[state=checked]:bg-[#22c55e]"
            />
          </div>
          {requiresVerified && !isVerified && (
            <p className="text-xs text-amber-400 -mt-3">You must be verified to create a verified-only room</p>
          )}

          {/* Max members slider */}
          <div className="space-y-3">
            <Label className="text-zinc-300 text-xs font-semibold tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Max members: <span className="text-white font-bold">{maxMembers}</span>
            </Label>
            <Slider
              value={[maxMembers]}
              min={2}
              max={50}
              step={1}
              onValueChange={(vals) => setMaxMembers(vals[0])}
              className="py-2"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>2</span>
              <span>50</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-5 gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {loading ? "Creating..." : "Create Room"}
          </Button>

          <p className="text-[11px] text-zinc-600 text-center">Daily limit: 3 rooms per user</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
