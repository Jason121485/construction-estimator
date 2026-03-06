import { useState } from 'react'
import { Lightbulb } from 'lucide-react'

/**
 * Conceptual Estimate — Cost per m² benchmark tool.
 * No API calls required — uses Philippine construction cost benchmarks.
 *
 * Source: DPWH, PSA, and local QS industry benchmarks (2023–2024).
 * All values in Philippine Pesos (₱) per m² of Gross Floor Area (GFA).
 */

const BENCHMARK = {
  Residential: {
    Economy:   { min: 18_000, max: 25_000 },
    Standard:  { min: 25_000, max: 40_000 },
    Premium:   { min: 40_000, max: 65_000 },
  },
  Commercial: {
    Economy:   { min: 22_000, max: 30_000 },
    Standard:  { min: 30_000, max: 50_000 },
    Premium:   { min: 50_000, max: 85_000 },
  },
  Institutional: {
    Economy:   { min: 20_000, max: 28_000 },
    Standard:  { min: 28_000, max: 45_000 },
    Premium:   { min: 45_000, max: 70_000 },
  },
  Industrial: {
    Economy:   { min: 12_000, max: 18_000 },
    Standard:  { min: 18_000, max: 28_000 },
    Premium:   { min: 28_000, max: 45_000 },
  },
  Infrastructure: {
    Economy:   { min: 15_000, max: 22_000 },
    Standard:  { min: 22_000, max: 38_000 },
    Premium:   { min: 38_000, max: 60_000 },
  },
}

// Location factor multiplier
const LOCATION_FACTOR = {
  'Metro Manila':   1.00,
  'Metro Cebu':     0.95,
  'Metro Davao':    0.92,
  'Luzon Province': 0.87,
  'Visayas Province': 0.83,
  'Mindanao Province': 0.80,
}

const fmt = (n) => Math.round(n).toLocaleString()

export default function ConceptualEstimate() {
  const [form, setForm] = useState({
    building_type: 'Residential',
    quality: 'Standard',
    area_m2: 500,
    floors: 1,
    location: 'Metro Manila',
  })
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const calculate = () => {
    const rates = BENCHMARK[form.building_type]?.[form.quality]
    if (!rates) return

    const factor = LOCATION_FACTOR[form.location] ?? 1.0
    const gfa = form.area_m2 * (form.floors || 1)

    const minRate = rates.min * factor
    const maxRate = rates.max * factor
    const midRate = (minRate + maxRate) / 2

    setResult({
      gfa,
      minRate: Math.round(minRate),
      maxRate: Math.round(maxRate),
      midRate: Math.round(midRate),
      minCost: Math.round(minRate * gfa),
      maxCost: Math.round(maxRate * gfa),
      midCost: Math.round(midRate * gfa),
      factor,
    })
  }

  const accuracy = '−20% to +30%'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Conceptual Estimate</h1>
        <p className="text-sm text-gray-400 mt-1">
          Feasibility-level cost estimate based on ₱/m² benchmarks — accuracy {accuracy}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-gray-300">Project Parameters</h3>
          </div>

          <div>
            <label className="label">Building Type</label>
            <select className="input" value={form.building_type} onChange={e => set('building_type', e.target.value)}>
              {Object.keys(BENCHMARK).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Quality / Specification Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Economy', 'Standard', 'Premium'].map(q => (
                <button key={q}
                  onClick={() => set('quality', q)}
                  className={`py-2 px-3 rounded text-sm font-medium border transition-colors ${
                    form.quality === q
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  {q}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Economy: basic finishes · Standard: mid-spec · Premium: high-end finishes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Floor Area per Level (m²)</label>
              <input className="input" type="number" min="10" step="10" value={form.area_m2}
                onChange={e => set('area_m2', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Number of Floors</label>
              <input className="input" type="number" min="1" max="80" step="1" value={form.floors}
                onChange={e => set('floors', parseInt(e.target.value) || 1)} />
            </div>
          </div>

          <div>
            <label className="label">Location</label>
            <select className="input" value={form.location} onChange={e => set('location', e.target.value)}>
              {Object.keys(LOCATION_FACTOR).map(l => <option key={l}>{l}</option>)}
            </select>
          </div>

          <button className="btn-primary w-full" onClick={calculate}>
            Compute Conceptual Estimate
          </button>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div className="space-y-4">
              {/* Key figures */}
              <div className="card bg-navy/60 text-center">
                <p className="text-xs text-gray-400 mb-1">Estimated Project Cost Range</p>
                <p className="text-3xl font-bold text-accent">
                  ₱{fmt(result.minCost)} – ₱{fmt(result.maxCost)}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Most Likely: <span className="text-white font-semibold">₱{fmt(result.midCost)}</span>
                </p>
                <p className="text-xs text-gray-600 mt-2">Accuracy: {accuracy}</p>
              </div>

              {/* Breakdown */}
              <div className="card space-y-3">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cost Breakdown</h3>
                {[
                  { label: 'Gross Floor Area (GFA)', val: `${fmt(result.gfa)} m²` },
                  { label: 'Cost Rate (Low)', val: `₱${fmt(result.minRate)}/m²` },
                  { label: 'Cost Rate (Mid)', val: `₱${fmt(result.midRate)}/m²` },
                  { label: 'Cost Rate (High)', val: `₱${fmt(result.maxRate)}/m²` },
                  { label: 'Location Factor', val: `× ${result.factor.toFixed(2)}` },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>

              {/* Scope note */}
              <div className="card bg-yellow-900/10 border-yellow-500/20">
                <p className="text-xs font-semibold text-yellow-400 mb-1">What's Included</p>
                <p className="text-xs text-gray-400">
                  Structural, architectural finishes, basic MEP systems, and site development.
                  Excludes land, furniture, major process equipment, and specialty systems.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Use this estimate for feasibility decisions only.
                  Proceed to Detailed Estimate (Cost Estimator) for contractor bidding.
                </p>
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <Lightbulb size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Fill in parameters and click Calculate</p>
              <p className="text-sm text-gray-600 mt-1">
                Conceptual estimates are used for early feasibility analysis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
