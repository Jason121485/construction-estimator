import { Link } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function TrialBanner() {
  const { user } = useAuth()

  if (!user || user.subscription_status !== 'trial') return null

  const days = user.days_remaining ?? 30
  const urgent = days <= 5

  return (
    <div
      className={`flex items-center justify-between px-5 py-2 text-xs shrink-0 ${
        urgent
          ? 'bg-red-900/50 border-b border-red-800/40 text-red-200'
          : 'bg-navy/60 border-b border-white/10 text-gray-300'
      }`}
    >
      <div className="flex items-center gap-2">
        {urgent ? (
          <AlertTriangle size={13} className="text-red-400 shrink-0" />
        ) : (
          <Clock size={13} className="text-yellow-400 shrink-0" />
        )}
        <span>
          Free trial —{' '}
          <strong className={urgent ? 'text-red-300' : 'text-white'}>
            {days} day{days !== 1 ? 's' : ''} remaining
          </strong>
          {urgent && '. Upgrade to keep your data and access.'}
        </span>
      </div>
      <Link
        to="/pricing"
        className={`ml-4 shrink-0 px-3 py-1 rounded text-xs font-medium transition-colors ${
          urgent
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : 'bg-accent hover:bg-accent-dark text-white'
        }`}
      >
        Upgrade plan
      </Link>
    </div>
  )
}
