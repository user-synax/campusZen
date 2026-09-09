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
import { Loader2 } from "lucide-react"
import UserAvatar from "@/components/user/UserAvatar"
import { toast } from "sonner"

const ACTION_CONFIGS = {
  ban: {
    title: 'Ban User',
    description: 'User will be immediately logged out and cannot access CampusZen.',
    icon: '🚫',
    color: 'destructive',
    requiresReason: true,
    requiresDuration: true
  },
  unban: {
    title: 'Unban User',
    description: 'User will regain access to CampusZen.',
    icon: '✅',
    color: 'default',
    requiresReason: false
  },
}

export default function AdminActionDialog({ open, action, user, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('7')
  const [loading, setLoading] = useState(false)

  const config = ACTION_CONFIGS[action] || {
    title: 'Admin Action',
    description: 'Are you sure you want to perform this action?',
    icon: '📝',
    color: 'default'
  }

  const handleConfirm = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason,
          duration: action === 'ban' ? (duration === 'null' ? null : parseInt(duration)) : undefined,
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Action ${config.title} performed successfully`)
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{config.icon}</span>
            {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl border border-border/50">
            <UserAvatar user={user} size="sm" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground px-1">{config.description}</p>

          {config.requiresDuration && (
            <div className="space-y-1.5 px-1">
              <label className="text-sm font-medium">Ban Duration</label>
              <select 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="null">Permanent</option>
              </select>
            </div>
          )}

          {config.requiresReason && (
            <div className="space-y-1.5 px-1">
              <label className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you performing this action?"
                rows={2}
                maxLength={500}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0 pt-2 px-1">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={config.color === 'destructive' ? 'destructive' : 'default'}
            className="flex-1"
            disabled={loading || (config.requiresReason && !reason.trim())}
            onClick={handleConfirm}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm ${config.title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
