"use client"

import { useState, useEffect } from 'react'
import {
  Search,
  MoreVertical,
  Eye,
  Ban,
  UserCheck,
  ShieldCheck,
  ShieldOff,
  Crown,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import UserAvatar from "@/components/user/UserAvatar"
import AdminActionDialog from "./AdminActionDialog"
import { formatDistanceToNow } from 'date-fns'

export default function AdminUsersTable() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [mounted, setMounted] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 400)
    return () => clearTimeout(timer)
  }, [search, filter, page])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&filter=${filter}&page=${page}`)
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAction = (action, user) => {
    setSelectedUser(user)
    setSelectedAction(action)
    setDialogOpen(true)
  }

  const handleActionConfirm = () => {
    setDialogOpen(false)
    fetchUsers()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#090909]">
      {/* Controls — Framer hairline, 10px input, 100px pill */}
      <div className="sticky top-[57px] sm:top-[64px] z-10 bg-[#090909]/80 backdrop-blur-xl border-b border-[#1a1a1a] px-4 py-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, @username, email…"
            className="pl-9 h-10 bg-[#141414] border-[#262626] rounded-[10px] text-[13px] placeholder:text-[#666] text-white focus-visible:ring-1 focus-visible:ring-[#4ba9e1]/30 focus-visible:border-[#4ba9e1]/30 transition-colors duration-[var(--duration-fast)]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1) }}
          className="h-10 bg-[#141414] border border-[#262626] rounded-[10px] px-3 text-[13px] font-medium text-white focus:ring-1 focus:ring-[#4ba9e1]/30 focus:border-[#4ba9e1]/30 outline-none hover:cursor-pointer transition-colors duration-[var(--duration-fast)] min-w-[140px]"
        >
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="pro">Pro</option>
          <option value="banned">Banned</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* List — t-stagger 40ms */}
      <div className={`flex-1 t-stagger ${mounted ? 'is-shown' : ''}`}>
        {loading && users.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
            <p className="text-[13px] text-[#999]">Loading users…</p>
          </div>
        ) : users.length > 0 ? (
          <div className="divide-y divide-[#1a1a1a]">
            {users.map((user, i) => (
              <div
                key={user._id}
                className="t-stagger-line flex items-center gap-3 px-4 py-3 hover:bg-[#141414] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] group"
                style={{ transitionDelay: `calc(var(--stagger-stagger) * ${Math.min(i, 7)})` }}
              >
                <UserAvatar user={user} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[13px] font-semibold tracking-tight text-white truncate">{user.name}</p>
                    {user.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-[#22c55e15] text-[#4ade80] border border-[#22c55e30]">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    {user.verificationStatus === 'pending' && (
                      <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-[#facc1515] text-[#facc15] border border-[#facc1530]">Pending</span>
                    )}
                    {user.isPro && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-white text-black border border-[#262626]">
                        <Crown className="w-3 h-3" /> Pro
                      </span>
                    )}
                    {(user.role === 'admin' || user.isAdmin) && (
                      <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-[#f59e0b15] text-[#fbbf24] border border-[#f59e0b30]">Admin</span>
                    )}
                    {user.isBanned && (
                      <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-[#ef444415] text-[#f87171] border border-[#ef444430]">Banned</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#999] truncate">
                    @{user.username} · {user.college || 'No college'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#666]">
                    <span className="font-medium text-[#999]">{user.postCount || 0} posts</span>
                    <span>·</span>
                    <span>Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-[#141414] border border-[#262626] text-[#999] hover:text-white hover:bg-[#1c1c1c] hover:border-[#262626] active:scale-[0.96] transition-all duration-[var(--duration-fast)] shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#141414] border-[#262626] text-white p-1.5 rounded-[15px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-[var(--duration-fast)]">
                    <DropdownMenuItem onClick={() => window.open(`/profile/${user.username}`, '_blank')} className="rounded-[10px] text-[13px] focus:bg-[#1c1c1c] focus:text-white hover:cursor-pointer">
                      <Eye className="w-4 h-4 mr-2" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#1a1a1a] my-1" />

                    {/* Verification */}
                    {!user.isVerified ? (
                      <DropdownMenuItem onClick={() => openAction('verify', user)} className="rounded-[10px] text-[13px] focus:bg-[#1c1c1c] focus:text-white hover:cursor-pointer">
                        <ShieldCheck className="w-4 h-4 mr-2 text-[#22c55e]" /> Verify User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => openAction('unverify', user)} className="rounded-[10px] text-[13px] focus:bg-[#1c1c1c] focus:text-white hover:cursor-pointer">
                        <ShieldOff className="w-4 h-4 mr-2 text-[#f59e0b]" /> Revoke Verification
                      </DropdownMenuItem>
                    )}

                    {/* Pro */}
                    {!user.isPro ? (
                      <DropdownMenuItem onClick={() => openAction('grantPro', user)} className="rounded-[10px] text-[13px] focus:bg-white focus:text-black hover:cursor-pointer">
                        <Crown className="w-4 h-4 mr-2" /> Grant Pro (Lifetime)
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => openAction('revokePro', user)} className="rounded-[10px] text-[13px] text-[#f87171] focus:bg-[#ef444415] focus:text-[#f87171] hover:cursor-pointer">
                        <Crown className="w-4 h-4 mr-2 opacity-60" /> Revoke Pro
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="bg-[#1a1a1a] my-1" />
                    {!user.isBanned ? (
                      <DropdownMenuItem onClick={() => openAction('ban', user)} className="rounded-[10px] text-[13px] text-[#f87171] focus:bg-[#ef444415] focus:text-[#f87171] hover:cursor-pointer">
                        <Ban className="w-4 h-4 mr-2" /> Ban User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => openAction('unban', user)} className="rounded-[10px] text-[13px] focus:bg-[#1c1c1c] focus:text-white hover:cursor-pointer">
                        <UserCheck className="w-4 h-4 mr-2 text-[#22c55e]" /> Unban User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-[13px] font-medium text-white">No users found</p>
            <p className="text-[12px] text-[#666] mt-1">Try a different search or filter.</p>
          </div>
        )}
      </div>

      {/* Pagination — pill buttons */}
      {total > 20 && (
        <div className="p-4 border-t border-[#1a1a1a] flex items-center justify-between gap-2 bg-[#090909] sticky bottom-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-9 px-4 rounded-full bg-[#141414] border-[#262626] text-white hover:bg-[#1c1c1c] hover:text-white text-[13px] font-medium active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-[12px] font-medium text-[#999]">Page {page} of {Math.ceil(total / 20)}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="h-9 px-4 rounded-full bg-white text-black hover:bg-white/90 border border-white text-[13px] font-semibold active:scale-[0.98] transition-all duration-[var(--duration-fast)] disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}

      {selectedUser && (
        <AdminActionDialog
          open={dialogOpen}
          action={selectedAction}
          user={selectedUser}
          onConfirm={handleActionConfirm}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  )
}
