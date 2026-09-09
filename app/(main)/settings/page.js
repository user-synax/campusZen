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
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import useUser from "@/hooks/useUser"
import PushSettings from '@/components/notifications/PushSettings'
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
  const [mounted, setMounted] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)

  // ── Change Password ──
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [passLoading, setPassLoading] = useState(false)
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  // ── Change Email ──
  const [changeEmailOpen, setChangeEmailOpen] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailStep, setEmailStep] = useState(1)
  const [emailForm, setEmailForm] = useState({ newEmail: '', otp: '' })
  const [emailCountdown, setEmailCountdown] = useState(0)

  // ── Delete Account ──
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteStep, setDeleteStep] = useState(1)
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteCountdown, setDeleteCountdown] = useState(0)

  // Login history
  const [loginHistory, setLoginHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

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

  useEffect(() => {
    let timer
    if (emailCountdown > 0) timer = setInterval(() => setEmailCountdown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [emailCountdown])

  useEffect(() => {
    let timer
    if (deleteCountdown > 0) timer = setInterval(() => setDeleteCountdown(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [deleteCountdown])

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

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error("Passwords don't match")
    if (!Object.values(passwordConditions).every(Boolean)) return toast.error("Please meet all password requirements")
    try {
      setPassLoading(true)
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword })
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

  const handleSendEmailOtp = async () => {
    if (!emailForm.newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.newEmail)) return toast.error("Invalid email address")
    setEmailLoading(true)
    const success = await requestOtp(emailForm.newEmail, 'email_change')
    setEmailLoading(false)
    if (success) { setEmailStep(2); setEmailCountdown(60) }
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

  const handleSendDeleteOtp = async () => {
    setDeleteLoading(true)
    const success = await requestOtp(user?.email, 'account_delete')
    setDeleteLoading(false)
    if (success) { setDeleteStep(2); setDeleteCountdown(60) }
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
      window.location.href = '/goodbye'
    } catch (error) {
      toast.error(error.message)
      setDeleteLoading(false)
    }
  }

  const handleEditSave = () => {
    refetchUser()
    toast.success("Profile updated successfully")
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 bg-[#090909]">
        <Loader2 className="w-6 h-6 animate-spin text-white" style={{ animationDuration: '1000ms', animationTimingFunction: 'linear' }} />
        <p className="text-[13px] font-medium tracking-tight text-[#999]">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090909] flex flex-col max-w-[640px] mx-auto w-full">
      {/* ── Header — Framer top-nav 56px, hairline, blur ── */}
      <div className="sticky top-0 z-10 bg-[#090909]/80 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-9 h-9 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-white hover:bg-[#1c1c1c] hover:border-[#2a2a2a] active:scale-[0.97] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold tracking-[-0.8px] leading-none text-white">Settings</h1>
            <p className="text-[11px] font-medium tracking-wide text-[#999] mt-0.5">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* ── Content — t-stagger entrance, 40ms per line, total <300ms ── */}
      <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 custom-scrollbar t-stagger ${mounted ? 'is-shown' : ''}`}>

        {/* Account — pricing-card surface-1, 20px radius, 24px pad */}
        <section className="t-stagger-line rounded-[20px] border border-[#262626] bg-[#141414] overflow-hidden" style={{ transitionDelay: '0ms' }}>
          <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5 border-b border-[#1a1a1a]">
            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-black" />
            </span>
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">Account</h2>
            <span className="ml-auto text-[11px] font-medium text-[#666] hidden sm:block">Profile and contact</span>
          </div>
          <div className="p-2 space-y-1.5">
            <button
              onClick={() => setEditDrawerOpen(true)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-[15px] bg-[#090909] border border-[#1a1a1a] hover:bg-[#1c1c1c] hover:border-[#262626] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-black" />
                </span>
                <div className="text-left">
                  <p className="text-[14px] font-semibold tracking-tight leading-none text-white group-hover:text-white">Edit Profile</p>
                  <p className="text-[12px] leading-none text-[#999] mt-1">Name, bio, avatar and socials</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] shrink-0" />
            </button>

            <button
              onClick={() => setChangeEmailOpen(true)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-[15px] bg-[#090909] border border-[#1a1a1a] hover:bg-[#1c1c1c] hover:border-[#262626] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-[10px] bg-[#1c1c1c] border border-[#262626] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-white" />
                </span>
                <div className="text-left min-w-0">
                  <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Email address</p>
                  <p className="text-[12px] leading-none text-[#999] mt-1 truncate max-w-[180px] sm:max-w-[240px]">{user?.email}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] shrink-0" />
            </button>
          </div>
        </section>

        {/* Security — Lock, Change Password + Recent Logins */}
        <section className="t-stagger-line t-stagger-line--2 rounded-[20px] border border-[#262626] bg-[#141414] overflow-hidden" style={{ transitionDelay: 'calc(var(--stagger-stagger) * 1)' }}>
          <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5 border-b border-[#1a1a1a]">
            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-black" />
            </span>
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">Security</h2>
          </div>
          <div className="p-2 space-y-3">
            <button
              onClick={() => setChangePasswordOpen(true)}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-[15px] bg-[#090909] border border-[#1a1a1a] hover:bg-[#1c1c1c] hover:border-[#262626] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4 text-black" />
                </span>
                <span className="text-left">
                  <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Change password</p>
                  <p className="text-[12px] leading-none text-[#999] mt-1">Update and sign out other devices</p>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] shrink-0" />
            </button>

            <div className="rounded-[15px] bg-[#090909] border border-[#1a1a1a] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                <p className="text-[13px] font-semibold tracking-tight text-white">Recent logins</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutAll}
                  disabled={loggingOutAll}
                  className="h-7 px-3 rounded-full bg-[#141414] border border-[#262626] text-[11px] font-semibold text-[#999] hover:text-white hover:bg-[#1c1c1c] hover:border-[#262626] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:cursor-pointer disabled:opacity-50"
                >
                  {loggingOutAll ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                  Log out all
                </Button>
              </div>
              <div className="p-2">
                {loadingHistory ? (
                  <div className="px-3 py-6 flex items-center justify-center gap-2 text-[12px] text-[#666]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history…
                  </div>
                ) : loginHistory.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] font-medium text-[#666]">No recent logins</p>
                ) : (
                  <div className="space-y-1.5">
                    {loginHistory.map((login, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-[10px] bg-[#141414] border border-[#262626]/60 hover:border-[#262626] hover:bg-[#1c1c1c] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]">
                        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                          {login.device === 'Mobile' ? <Smartphone className="w-4 h-4 text-black" /> : login.device === 'Tablet' ? <Tablet className="w-4 h-4 text-black" /> : <Monitor className="w-4 h-4 text-black" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium tracking-tight leading-none text-white truncate">{login.browser} on {login.device}</p>
                          <p className="text-[11px] leading-none text-[#999] mt-1">
                            {new Date(login.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {login.isSuspicious && (
                          <span className="text-[10px] font-bold tracking-wide px-2 py-1 rounded-full bg-[#ef444415] text-[#f87171] border border-[#ef444430] shrink-0">Suspicious</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Verification — Framer spotlight-aware, but restrained */}
        <section className="t-stagger-line t-stagger-line--3 rounded-[20px] border border-[#262626] bg-[#141414] overflow-hidden" style={{ transitionDelay: 'calc(var(--stagger-stagger) * 2)' }}>
          <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5 border-b border-[#1a1a1a]">
            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
            </span>
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">Verification</h2>
            {user?.isVerified && user?.verificationStatus === 'verified' && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold tracking-wide px-2.5 py-1 rounded-full bg-white text-black">● Verified</span>
            )}
          </div>
          <div className="p-3">
            {user?.isVerified && user?.verificationStatus === 'verified' ? (
              <div className="flex items-center justify-between p-3 rounded-[15px] bg-[#090909] border border-[#1a1a1a]">
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] bg-[#22c55e] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </span>
                  <span>
                    <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Verified student</p>
                    <p className="text-[12px] leading-none text-[#999] mt-1">{user?.verificationType === 'college_email' ? 'Via college email' : 'Via college ID'}</p>
                  </span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#22c55e15] text-[#4ade80] border border-[#22c55e30]">Verified</span>
              </div>
            ) : user?.verificationStatus === 'pending' ? (
              <div className="flex items-center justify-between p-3 rounded-[15px] bg-[#090909] border border-[#1a1a1a]">
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] bg-[#facc15] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-black" />
                  </span>
                  <span>
                    <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Under review</p>
                    <p className="text-[12px] leading-none text-[#999] mt-1">Your ID is being verified</p>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#facc1515] text-[#facc15] border border-[#facc1530]">Pending</span>
              </div>
            ) : user?.verificationStatus === 'rejected' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-[15px] bg-[#090909] border border-[#1a1a1a]">
                  <span className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-[10px] bg-[#ef4444] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </span>
                    <span>
                      <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Verification rejected</p>
                      <p className="text-[12px] leading-none text-[#999] mt-1">You can resubmit with a different ID</p>
                    </span>
                  </span>
                  <span className="inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#ef444415] text-[#f87171] border border-[#ef444430]">Rejected</span>
                </div>
                {user?.verificationRejectedReason && (
                  <div className="mx-1 p-3 rounded-[10px] bg-[#ef444408] border border-[#ef444420] text-[12px] leading-relaxed text-[#999]">
                    <span className="font-semibold text-[#f87171]">Reason: </span>{user.verificationRejectedReason}
                  </div>
                )}
                <button
                  onClick={() => router.push('/verify-student')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold px-4 py-2.5 rounded-full bg-white text-black hover:bg-white/90 active:scale-[0.98] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Resubmit ID
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/verify-student')}
                className="w-full flex items-center justify-between p-3 rounded-[15px] bg-[#090909] border border-[#1a1a1a] hover:bg-[#1c1c1c] hover:border-[#262626] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-[10px] bg-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-black" />
                  </span>
                  <span className="text-left">
                    <p className="text-[14px] font-semibold tracking-tight leading-none text-white group-hover:text-white">Get verified</p>
                    <p className="text-[12px] leading-none text-[#999] mt-1">Upload college ID to earn the badge</p>
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] shrink-0" />
              </button>
            )}
          </div>
        </section>

        {/* Notifications — PushSettings */}
        <section className="t-stagger-line t-stagger-line--4 rounded-[20px] border border-[#262626] bg-[#141414] overflow-hidden" style={{ transitionDelay: 'calc(var(--stagger-stagger) * 3)' }}>
          <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2.5 border-b border-[#1a1a1a]">
            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5 text-black" />
            </span>
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-white">Notifications</h2>
          </div>
          <div className="p-4 sm:p-5 bg-[#090909]/40">
            <PushSettings />
          </div>
        </section>

        {/* Danger zone — destructive actions, Framer: hairline + 15px cards, pill CTA language */}
        <section className="t-stagger-line t-stagger-line--5 space-y-3" style={{ transitionDelay: 'calc(var(--stagger-stagger) * 4)' }}>
          <div className="flex items-center gap-2 px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            <h2 className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#f87171]">Danger zone</h2>
          </div>
          <div className="rounded-[20px] border border-[#262626] bg-[#141414] p-2 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3.5 rounded-[15px] bg-[#090909] border border-[#1a1a1a] hover:bg-[#1c1c1c] hover:border-[#262626] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
            >
              <span className="w-9 h-9 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center shrink-0 group-hover:border-[#2a2a2a] transition-colors">
                <LogOut className="w-4 h-4 text-white" />
              </span>
              <span className="flex-1 text-left">
                <p className="text-[14px] font-semibold tracking-tight leading-none text-white">Log out</p>
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#666] mt-1">Sign out of this device</p>
              </span>
              <ChevronRight className="w-4 h-4 text-[#666] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] shrink-0 hidden sm:block" />
            </button>

            <button
              onClick={() => { setDeleteStep(1); setDeleteAccountOpen(true) }}
              className="w-full flex items-center gap-3 p-3.5 rounded-[15px] bg-[#ef44440a] border border-[#ef444420] hover:bg-[#ef444414] hover:border-[#ef444430] hover:translate-x-[1px] active:scale-[0.99] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group text-left hover:cursor-pointer"
            >
              <span className="w-9 h-9 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-white" />
              </span>
              <span className="flex-1 text-left">
                <p className="text-[14px] font-semibold tracking-tight leading-none text-[#f87171]">Delete account</p>
                <p className="text-[11px] font-medium tracking-wide uppercase text-[#f87171]/70 mt-1">Permanently remove your data</p>
              </span>
              <ChevronRight className="w-4 h-4 text-[#f87171]/60 group-hover:text-[#f87171] group-hover:translate-x-0.5 transition-all duration-[var(--duration-fast)] shrink-0 hidden sm:block" />
            </button>
          </div>
          <p className="text-center text-[11px] font-medium tracking-[0.08em] uppercase text-[#666] pt-4">
            CampusZen v1.2.0 • Built with <span className="text-[#f87171]">♥</span> for students
          </p>
        </section>
      </div>

      {/* Edit Profile Drawer — panel 400/350, uses app transitions tokens */}
      <EditProfileDrawer
        user={user}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSave={handleEditSave}
      />

      {/* Change Password — Sheet: bottom panel, Framer surfaces */}
      <Sheet open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <SheetContent side="bottom" className="rounded-t-[20px] border-t border-[#262626] bg-[#141414] p-0 max-w-[640px] mx-auto max-h-[92vh] overflow-hidden flex flex-col data-[state=open]:animate-[panelIn_var(--duration-slow)_var(--ease-smooth-out)] data-[state=closed]:animate-[panelOut_var(--duration-medium)_var(--ease-smooth-out)]">
          <SheetHeader className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-[#1a1a1a] text-left">
            <SheetTitle className="text-[18px] font-bold tracking-[-0.3px] text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"><Lock className="w-4 h-4 text-black" /></span>
              Change password
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-relaxed text-[#999] mt-1.5">
              Keep your account secure with a strong password.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handlePasswordChange} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 custom-scrollbar">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-white">Current password</Label>
                <div className="relative">
                  <Input
                    type={showOldPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="pr-10 bg-[#090909] border-[#262626] rounded-[10px] h-11 text-[14px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30 focus-visible:border-[#4ba9e1]/30 transition-colors duration-[var(--duration-fast)]"
                    required
                  />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors duration-[var(--duration-fast)] hover:cursor-pointer">
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-white">New password</Label>
                <div className="relative">
                  <Input
                    type={showNewPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="pr-10 bg-[#090909] border-[#262626] rounded-[10px] h-11 text-[14px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30"
                    required
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors duration-[var(--duration-fast)] hover:cursor-pointer">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.newPassword && (
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px] font-bold tracking-widest uppercase">
                      <span className="text-[#666]">Strength</span>
                      <span className={`${getPasswordStrength().value === 100 ? 'text-[#22c55e]' : getPasswordStrength().value === 66 ? 'text-[#facc15]' : 'text-[#ef4444]'}`}>{getPasswordStrength().label}</span>
                    </div>
                    <Progress value={getPasswordStrength().value} className="h-1.5 bg-[#1c1c1c]" indicatorClassName={getPasswordStrength().color} />
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      <span className="flex items-center gap-2 text-[12px]"><CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.length ? 'text-[#22c55e]' : 'text-[#333]'}`} /><span className={passwordConditions.length ? 'text-white' : 'text-[#666]'}>Min 8 characters</span></span>
                      <span className="flex items-center gap-2 text-[12px]"><CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.uppercase ? 'text-[#22c55e]' : 'text-[#333]'}`} /><span className={passwordConditions.uppercase ? 'text-white' : 'text-[#666]'}>At least 1 uppercase</span></span>
                      <span className="flex items-center gap-2 text-[12px]"><CheckCircle2 className={`w-3.5 h-3.5 ${passwordConditions.number ? 'text-[#22c55e]' : 'text-[#333]'}`} /><span className={passwordConditions.number ? 'text-white' : 'text-[#666]'}>At least 1 number</span></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium text-white">Confirm new password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="pr-10 bg-[#090909] border-[#262626] rounded-[10px] h-11 text-[14px] placeholder:text-[#666] focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors duration-[var(--duration-fast)] hover:cursor-pointer">
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={passLoading} className="w-full h-11 rounded-full bg-white text-black hover:bg-white/90 text-[14px] font-semibold tracking-tight active:scale-[0.98] active:duration-[var(--duration-quick)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:cursor-pointer disabled:opacity-50">
              {passLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save new password
            </Button>
          </form>
          <style>{`@keyframes panelIn { from { transform: translateY(8px) scale(var(--scale-medium)); opacity:0; filter: blur(var(--blur-small)); } to { transform: translateY(0) scale(1); opacity:1; filter: blur(0); } } @keyframes panelOut { from { transform: translateY(0) scale(1); opacity:1; } to { transform: translateY(8px) scale(var(--scale-tiny)); opacity:0; filter: blur(var(--blur-small)); } }`}</style>
        </SheetContent>
      </Sheet>

      {/* Change Email — Sheet */}
      <Sheet open={changeEmailOpen} onOpenChange={(v) => { setChangeEmailOpen(v); if (!v) { setEmailStep(1); setEmailForm({ newEmail: '', otp: '' }) } }}>
        <SheetContent side="bottom" className="rounded-t-[20px] border-t border-[#262626] bg-[#141414] p-0 max-w-[640px] mx-auto max-h-[92vh] overflow-hidden flex flex-col data-[state=open]:animate-[panelIn_var(--duration-slow)_var(--ease-smooth-out)] data-[state=closed]:animate-[panelOut_var(--duration-medium)_var(--ease-smooth-out)]">
          <SheetHeader className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-[#1a1a1a] text-left">
            <SheetTitle className="text-[18px] font-bold tracking-[-0.3px] text-white flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-black" /></span>
              Change email
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-relaxed text-[#999] mt-1.5">
              We&apos;ll send a 6-digit code to your new address.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
            {emailStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-white">New email address</Label>
                  <Input
                    type="email"
                    placeholder="new@college.edu"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                    className="bg-[#090909] border-[#262626] rounded-[10px] h-11 text-[14px] placeholder:text-[#666] focus-visible:ring-[#4ba9e1]/30"
                  />
                </div>
                <Button onClick={handleSendEmailOtp} disabled={emailLoading} className="w-full h-11 rounded-full bg-white text-black hover:bg-white/90 text-[14px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] hover:cursor-pointer disabled:opacity-50">
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-center space-y-3">
                  <p className="text-[13px] leading-relaxed text-[#999]">Enter the code sent to <span className="font-semibold text-white">{emailForm.newEmail}</span></p>
                  <Input
                    className="w-full max-w-[280px] mx-auto text-center text-[22px] font-bold tracking-[0.4em] h-14 bg-[#090909] border-[#262626] rounded-[10px] placeholder:text-[#333] focus-visible:ring-[#4ba9e1]/30"
                    maxLength={6}
                    value={emailForm.otp}
                    onChange={(e) => setEmailForm({ ...emailForm, otp: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••••"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-3">
                  <Button onClick={handleVerifyEmail} disabled={emailLoading} className="w-full h-11 rounded-full bg-white text-black hover:bg-white/90 text-[14px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] hover:cursor-pointer disabled:opacity-50">
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify & update
                  </Button>
                  <div className="flex justify-center">
                    <Button variant="ghost" onClick={handleSendEmailOtp} disabled={emailCountdown > 0 || emailLoading} className="h-8 px-3 rounded-full text-[12px] font-semibold text-[#999] hover:text-white hover:bg-[#1c1c1c] transition-colors duration-[var(--duration-fast)] hover:cursor-pointer">
                      {emailCountdown > 0 ? <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Resend in {emailCountdown}s</span> : <span className="flex items-center gap-1.5"><RefreshCw className="w-3 h-3" /> Resend OTP</span>}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Account — AlertDialog, destructive, Framer hairlines */}
      <AlertDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <AlertDialogContent className="max-w-[420px] rounded-[20px] border border-[#262626] bg-[#141414] p-0 overflow-hidden gap-0 data-[state=open]:animate-[modalIn_var(--duration-fast)_var(--ease-smooth-out)] data-[state=closed]:animate-[modalOut_var(--duration-quick)_var(--ease-smooth-out)]">
          {deleteStep === 1 ? (
            <>
              <div className="px-6 pt-6 pb-4 text-center">
                <span className="w-14 h-14 rounded-full bg-[#ef444415] border border-[#ef444430] flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7 text-[#ef4444]" />
                </span>
                <AlertDialogTitle className="text-[20px] font-bold tracking-tight text-white mt-4">Delete account?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] leading-relaxed text-[#999] mt-2">
                  This will permanently delete your account, posts and VP. This action <span className="font-semibold text-white underline underline-offset-4 decoration-[#ef4444]/50">cannot be undone</span>.
                </AlertDialogDescription>
              </div>
              <div className="p-4 bg-[#090909] border-t border-[#1a1a1a] flex flex-col gap-2">
                <Button onClick={handleSendDeleteOtp} disabled={deleteLoading} variant="destructive" className="w-full h-11 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-[14px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] hover:cursor-pointer">
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send confirmation OTP
                </Button>
                <AlertDialogCancel className="w-full h-11 rounded-full bg-[#1c1c1c] border border-[#262626] text-white hover:bg-[#262626] hover:text-white text-[14px] font-medium m-0 hover:cursor-pointer transition-colors duration-[var(--duration-fast)]">Cancel</AlertDialogCancel>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-6 pb-4 text-center">
                <span className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7 text-black" />
                </span>
                <AlertDialogTitle className="text-[20px] font-bold tracking-tight text-white mt-4">Confirm deletion</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] leading-relaxed text-[#999] mt-1">
                  Enter the code sent to <span className="font-semibold text-white">{user?.email}</span>
                </AlertDialogDescription>
                <div className="flex justify-center pt-5">
                  <Input
                    className="w-[260px] text-center text-[22px] font-bold tracking-[0.4em] h-14 bg-[#090909] border-[#262626] rounded-[10px] placeholder:text-[#333] focus-visible:ring-[#ef4444]/30"
                    maxLength={6}
                    value={deleteOtp}
                    onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="p-4 bg-[#090909] border-t border-[#1a1a1a] flex flex-col gap-2">
                <Button onClick={handleFinalDelete} disabled={deleteLoading} variant="destructive" className="w-full h-11 rounded-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-[14px] font-semibold shadow-[0_2px_10px_rgba(239,68,68,0.25)] active:scale-[0.98] transition-all duration-[var(--duration-fast)] hover:cursor-pointer">
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Permanently delete
                </Button>
                <div className="flex justify-center">
                  <Button variant="ghost" onClick={handleSendDeleteOtp} disabled={deleteCountdown > 0 || deleteLoading} className="h-8 px-3 rounded-full text-[12px] font-semibold text-[#999] hover:text-white hover:bg-[#1c1c1c] hover:cursor-pointer">
                    {deleteCountdown > 0 ? <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Resend in {deleteCountdown}s</span> : <span className="flex items-center gap-1.5 text-white"><RefreshCw className="w-3 h-3" /> Resend OTP</span>}
                  </Button>
                </div>
                <AlertDialogCancel className="w-full h-11 rounded-full bg-[#1c1c1c] border border-[#262626] text-white hover:bg-[#262626] hover:text-white text-[14px] font-medium m-0 hover:cursor-pointer">Cancel</AlertDialogCancel>
              </div>
            </>
          )}
          <style>{`@keyframes modalIn { from { transform: scale(var(--scale-large)); opacity:0; filter: blur(var(--blur-small)); } to { transform: scale(1); opacity:1; filter: blur(0); } } @keyframes modalOut { from { transform: scale(1); opacity:1; } to { transform: scale(var(--scale-large)); opacity:0; filter: blur(var(--blur-small)); } }`}</style>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
