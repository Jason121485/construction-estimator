import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, getProjectSummary } from '../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  FolderOpen, Calculator, Database, TrendingUp,
  Plus, ArrowRight, Building2, Zap, Droplets, Sun,
} from 'lucide-react'

function StatCard({ label, value, icon: Icon, color = 'text-navy-light' }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-2 rounded bg-white/5 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const COLORS = ['#0f3460', '#e94560', '#16213e', '#1a4a80', '#c23351']

export default function Dashboard() {
  const [projects, setProjects]     = useState([])
  const [summaries, setSummaries]   = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    getProjects()
      .then(r => {
        setProjects(r.data)
        return Promise.all(r.data.map(p => getProjectSummary(p.id).catch(() => null)))
      })
      .then(sums => setSummaries(sums.filter(Boolean).map(s => s.data)))
      .finally(() => setLoading(false))
  }, [])

  const totalCost = summaries.reduce((a, s) => a + (s.grand_total || 0), 0)
  const chartData = summaries.map((s, i) => ({
    name: s.project?.project_name?.slice(0, 12) || `Project ${i + 1}`,
    cost: s.grand_total || 0,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Loading dashboard…
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Engineering Construction Estimator — Electrical · Plumbing · Structural · Solar
          </p>
        </div>
        <Link to="/projects" className="btn-accent flex items-center gap-2">
          <Plus size={16} /> New Project
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects"   value={projects.length}    icon={FolderOpen}  color="text-blue-400" />
        <StatCard label="Total Est. Cost"  value={`₱${(totalCost/1000).toFixed(0)}k`} icon={TrendingUp} color="text-accent" />
        <StatCard label="Avg Cost / Project" value={projects.length ? `₱${((totalCost/projects.length)/1000).toFixed(0)}k` : '—'} icon={Calculator} color="text-green-400" />
        <StatCard label="Materials in DB"  value="80+"                icon={Database}    color="text-purple-400" />
      </div>

      {/* Chart + Recent projects */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="card lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Project Cost Overview</h2>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              No projects yet — create one to see data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#16213e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                  labelStyle={{ color: '#fff' }}
                  formatter={v => [`₱${v.toLocaleString()}`, 'Estimated Cost']}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent projects list */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Projects</h2>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No projects yet</p>
              <Link to="/projects" className="btn-primary mt-3 inline-flex items-center gap-2 text-xs">
                <Plus size={14} /> Create Project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 6).map((p, i) => {
                const sum = summaries.find(s => s.project?.id === p.id)
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{p.project_name}</p>
                      <p className="text-xs text-gray-500">{p.building_type} · {p.floors}F</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent">
                        ₱{((sum?.grand_total || 0) / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>
                )
              })}
              <Link to="/projects" className="flex items-center gap-1 text-xs text-navy-light hover:text-white mt-2 transition-colors">
                View all projects <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Engineering modules */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Engineering Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/electrical', label: 'Electrical Design',     desc: 'Load · Cable · Panel · Transformer', color: 'border-yellow-500/40', icon: Zap,        iconColor: 'text-yellow-400' },
            { to: '/calculator', label: 'Plumbing Design',       desc: 'WSFU · Pipe sizing · BOQ',           color: 'border-blue-500/40',   icon: Droplets,   iconColor: 'text-blue-400'   },
            { to: '/structural', label: 'Structural Takeoff',    desc: 'Concrete · Rebar · Formwork',        color: 'border-orange-500/40', icon: Building2,  iconColor: 'text-orange-400' },
            { to: '/solar',      label: 'Solar PV Design',       desc: 'Panels · Inverter · Battery',        color: 'border-green-500/40',  icon: Sun,        iconColor: 'text-green-400'  },
          ].map(({ to, label, desc, color, icon: Icon, iconColor }) => (
            <Link key={to} to={to}
              className={`card border ${color} hover:bg-white/5 transition-colors group`}>
              <Icon size={18} className={`${iconColor} mb-2`} />
              <p className="text-sm font-medium text-white group-hover:text-accent transition-colors">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/estimator',  label: 'Cost Estimator',        desc: 'BOQ with profit + VAT',     color: 'border-accent/30'     },
            { to: '/materials',  label: 'Material Database',     desc: '200+ Philippine prices',    color: 'border-green-500/30'  },
            { to: '/reports',    label: 'Download Reports',      desc: 'PDF BOQ & Engineering',     color: 'border-purple-500/30' },
            { to: '/admin',      label: 'Admin Panel',           desc: 'Update prices & labor',     color: 'border-gray-500/30'   },
          ].map(({ to, label, desc, color }) => (
            <Link key={to} to={to}
              className={`card border ${color} hover:bg-white/5 transition-colors group`}>
              <p className="text-sm font-medium text-white group-hover:text-accent transition-colors">{label}</p>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
