import StatCard from '@/components/analytics/StatCard'
import { Users, FileText, Coins, ShieldAlert, BookOpen, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function OverviewTab({ data, lastFetched }) {
    const { users, content, coins, moderation, resources, chats } = data || {}

    return (
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard
                    title="Total Users"
                    value={users?.total}
                    growth={users?.growth}
                    icon={Users}
                />
                <StatCard
                    title="Total Posts"
                    value={content?.totalPosts}
                    growth={content?.postGrowth}
                    icon={FileText}
                />
                <StatCard
                    title="VP in Circulation"
                    value={coins?.totalCirculation}
                    icon={Coins}
                />
                <StatCard
                    title="Active Bans"
                    value={moderation?.activeUserBans}
                    icon={ShieldAlert}
                />
                <StatCard
                    title="Pending Resources"
                    value={resources?.pending}
                    icon={BookOpen}
                />
                <StatCard
                    title="Active Groups"
                    value={chats?.activeGroups}
                    icon={MessageSquare}
                />
            </div>

            {lastFetched && (
                <p className="text-xs text-muted-foreground text-right">
                    Last updated {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
                </p>
            )}
        </div>
    )
}
