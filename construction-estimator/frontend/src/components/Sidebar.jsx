import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Droplets, Database,
  Calculator, FileText, Settings, HardHat, Zap, Building2, Sun,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'    },
      { to: '/projects',  icon: FolderOpen,       label: 'Projects'     },
    ],
  },
  {
    label: 'Calculators',
    items: [
      { to: '/electrical', icon: Zap,       label: 'Electrical'    },
      { to: '/calculator', icon: Droplets,  label: 'Plumbing'      },
      { to: '/structural', icon: Building2, label: 'Structural'    },
      { to: '/solar',      icon: Sun,        label: 'Solar PV'      },
    ],
  },
  {
    label: 'Estimation',
    items: [
      { to: '/materials', icon: Database,   label: 'Material DB'   },
      { to: '/estimator', icon: Calculator, label: 'Cost Estimator'},
      { to: '/reports',   icon: FileText,   label: 'Reports'       },
      { to: '/admin',     icon: Settings,   label: 'Admin Panel'   },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 bg-surface border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <HardHat className="text-accent" size={22} />
          <div>
            <p className="text-sm font-bold text-white leading-none">EngEst Pro</p>
            <p className="text-xs text-gray-500 mt-0.5">Engineering Estimator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 pb-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, icon: Icon, label: lbl }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? 'bg-navy text-white font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={15} />
                  {lbl}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-xs text-gray-600">Philippine market prices</p>
        <p className="text-xs text-gray-700 mt-0.5">v2.0 — 4 Disciplines</p>
      </div>
    </aside>
  )
}
