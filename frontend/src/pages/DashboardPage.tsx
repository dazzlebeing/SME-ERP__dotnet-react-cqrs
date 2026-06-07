import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts'
import { FileText, Truck, Receipt, CreditCard, ShoppingCart, Users, Wallet, Building2 } from 'lucide-react'
import api from '../lib/api'
import { fmt, MONTHS } from '../lib/formatters'
import { Card, CardHeader, Badge, Loader } from '../components/ui'

type StatTab = 'bills' | 'purchase' | 'gatepasses' | 'sales' | 'payments'

/** Mini donut chart */
function DonutStat({ value, label, color = '#3b82f6' }: { value: number; label: string; color?: string }) {
  const data = [{ value }, { value: Math.max(0, 100 - value) }]
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <PieChart width={80} height={80}>
          <Pie data={data} cx={35} cy={35} innerRadius={26} outerRadius={38} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-slate-700">{value}</span>
        </div>
      </div>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}

/** Quick link card */
function QuickLink({ to, label, icon: Icon, count, color }: { to: string; label: string; icon: React.ElementType; count?: number; color: string }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 text-center">{label}</span>
      {count !== undefined && <span className="text-xs text-slate-400">{count} records</span>}
    </Link>
  )
}

const TAB_CONFIG: Record<StatTab, { label: string; color: string }> = {
  bills:     { label: 'Bills',      color: '#3b82f6' },
  purchase:  { label: 'Purchase',   color: '#f97316' },
  gatepasses:{ label: 'GatePasses', color: '#8b5cf6' },
  sales:     { label: 'Sales',      color: '#10b981' },
  payments:  { label: 'Payments',   color: '#06b6d4' },
}

export default function DashboardPage() {
  const year = new Date().getFullYear()
  const [statTab, setStatTab] = useState<StatTab>('bills')

  const { data: stats, isLoading: sl } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: graph = [] } = useQuery({
    queryKey: ['dashboard-graph', year],
    queryFn: () => api.get(`/dashboard/graph?year=${year}`).then(r => r.data),
  })

  const { data: recent = [] } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => api.get('/dashboard/recent-gatepasses').then(r => r.data),
    refetchInterval: 30000,
  })

  const chartData = (graph as any[]).map((g: any) => ({
    month: MONTHS[g.month - 1].substring(0, 3),
    Sales: g.salesAmount,
    Expenses: g.expenseAmount,
  }))

  if (sl) return <Loader />

  /** Tab-specific stat content */
  const tabContent: Record<StatTab, React.ReactNode> = {
    bills: (
      <div className="flex items-center gap-6 flex-wrap">
        <DonutStat value={stats?.billsThisMonth ?? 0} label="Bills this month" color="#3b82f6" />
        <div className="space-y-1 text-sm">
          <p className="text-slate-500">Total Bills: <strong className="text-slate-800">{stats?.billsThisMonth ?? 0}</strong></p>
          <p className="text-slate-500">Worth: <strong className="text-blue-700">{fmt.currency(stats?.salesThisMonth ?? 0)}</strong></p>
          <p className="text-slate-500">Pending: <strong className="text-orange-600">{fmt.currency(stats?.pendingPayments ?? 0)}</strong></p>
        </div>
      </div>
    ),
    purchase: (
      <div className="flex items-center gap-6 flex-wrap">
        <DonutStat value={0} label="Purchases this month" color="#f97316" />
        <div className="space-y-1 text-sm">
          <p className="text-slate-500">All Vendors: <strong className="text-slate-800">{stats?.totalVendors ?? 0}</strong></p>
          <p className="text-slate-500">GST Input Credit: <strong className="text-green-700">Available</strong></p>
        </div>
      </div>
    ),
    gatepasses: (
      <div className="flex items-center gap-6 flex-wrap">
        <DonutStat value={stats?.pendingGatepasses ?? 0} label="Pending gatepasses" color="#8b5cf6" />
        <div className="space-y-1 text-sm">
          <p className="text-slate-500">Pending: <strong className="text-purple-600">{stats?.pendingGatepasses ?? 0}</strong></p>
          <p className="text-slate-500">Status: <strong className="text-slate-800">Awaiting delivery</strong></p>
        </div>
      </div>
    ),
    sales: (
      <div className="flex items-center gap-6 flex-wrap">
        <DonutStat value={stats?.billsThisMonth ?? 0} label="Sales invoices" color="#10b981" />
        <div className="space-y-1 text-sm">
          <p className="text-slate-500">Companies: <strong className="text-slate-800">{stats?.totalCompanies ?? 0}</strong></p>
          <p className="text-slate-500">Revenue: <strong className="text-green-700">{fmt.currency(stats?.salesThisMonth ?? 0)}</strong></p>
        </div>
      </div>
    ),
    payments: (
      <div className="flex items-center gap-6 flex-wrap">
        <DonutStat value={0} label="Payments received" color="#06b6d4" />
        <div className="space-y-1 text-sm">
          <p className="text-slate-500">Outstanding: <strong className="text-red-600">{fmt.currency(stats?.pendingPayments ?? 0)}</strong></p>
          <p className="text-slate-500">Employees: <strong className="text-slate-800">{stats?.totalEmployees ?? 0}</strong></p>
        </div>
      </div>
    ),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Statistics {year} — Shree Engineering Works</p>
      </div>

      {/* Statistics card with tabs (matches PHP project layout) */}
      <Card>
        <CardHeader title={`Statistics — ${year}`} />
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4">
          {(Object.keys(TAB_CONFIG) as StatTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setStatTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                statTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {TAB_CONFIG[tab].label}
            </button>
          ))}
        </div>
        <div className="p-5 min-h-[120px] flex items-center">
          {tabContent[statTab]}
        </div>
      </Card>

      {/* Quick links grid (like PHP sidebar shortcuts) */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Quick Access</h2>
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
          <QuickLink to="/gatepasses"  label="Gatepasses"  icon={FileText}    color="bg-purple-500" count={stats?.pendingGatepasses} />
          <QuickLink to="/chalans"     label="Chalans"     icon={Truck}       color="bg-indigo-500" />
          <QuickLink to="/bills"       label="Bills"       icon={Receipt}     color="bg-blue-500"   count={stats?.billsThisMonth} />
          <QuickLink to="/payments"    label="Payments"    icon={CreditCard}  color="bg-cyan-500" />
          <QuickLink to="/expenses"    label="Expenses"    icon={ShoppingCart} color="bg-orange-500" />
          <QuickLink to="/employees"   label="Employees"   icon={Users}       color="bg-green-500"  count={stats?.totalEmployees} />
          <QuickLink to="/vouchers"    label="Vouchers"    icon={Wallet}      color="bg-amber-500" />
          <QuickLink to="/companies"   label="Companies"   icon={Building2}   color="bg-rose-500"   count={stats?.totalCompanies} />
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader title={`Monthly Sales vs Expenses — ${year}`} />
        <div className="p-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt.currency(v)} />
              <Legend />
              <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent Gatepasses */}
      <Card>
        <CardHeader title="Recent Gatepasses" />
        <div className="divide-y divide-slate-100">
          {(recent as any[]).length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-slate-400">No gatepasses yet</p>
          )}
          {(recent as any[]).map((g: any) => (
            <div key={g.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{g.gatepassNumber}</p>
                <p className="text-xs text-slate-500">{g.companyName} · {fmt.date(g.gatepassDate)}</p>
              </div>
              <Badge label={g.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
