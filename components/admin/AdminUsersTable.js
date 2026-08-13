"use client"

import { useState, useEffect } from 'react'
import {
  Search,
  MoreVertical,
  Eye,
  Ban,
  UserCheck,
  Shield,
  ShieldOff,
  Trash2,
  BadgeCheck,
  BadgeX,
  Coins,
  LogOut,
  Loader2
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
import useUser from '@/hooks/useUser'
import { isFounder } from '@/lib/admin'

export default function AdminUsersTable() {
  const { user: currentUser } = useUser()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 500)
    return () => clearTimeout(timer)
  }, [search, filter, page])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/users?search=${search}&filter=${filter}&page=${page}`)
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
    fetchUsers() // Refresh the table
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex gap-2 p-4 border-b border-border sticky top-[105px] bg-background z-10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, @username, email..."
            className="pl-9 bg-accent/30 border-border/50"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-accent/30 border border-border/50 rounded-md px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="all">All Users</option>
          <option value="banned">Banned</option>
          <option value="verified">Verified</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* List */}
      <div className="flex-1">
        {loading && users.length === 0 ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length > 0 ? (
          users.map((user) => (
            <div key={user._id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 border-b border-border/50 transition-colors">
              <UserAvatar user={user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  {user.isVerified && <span className="text-[10px] text-blue-400">✅</span>}
                  {user.isAdmin && <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded bg-amber-400/10">Admin</span>}
                  {user.isBanned && <span className="text-[10px] text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded bg-red-400/10">Banned</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username} · {user.college || 'No college'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">{user.postCount || 0} posts</span>
                  <span>·</span>
                  <span>Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Action menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background border-border shadow-xl">
                  <DropdownMenuItem onClick={() => window.open(`/profile/${user.username}`, '_blank')}>
                    <Eye className="w-4 h-4 mr-2" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />

                  {!user.isVerified ? (
                    <DropdownMenuItem onClick={() => openAction('verify', user)}>
                      <BadgeCheck className="w-4 h-4 mr-2" /> Verify User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => openAction('unverify', user)}>
                      <BadgeX className="w-4 h-4 mr-2" /> Remove Verification
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => openAction('award_coins', user)}>
                    <Coins className="w-4 h-4 mr-2" /> Award VP
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => openAction('force_logout', user)}>
                    <LogOut className="w-4 h-4 mr-2" /> Force Logout
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border/50" />

                  {!user.isBanned ? (
                    <DropdownMenuItem 
                      onClick={() => openAction('ban', user)} 
                      className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                    >
                      <Ban className="w-4 h-4 mr-2" /> Ban User
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => openAction('unban', user)}>
                      <UserCheck className="w-4 h-4 mr-2" /> Unban User
                    </DropdownMenuItem>
                  )}

                  {isFounder(currentUser) && (
                    <>
                      <DropdownMenuSeparator className="bg-border/50" />
                      {!user.isAdmin ? (
                        <DropdownMenuItem onClick={() => openAction('make_admin', user)}>
                          <Shield className="w-4 h-4 mr-2" /> Make Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => openAction('remove_admin', user)}
                          disabled={user.username === process.env.NEXT_PUBLIC_FOUNDER_USERNAME}
                        >
                          <ShieldOff className="w-4 h-4 mr-2" /> Remove Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => openAction('delete_user', user)}
                        className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                        disabled={user.username === process.env.NEXT_PUBLIC_FOUNDER_USERNAME}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No users found matching your search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
           <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
           >
             Previous
           </Button>
           <span className="text-xs text-muted-foreground font-medium">Page {page} of {Math.ceil(total / 20)}</span>
           <Button 
            variant="outline" 
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
           >
             Next
           </Button>
        </div>
      )}

      {/* Action Dialog */}
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
