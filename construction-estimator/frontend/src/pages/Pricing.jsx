import { Link } from 'react-router-dom'
import { Check, HardHat } from 'lucide-react'

const PLANS = [
  {
    name:     'Starter',
    price:    '$19',
    period:   '/month',
    tagline:  'For small residential projects',
    accent:   false,
    features: [
      'Up to 5 projects',
      'Residential projects only',
      'Electrical calculator',
      'Plumbing calculator',
      'Material database',
      'PDF BOQ export',
    ],
    notIncluded: [
      'Commercial / Industrial',
      'Team collaboration',
      'API access',
    ],
  },
  {
    name:     'Professional',
    price:    '$49',
    period:   '/month',
    tagline:  'For growing engineering firms',
    accent:   true,   // highlighted plan
    features: [
      'Up to 50 projects',
      'Residential + Commercial',
      'All 4 engineering modules',
      'Structural & Solar calculators',
      'Advanced BOQ & reports',
      'PDF + data export',
    ],
    notIncluded: [
      'Industrial projects',
      'Multi-user teams',
      'API access',
    ],
  },
  {
    name:     'Enterprise',
    price:    '$99',
    period:   '/month',
    tagline:  'For large firms & contractors',
    accent:   false,
    features: [
      'Unlimited projects',
      'Residential + Commercial + Industrial',
      'All engineering modules',
      'Multi-user team access',
      'Role-based permissions',
      'API access',
      'Custom reports',
      'Priority support',
    ],
    notIncluded: [],
  },
]

const COMPARISON = [
  { feature: 'Projects',              starter: '5',         pro: '50',          enterprise: 'Unlimited' },
  { feature: 'Residential projects',  starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'Commercial projects',   starter: '—',         pro: '✓',           enterprise: '✓' },
  { feature: 'Industrial projects',   starter: '—',         pro: '—',           enterprise: '✓' },
  { feature: 'Electrical calculator', starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'Plumbing calculator',   starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'Structural calculator', starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'Solar PV calculator',   starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'PDF BOQ export',        starter: '✓',         pro: '✓',           enterprise: '✓' },
  { feature: 'Team collaboration',    starter: '—',         pro: '—',           enterprise: '✓' },
  { feature: 'API access',            starter: '—',         pro: '—',           enterprise: '✓' },
  { feature: 'Priority support',      starter: '—',         pro: '—',           enterprise: '✓' },
]

export default function Pricing() {
  return (
    <div className="min-h-screen bg-base px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6">
          <HardHat size={16} className="text-accent" />
          <span className="font-bold text-white">Eng<span className="text-accent">Est</span> Pro</span>
        </Link>
        <h1 className="text-3xl font-bold text-white mt-2">Simple, transparent pricing</h1>
        <p className="text-gray-400 mt-3 max-w-lg mx-auto">
          Start with a 30-day free trial. No credit card required.
          Upgrade when you're ready.
        </p>
      </div>

      {/* Plan cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-lg border flex flex-col ${
              plan.accent
                ? 'border-accent bg-surface shadow-lg shadow-accent/10'
                : 'border-white/10 bg-surface/60'
            }`}
          >
            {plan.accent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <div className="p-6 flex-1">
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{plan.tagline}</p>

              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600 line-through">
                    <span className="w-3.5 shrink-0 text-center text-gray-700">—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 pt-0">
              <button
                disabled
                title="Stripe billing coming soon"
                className={`w-full py-2.5 rounded text-sm font-medium transition-colors cursor-not-allowed opacity-60 ${
                  plan.accent
                    ? 'bg-accent text-white'
                    : 'border border-white/20 text-gray-300'
                }`}
              >
                Upgrade to {plan.name}
                <span className="block text-xs font-normal opacity-70 mt-0.5">Stripe billing coming soon</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-white text-center mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-surface">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Feature</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Starter</th>
                <th className="text-center px-4 py-3 text-accent font-medium">Professional</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/2'}`}
                >
                  <td className="px-4 py-3 text-gray-300">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{row.starter}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{row.pro}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back link */}
      <div className="text-center mt-10">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-white underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  )
}
