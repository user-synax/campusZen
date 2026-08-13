import StatCard from '@/components/analytics/StatCard'
import BarChart from '@/components/analytics/BarChart'
import DonutChart from '@/components/analytics/DonutChart'
import RankedTable from '@/components/analytics/RankedTable'
import { Coins, TrendingUp, TrendingDown, Settings } from 'lucide-react'

const RANGE_LABELS = { '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', 'all': 'All Time' }

export default function EconomyTab({ data, range }) {
    const { coins } = data || {}
    const rangeLabel = RANGE_LABELS[range] ?? range

    const chartData = (coins?.timeSeries ?? []).map(d => ({ label: d.date, value: d.count }))

    const donutData = (coins?.byReason ?? []).slice(0, 8).map(r => ({
        label: r.reason.replace(/_/g, ' '),
        value: r.total,
    }))

    return (
        <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard title="In Circulation" value={coins?.totalCirculation} icon={Coins} />
                <StatCard title="Lifetime Earned" value={coins?.lifetimeEarned} icon={TrendingUp} />
                <StatCard title="Lifetime Spent" value={coins?.lifetimeSpent} icon={TrendingDown} />
                <StatCard title={`Volume (${rangeLabel})`} value={coins?.volumeInRange} icon={Coins} />
                <StatCard title="Admin Adjustments" value={coins?.adminAdjustCount} icon={Settings} />
            </div>

            <BarChart
                data={chartData}
                title="VP Volume per Day"
                rangeLabel={rangeLabel}
            />

            <DonutChart
                data={donutData}
                title="Transaction Volume by Reason"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RankedTable
                    title="Top Earners"
                    columns={[
                        { key: 'username', label: 'User' },
                        { key: 'totalEarned', label: 'Earned', numeric: true },
                    ]}
                    rows={coins?.topEarners ?? []}
                />
                <RankedTable
                    title="Top Spenders"
                    columns={[
                        { key: 'username', label: 'User' },
                        { key: 'totalSpent', label: 'Spent', numeric: true },
                    ]}
                    rows={coins?.topSpenders ?? []}
                />
            </div>
        </div>
    )
}
