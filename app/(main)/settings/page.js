"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Bell, 
  Lock, 
  Eye, 
  EyeOff,
  User, 
  Shield, 
  ShieldCheck,
  Smartphone, 
  LogOut, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  AlertTriangle,
  Trash2,
  KeyRound,
  Mail,
  RefreshCw,
  Monitor,
  Tablet,
  AlertOctagon,
  Laptop
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import useUser from "@/hooks/useUser"
import { useLayoutMode } from "@/context/LayoutModeContext"
import { cn } from "@/lib/utils"
import PushSettings from '@/components/notifications/PushSettings'

import ConfirmDeleteModal from '@/components/chat/ConfirmDeleteModal'
import EditProfileDrawer from '@/components/user/EditProfileDrawer'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: userLoading, refetch: refetchUser } = useUser()
  const { layoutMode, setLayoutMode } = useLayoutMode()

  const [saving, setSaving] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)

  // ── Feature 1: Change Password State ──
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  // ── Feature 2: Change Email State ──
  const [changeEmailOpen, setChangeEmailOpen] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailStep, setEmailStep] = useState(1) // 1: Email, 2: OTP
  const [emailForm, setEmailForm] = useState({ newEmail: '', otp: '' })
  const [emailCountdown, setEmailCountdown] = useState(0)

  // ── Feature 3: Delete Account State ──
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1) // 1: Warning, 2: OTP
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteCountdown, setDeleteCountdown] = useState(0)
  
  // Local state for toggles (Only keeping features that can be implemented now)
  const [settings, setSettings] = useState({
    pushNotifications: true,
    privateProfile: false,
    showOnlineStatus: true,
  })

  // Login history state
  const [loginHistory, setLoginHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  // Fetch login history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true)
        const res = await fetch('/api/users/login-history')
        const data = await res.json()
        if (res.ok) setLoginHistory(data.logins || [])
      } catch (err) {
        console.error('Failed to fetch login history:', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [])

  const handleLogoutAll = async () => {
    if (!window.confirm('This will log you out from all devices. Continue?')) return
    try {
      setLoggingOutAll(true)
      const res = await fetch('/api/auth/logout-all', { method: 'POST' })
      if (res.ok) {
        toast.success('Logged out from all devices')
        window.location.href = '/login'
      } else {
        toast.error('Failed to logout')
      }
    } catch (err) {
      toast.error('Network error')
    } finally {
      setLoggingOutAll(false)
    }
  }

  // ── Countdown Timer Logic ──
  useEffect(() => {
    let timer
    if (emailCountdown > 0) {
      timer = setInterval(() => setEmailCountdown(prev => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [emailCountdown])

  useEffect(() => {
    let timer
    if (deleteCountdown > 0) {
      timer = setInterval(() => setDeleteCountdown(prev => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [deleteCountdown])

  // ── Password Strength / Validation Logic ──
  const passwordConditions = {
    length: passwordForm.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordForm.newPassword),
    number: /[0-9]/.test(passwordForm.newPassword),
  }

  const getPasswordStrength = () => {
    const met = Object.values(passwordConditions).filter(Boolean).length
    if (passwordForm.newPassword === '') return { label: '', color: 'bg-muted', value: 0 }
    if (met === 3) return { label: 'Strong', color: 'bg-green-500', value: 100 }
    if (met === 2) return { label: 'Medium', color: 'bg-yellow-500', value: 66 }
    return { label: 'Weak', color: 'bg-red-500', value: 33 }
  }

  // ── Shared OTP Request Logic ──
  const requestOtp = async (email, purpose) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP')
      
      toast.success('OTP sent to your email')
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    }
  }

  // ── Feature 1: Change Password Handler ──
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("Passwords don't match")
    }
    if (!Object.values(passwordConditions).every(Boolean)) {
      return toast.error("Please meet all password requirements")
    }

    try {
      setPassLoading(true)
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldPassword: passwordForm.oldPassword, 
          newPassword: passwordForm.newPassword 
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to change password')
      
      toast.success("Password updated successfully")
      setChangePasswordOpen(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setPassLoading(false)
    }
  }

  // ── Feature 2: Change Email Handlers ──
  const handleSendEmailOtp = async () => {
    if (!emailForm.newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) {
      return toast.error("Invalid email address")
    }
    setEmailLoading(true)
    const success = await requestOtp(emailForm.newEmail, 'email_change')
    setEmailLoading(false)
    if (success) {
      setEmailStep(2)
      setEmailCountdown(60)
    }
  }

  const handleVerifyEmail = async () => {
    if (emailForm.otp.length !== 6) return toast.error("Enter a 6-digit OTP")
    
    try {
      setEmailLoading(true)
      const res = await fetch('/api/users/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Verification failed')
      
      toast.success("Email updated successfully")
      setChangeEmailOpen(false)
      setEmailForm({ newEmail: '', otp: '' })
      setEmailStep(1)
      refetchUser()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Feature 3: Delete Account Handlers ──
  const handleSendDeleteOtp = async () => {
    setDeleteLoading(true)
    const success = await requestOtp(user?.email, 'account_delete')
    setDeleteLoading(false)
    if (success) {
      setDeleteStep(2)
      setDeleteCountdown(60)
    }
  }

  const handleFinalDelete = async () => {
    if (deleteOtp.length !== 6) return toast.error("Enter a 6-digit OTP")
    
    try {
      setDeleteLoading(true)
      const res = await fetch('/api/users/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: deleteOtp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Deletion failed')
      
      toast.success("Account permanently deleted")
      // Force redirect to goodbye page
      window.location.href = '/goodbye'
    } catch (error) {
      toast.error(error.message)
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    if (user?.settings) {
      // Filter out any dummy settings that might be in DB
      const activeSettings = {
        pushNotifications: user.settings.pushNotifications ?? true,
        privateProfile: user.settings.privateProfile ?? false,
        showOnlineStatus: user.settings.showOnlineStatus ?? true,
      }
      setSettings(activeSettings)
    }
  }, [user])

  const handleEditSave = (updatedUser) => {
    // refetchUser will update the global state and our local user object
    refetchUser()
    toast.success("Profile updated successfully")
  }

  const handleToggle = async (key) => {
    const newVal = !settings[key]
    setSettings(prev => ({ ...prev, [key]: newVal }))
    
    try {
      setSaving(true)
      const res = await fetch('/api/users/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { ...settings, [key]: newVal } })
      })
      
      if (!res.ok) {
        // Rollback on failure
        setSettings(prev => ({ ...prev, [key]: !newVal }))
        toast.error("Failed to update setting")
      } else {
        toast.success("Settings updated", {
          icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
        })
      }
    } catch (error) {
      setSettings(prev => ({ ...prev, [key]: !newVal }))
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } catch (error) {
      toast.error("Logout failed")
    }
  }

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background max-w-2xl mx-auto w-full">
      
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b border-border z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
        
        {/* Account Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Account</h2>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => setEditDrawerOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 rounded-2xl border border-border transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm group-hover:text-primary transition-colors">Edit Profile</span>
                <span className="text-xs text-muted-foreground">Change name, bio, and avatar</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setChangeEmailOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 rounded-2xl border border-border transition-colors group"
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm group-hover:text-primary transition-colors">Email Address</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Security Section (Feature 1) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Security</h2>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => setChangePasswordOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 rounded-2xl border border-border transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-sm group-hover:text-primary transition-colors">Change Password</span>
                  <span className="text-xs text-muted-foreground">Update your account password</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Login History */}
            <div className="p-4 bg-card rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Recent Logins</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutAll}
                  disabled={loggingOutAll}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  {loggingOutAll ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Logout all'}
                </Button>
              </div>
              
              {loadingHistory ? (
                <div className="text-xs text-muted-foreground">Loading...</div>
              ) : loginHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No login history</p>
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((login, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-accent/30">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {login.device === 'Mobile' ? <Smartphone className="w-4 h-4 text-muted-foreground" /> :
                         login.device === 'Tablet' ? <Tablet className="w-4 h-4 text-muted-foreground" /> :
                         <Monitor className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">
                          {login.browser} on {login.device}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(login.createdAt).toLocaleDateString('en-IN', { 
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {login.isSuspicious && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                          Suspicious
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Verification Status Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Verification</h2>
          </div>
          <div className="bg-card rounded-3xl border border-border overflow-hidden">
            <div className="p-4">
              {user?.isVerified && user?.verificationStatus === 'verified' ? (
                /* ── Verified ── */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#22c55e15' }}>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Verified Student</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.verificationType === 'college_email' ? 'Verified via college email' : 'Verified via college ID'}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: '#22c55e15', color: '#4ade80', border: '1px solid #22c55e30' }}>
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>

              ) : user?.verificationStatus === 'pending' ? (
                /* ── Pending ── */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#facc1515' }}>
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Under Review</p>
                      <p className="text-xs text-muted-foreground">Your college ID is being verified</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: '#facc1515', color: '#facc15', border: '1px solid #facc1530' }}>
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                </div>

              ) : user?.verificationStatus === 'rejected' ? (
                /* ── Rejected ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ef444415' }}>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">Verification Rejected</p>
                        <p className="text-xs text-muted-foreground">You can resubmit with a different ID</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ background: '#ef444415', color: '#f87171', border: '1px solid #ef444430' }}>
                      Rejected
                    </span>
                  </div>
                  {user?.verificationRejectedReason && (
                    <div className="ml-[52px] p-3 rounded-xl text-xs text-muted-foreground leading-relaxed"
                      style={{ background: '#ef444408', border: '1px solid #ef444420' }}>
                      <span className="font-semibold text-red-400">Reason: </span>{user.verificationRejectedReason}
                    </div>
                  )}
                  <button
                    onClick={() => router.push('/verify-student')}
                    className="ml-[52px] flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 2px 8px #ef444440' }}>
                    <Upload className="w-3 h-3" /> Resubmit ID
                  </button>
                </div>

              ) : (
                /* ── Not verified ── */
                <button
                  onClick={() => router.push('/verify-student')}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#22c55e10' }}>
                      <ShieldCheck className="w-5 h-5 text-green-500/60" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-sm group-hover:text-green-400 transition-colors">Get Verified</span>
                      <span className="text-xs text-muted-foreground">Upload your college ID to get a badge</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Bell className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Notifications</h2>
          </div>
          <div className="bg-card rounded-3xl border border-border p-4">
            <PushSettings />
          </div>
        </section>

        {/* Privacy Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Privacy & Safety</h2>
          </div>
          <div className="bg-card rounded-3xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors border-b border-border">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Private Profile</span>
                <span className="text-xs text-muted-foreground">Only followers can see your posts</span>
              </div>
              <Switch 
                checked={settings.privateProfile} 
                onCheckedChange={() => handleToggle('privateProfile')}
              />
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Online Status</span>
                <span className="text-xs text-muted-foreground">Show when you&apos;re active</span>
              </div>
              <Switch 
                checked={settings.showOnlineStatus} 
                onCheckedChange={() => handleToggle('showOnlineStatus')}
              />
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Monitor className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Appearance</h2>
          </div>
          <div className="bg-card rounded-3xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-4">
              Choose how navigation appears on desktop. This is saved on this device only.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { mode: "sidebar", title: "Sidebar", desc: "Classic left navigation" },
                { mode: "dock", title: "Dock", desc: "Floating bottom dock" },
              ].map((opt) => {
                const selected = layoutMode === opt.mode
                return (
                  <button
                    key={opt.mode}
                    onClick={() => setLayoutMode(opt.mode)}
                    className={cn(
                      "card-chunky text-left p-4 space-y-3 transition-colors hover:cursor-pointer",
                      selected ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                    )}
                  >
                    <div className="h-20 rounded-xl border border-border bg-background overflow-hidden relative">
                      {opt.mode === "sidebar" ? (
                        <div className="absolute left-0 top-0 h-full w-1/4 bg-primary/20 border-r border-primary/30" />
                      ) : (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-3 rounded-full bg-primary/30 border border-primary/40" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{opt.title}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </div>
                    {selected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-4 pb-10">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-4 h-14 px-4 text-destructive hover:bg-destructive/10 rounded-2xl border border-destructive/20"
          >
            <LogOut className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">Log out</span>
              <span className="text-[10px] opacity-80 italic uppercase tracking-tighter">Sign out of your account</span>
            </div>
          </Button>

          <Button 
            variant="ghost" 
            onClick={() => {
              setDeleteStep(1)
              setDeleteAccountOpen(true)
            }}
            className="w-full justify-start gap-4 h-14 px-4 text-destructive hover:bg-destructive/10 rounded-2xl border border-destructive/20 mt-3"
          >
            <Trash2 className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">Delete Account</span>
              <span className="text-[10px] opacity-80 italic uppercase tracking-tighter">Permanently remove your data</span>
            </div>
          </Button>

          <p className="text-center text-[10px] text-muted-foreground mt-8 uppercase tracking-widest font-bold opacity-50">
            CampusX v0.1.0 • Built with ❤️ for Students
          </p>
        </section>

      </div>

      {/* Edit Profile Drawer */}
      <EditProfileDrawer 
        user={user}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSave={handleEditSave}
      />

      {/* Feature 1: Change Password Sheet */}
      <Sheet open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-t-primary/20 bg-card p-6 pb-12 max-w-2xl mx-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary" /> Change Password
            </SheetTitle>
            <SheetDescription>
              Keep your account secure by updating your password regularly.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input 
                    type={showOldPass ? "text" : "password"} 
                    placeholder="••••••••"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                    className="pr-10 bg-background border-border rounded-xl h-12"
                    required
                  />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input 
                    type={showNewPass ? "text" : "password"} 
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="pr-10 bg-background border-border rounded-xl h-12"
                    required
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {passwordForm.newPassword && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-muted-foreground">Strength</span>
                      <span style={{ color: getPasswordStrength().color.replace('bg-', '') }}>{getPasswordStrength().label}</span>
                    </div>
                    <Progress value={getPasswordStrength().value} className="h-1.5" indicatorClassName={getPasswordStrength().color} />
                    
                    <div className="grid grid-cols-1 gap-1.5 pt-2">
                      <div className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.length ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <span className={passwordConditions.length ? 'text-foreground' : 'text-muted-foreground'}>Min 8 characters</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.uppercase ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <span className={passwordConditions.uppercase ? 'text-foreground' : 'text-muted-foreground'}>At least 1 uppercase</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.number ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                        <span className={passwordConditions.number ? 'text-foreground' : 'text-muted-foreground'}>At least 1 number</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPass ? "text" : "password"} 
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="pr-10 bg-background border-border rounded-xl h-12"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={passLoading} className="w-full h-12 rounded-xl text-base font-bold">
              {passLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save New Password"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Feature 2: Change Email Sheet */}
      <Sheet open={changeEmailOpen} onOpenChange={setChangeEmailOpen}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-t-primary/20 bg-card p-6 pb-12 max-w-2xl mx-auto">
          <SheetHeader className="pb-6">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" /> Change Email
            </SheetTitle>
            <SheetDescription>
              We'll send a verification code to your new email address.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {emailStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>New Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="new@college.edu"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                    className="bg-background border-border rounded-xl h-12"
                  />
                </div>
                <Button onClick={handleSendEmailOtp} disabled={emailLoading} className="w-full h-12 rounded-xl text-base font-bold">
                  {emailLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Send OTP"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <Label className="text-muted-foreground">Enter the 6-digit code sent to {emailForm.newEmail}</Label>
                  <div className="flex justify-center pt-4">
                    <Input 
                      className="w-48 text-center text-2xl font-bold tracking-[0.5em] h-14 bg-background border-border rounded-xl"
                      maxLength={6}
                      value={emailForm.otp}
                      onChange={(e) => setEmailForm({...emailForm, otp: e.target.value.replace(/\D/g, '')})}
                      placeholder="••••••"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button onClick={handleVerifyEmail} disabled={emailLoading} className="w-full h-12 rounded-xl text-base font-bold">
                    {emailLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Verify & Update"}
                  </Button>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="ghost" 
                      onClick={handleSendEmailOtp} 
                      disabled={emailCountdown > 0 || emailLoading}
                      className="text-xs font-semibold"
                    >
                      {emailCountdown > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Resend in {emailCountdown}s
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3" /> Resend OTP
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Feature 3: Delete Account Alert Dialog */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-3xl border-destructive/20 bg-card p-6">
          {deleteStep === 1 ? (
            <>
              <AlertDialogHeader className="items-center text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <AlertDialogTitle className="text-2xl font-bold text-destructive">Delete Account?</AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-relaxed">
                  This will permanently delete your account, all posts, VP (Viper Coins), and data. This action <span className="font-bold text-foreground underline underline-offset-4">cannot be undone</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 mt-6 sm:flex-col">
                <Button 
                  onClick={handleSendDeleteOtp} 
                  disabled={deleteLoading}
                  variant="destructive" 
                  className="w-full h-12 rounded-xl font-bold text-base"
                >
                  {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Send Confirmation OTP"}
                </Button>
                <AlertDialogCancel className="w-full h-12 rounded-xl border-border bg-transparent hover:bg-accent text-base mt-2">
                  Cancel
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader className="items-center text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <AlertDialogTitle className="text-2xl font-bold">Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Enter the 6-digit code sent to <strong>{user?.email}</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="flex justify-center py-6">
                <Input 
                  className="w-48 text-center text-2xl font-bold tracking-[0.5em] h-14 bg-background border-border rounded-xl"
                  maxLength={6}
                  value={deleteOtp}
                  onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                />
              </div>

              <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                <Button 
                  onClick={handleFinalDelete} 
                  disabled={deleteLoading}
                  variant="destructive" 
                  className="w-full h-12 rounded-xl font-bold text-base shadow-lg shadow-destructive/20"
                >
                  {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Permanently Delete"}
                </Button>
                
                <div className="flex justify-center mt-2">
                   <Button 
                    variant="ghost" 
                    onClick={handleSendDeleteOtp} 
                    disabled={deleteCountdown > 0 || deleteLoading}
                    className="text-xs font-semibold"
                  >
                    {deleteCountdown > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Resend in {deleteCountdown}s
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-primary">
                        <RefreshCw className="w-3 h-3" /> Resend OTP
                      </span>
                    )}
                  </Button>
                </div>

                <AlertDialogCancel className="w-full h-12 rounded-xl border-border bg-transparent hover:bg-accent text-base mt-2">
                  Cancel
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
