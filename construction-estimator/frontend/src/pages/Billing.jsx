import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  CreditCard, CheckCircle2, AlertTriangle, Clock,
  FileText, ExternalLink, RefreshCw, ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  createCheckoutSession,
  createPortalSession,
  getInvoices,
} from '../utils/api'
import { parseApiError } from '../utils/parseError'

const PLAN_PRICES = { basic: 299, professional: 599, enterprise: 1999 }
const PLAN_LABELS = { basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise' }
const STATUS_BADGE = {
  trial:     { label: 'Free Trial',   cls: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40' },
  active:    { label: 'Active',       cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
  past_due:  { label: 'Past Due',     cls: 'bg-red-900/40 text-red-300 border-red-700/40' },
  expired:   { label: 'Expired',      cls: 'bg-gray-800 text-gray-400 border-gray-700/40' },
}

const OTHER_PLANS = {
  basic:        ['professional', 'enterprise'],
  professional: ['basic', 'enterprise'],
  enterprise:   ['basic', 'professional'],
  trial:        ['basic', 'professional', 'enterprise'],
}

const PLAN_FEATURES = {
  basic:        ['Up to 10 projects', 'All engineering calculators', 'PDF BOQ export'],
  professional: ['Up to 50 projects', 'Commercial projects', 'Excel + PDF export'],
  enterprise:   ['Unlimited projects', 'Team accounts', 'Priority support'],
}

function fmt(dateVal) {
  if (!dateVal) return '—'
  return new Date(dateVal).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Billing() {
  const { user, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoices, setInvoices]     = useState([])
  const [invLoading, setInvLoading] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(searchParams.get('success') === '1')

  useEffect(() => {
    if (success) {
      // remove ?success=1 from URL
      setSearchParams({}, { replace: true })
      // refresh user so plan/status update
      refreshUser()
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    getInvoices()
      .then((r) => setInvoices(r.data))
      .catch(() => setInvoices([]))
      .finally(() => setInvLoading(false))
  }, [])

  const plan   = user?.subscription_plan   || 'starter'
  const status = user?.subscription_status || 'trial'
  const badge  = STATUS_BADGE[status] || STATUS_BADGE.trial

  const daysLeft = user?.days_remaining ?? 30

  const trialEnd = user?.trial_end
    ? new Date(user.trial_end).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  const nextBilling = user?.next_billing_date
    ? new Date(user.next_billing_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  const handleUpgrade = async (planKey) => {
    setError('')
    setLoadingPlan(planKey)
    try {
      const res = await createCheckoutSession(planKey)
      window.location.href = res.data.url
    } catch (err) {
      setError(parseApiError(err, 'Could not start checkout. Please try again.'))
      setLoadingPlan(null)
    }
  }

  const handlePortal = async () => {
    setError('')
    setPortalLoading(true)
    try {
      const res = await createPortalSession()
      window.location.href = res.data.url
    } catch (err) {
      setError(parseApiError(err, 'Could not open billing portal. Please try again.'))
      setPortalLoading(false)
    }
  }

  const otherPlans = OTHER_PLANS[status === 'trial' ? 'trial' : plan] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard size={22} /> Billing &amp; Subscription
        </h1>
        <p className="text-sm text-gray-400 mt-1">Manage your plan, trial, and payment history</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-4 py-3">
          <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Subscription activated!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Your 30-day free trial has started. You won't be charged until {trialEnd}.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/30 rounded px-4 py-2 text-sm text-red-400">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Current Plan */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold text-white">{PLAN_LABELS[plan] || plan}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            {status === 'trial' && (
              <div className="mt-3 flex items-center gap-2">
                <Clock size={14} className={daysLeft <= 5 ? 'text-red-400' : 'text-yellow-400'} />
                <p className={`text-sm ${daysLeft <= 5 ? 'text-red-300' : 'text-gray-300'}`}>
                  <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> remaining in your free trial.
                  {daysLeft <= 5 && ' Upgrade now to avoid losing access.'}
                </p>
              </div>
            )}

            {status === 'active' && nextBilling && (
              <p className="text-sm text-gray-400 mt-2">
                Next billing: <strong className="text-white">{nextBilling}</strong>
                {' · '}
                <strong className="text-white">PHP {PLAN_PRICES[plan] ?? 0}/mo</strong>
              </p>
            )}

            {status === 'past_due' && (
              <div className="mt-3 flex items-center gap-2 text-red-400">
                <AlertTriangle size={14} />
                <p className="text-sm">Payment failed. Update your payment method to restore access.</p>
              </div>
            )}

            {status === 'expired' && (
              <p className="text-sm text-gray-500 mt-2">Your subscription has ended. Subscribe to restore access.</p>
            )}
          </div>

          {/* Manage Subscription button (only if subscribed via Stripe) */}
          {user?.stripe_subscription_id && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="btn-ghost flex items-center gap-1.5 shrink-0"
            >
              {portalLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <ExternalLink size={14} />
              )}
              Manage / Cancel
            </button>
          )}
        </div>
      </div>

      {/* Upgrade options */}
      {otherPlans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            {status === 'trial' ? 'Choose a plan' : 'Switch plan'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherPlans.map((planKey) => (
              <div key={planKey} className="card border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{PLAN_LABELS[planKey]}</p>
                    <p className="text-accent text-lg font-bold">PHP {PLAN_PRICES[planKey]}<span className="text-gray-500 text-xs font-normal">/mo</span></p>
                  </div>
                </div>
                <ul className="space-y-1.5 flex-1">
                  {PLAN_FEATURES[planKey]?.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-emerald-400">30-day free trial included</p>
                <button
                  onClick={() => handleUpgrade(planKey)}
                  disabled={loadingPlan === planKey}
                  className="btn-accent flex items-center justify-center gap-1.5"
                >
                  {loadingPlan === planKey ? (
                    <><RefreshCw size={13} className="animate-spin" /> Redirecting…</>
                  ) : (
                    <><ArrowUpRight size={13} /> Start Trial</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <FileText size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-300">Payment History</h2>
        </div>
        {invLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500 text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center text-gray-600 text-sm">
            No payment history yet. Your invoices will appear here after your first charge.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-head">
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th className="text-left px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="table-row">
                    <td className="px-4 py-2.5 text-gray-400">{fmtDate(inv.date)}</td>
                    <td className="px-4 py-2.5 font-medium text-white">${inv.amount_usd.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`badge ${
                        inv.status === 'paid'
                          ? 'bg-emerald-900/40 text-emerald-300'
                          : 'bg-red-900/40 text-red-300'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:text-accent-dark text-xs"
                        >
                          <FileText size={12} /> PDF
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600">
        Payment processing by <strong>Stripe</strong>. We never store your card details.
        To update payment method or cancel, use the <button onClick={handlePortal} className="text-accent hover:underline">customer portal</button>.
      </p>
    </div>
  )
}
