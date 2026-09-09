"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ShieldCheck, Crown, Ban, UserCheck } from "lucide-react"
import UserAvatar from "@/components/user/UserAvatar"
import { toast } from "sonner"

const ACTION_CONFIGS = {
  ban: {
    title: 'Ban User',
    description: 'User will be immediately logged out and cannot access CampusZen.',
    icon: <Ban className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#ef4444]',
    color: 'destructive',
    requiresReason: true,
    requiresDuration: true,
    confirmLabel: 'Ban User',
  },
  unban: {
    title: 'Unban User',
    description: 'User will regain access to CampusZen.',
    icon: <UserCheck className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#22c55e]',
    color: 'default',
    requiresReason: false,
    confirmLabel: 'Unban User',
  },
  verify: {
    title: 'Verify User',
    description: 'Grant Verified Student badge for lifetime. User will appear verified instantly.',
    icon: <ShieldCheck className="w-5 h-5 text-black" />,
    iconBg: 'bg-white',
    color: 'default',
    requiresReason: false,
    confirmLabel: 'Verify',
  },
  unverify: {
    title: 'Revoke Verification',
    description: 'Remove verified badge and reset status to none.',
    icon: <ShieldCheck className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#f59e0b]',
    color: 'default',
    requiresReason: false,
    confirmLabel: 'Revoke',
  },
  grantPro: {
    title: 'Grant Pro — Lifetime',
    description: 'Give Pro lifetime access. User unlocks all premium features forever.',
    icon: <Crown className="w-5 h-5 text-black" />,
    iconBg: 'bg-white',
    color: 'default',
    requiresReason: false,
    confirmLabel: 'Grant Pro',
  },
  grantProLifetime: {
    title: 'Grant Pro — Lifetime',
    description: 'Give Pro lifetime access. User unlocks all premium features forever.',
    icon: <Crown className="w-5 h-5 text-black" />,
    iconBg: 'bg-white',
    color: 'default',
    requiresReason: false,
    confirmLabel: 'Grant Pro',
  },
  revokePro: {
    title: 'Revoke Pro',
    description: 'Remove Pro and revert to free tier.',
    icon: <Crown className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#ef4444]',
    color: 'destructive',
    requiresReason: false,
    confirmLabel: 'Revoke Pro',
  },
  revokeProLifetime: {
    title: 'Revoke Pro',
    description: 'Remove Pro and revert to free tier.',
    icon: <Crown className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#ef4444]',
    color: 'destructive',
    requiresReason: false,
    confirmLabel: 'Revoke Pro',
  },
}

export default function AdminActionDialog({ open, action, user, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('7')
  const [loading, setLoading] = useState(false)

  const config = ACTION_CONFIGS[action] || {
    title: 'Admin Action',
    description: 'Are you sure you want to perform this action?',
    icon: <ShieldCheck className="w-5 h-5 text-white" />,
    iconBg: 'bg-[#141414]',
    color: 'default',
    confirmLabel: 'Confirm',
  }

  const handleConfirm = async () => {
    try {
      setLoading(true)
      const payload = { action, reason }
      if (action === 'ban') payload.duration = duration === 'null' ? null : parseInt(duration)
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${config.title} successful`)
        onConfirm(data)
        resetFields()
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      console.error('Admin action failed:', error)
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const resetFields = () => {
    setReason('')
    setDuration('7')
  }

  const handleCancel = () => {
    resetFields()
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-[20px] border border-[#262626] bg-[#141414] gap-0 data-[state=open]:animate-[modalIn_var(--duration-fast)_var(--ease-smooth-out)] data-[state=closed]:animate-[modalOut_var(--duration-quick)_var(--ease-smooth-out)]">
        <DialogHeader className="px-6 pt-6 pb-4 text-left space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.iconBg} border border-[#262626]`}>
              {config.icon}
            </span>
            <DialogTitle className="text-[18px] font-bold tracking-[-0.3px] text-white">{config.title}</DialogTitle>
          </div>
          <p className="text-[13px] leading-relaxed text-[#999]">{config.description}</p>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-[15px] bg-[#090909] border border-[#1a1a1a]">
            <UserAvatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-[13px] tracking-tight text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-[#999] truncate">@{user?.username} · {user?.college || 'No college'}</p>
            </div>
          </div>

          {config.requiresDuration && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-white">Ban Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#090909] border border-[#262626] rounded-[10px] h-10 px-3 text-[13px] text-white focus:ring-1 focus:ring-[#4ba9e1]/30 focus:border-[#4ba9e1]/30 outline-none transition-colors duration-[var(--duration-fast)]"
              >
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="null">Permanent</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-white">
              Reason {config.requiresReason && <span className="text-[#ef4444]">*</span>} <span className="text-[#666] font-normal text-[11px]">(optional for verify/pro)</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={action?.startsWith('grantPro') ? 'Lifetime Pro grant — reason (optional)' : action === 'verify' ? 'Admin verification — note (optional)' : 'Why are you performing this action?'}
              rows={2}
              maxLength={500}
              className="resize-none bg-[#090909] border-[#262626] rounded-[10px] text-[13px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 px-6 py-4 bg-[#090909] border-t border-[#1a1a1a] sm:gap-2">
          <Button variant="outline" className="flex-1 h-10 rounded-full bg-[#1c1c1c] border-[#262626] text-white hover:bg-[#262626] hover:text-white text-[13px] font-medium" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={config.color === 'destructive' ? 'destructive' : 'default'}
            className={`flex-1 h-10 rounded-full text-[13px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] ${config.color === 'destructive' ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white' : 'bg-white text-black hover:bg-white/90'}`}
            disabled={loading || (config.requiresReason && !reason.trim())}
            onClick={handleConfirm}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {config.confirmLabel}
          </Button>
        </DialogFooter>
        <style>{`@keyframes modalIn { from { transform: translate(-50%,-48%) scale(var(--scale-large)); opacity:0; filter: blur(var(--blur-small)); } to { transform: translate(-50%,-50%) scale(1); opacity:1; filter: blur(0); } } @keyframes modalOut { from { transform: translate(-50%,-50%) scale(1); opacity:1; } to { transform: translate(-50%,-48%) scale(var(--scale-large)); opacity:0; filter: blur(var(--blur-small)); } }`}</style>
      </DialogContent>
    </Dialog>
  )
}
