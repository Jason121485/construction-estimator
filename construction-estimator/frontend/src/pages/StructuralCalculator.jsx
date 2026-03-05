import { useEffect, useState } from 'react'
import { getProjects, runStructuralAnalysis, saveStructural } from '../utils/api'
import { Plus, Trash2, Building2, Save, CheckCircle } from 'lucide-react'

const ELEMENT_TYPES = [
  { value: 'slab',    label: 'Slab',    dims: ['length_m','width_m','thickness_m'],         defaults: {length_m:5, width_m:5, thickness_m:0.15} },
  { value: 'beam',    label: 'Beam',    dims: ['width_m','depth_m','length_m'],              defaults: {width_m:0.25, depth_m:0.50, length_m:6}   },
  { value: 'column',  label: 'Column',  dims: ['width_m','depth_m','height_m'],              defaults: {width_m:0.40, depth_m:0.40, height_m:3.0}  },
  { value: 'footing', label: 'Footing', dims: ['length_m','width_m','depth_m'],              defaults: {length_m:1.5, width_m:1.5, depth_m:0.50}  },
  { value: 'wall',    label: 'Wall',    dims: ['length_m','height_m','thickness_m'],         defaults: {length_m:5, height_m:3.0, thickness_m:0.20} },
  { value: 'stair',   label: 'Stair',   dims: ['floor_to_floor_m','width_m','thickness_m'], defaults: {floor_to_floor_m:3.0, width_m:1.2, thickness_m:0.15} },
]

const CONCRETE_CLASSES = [
  'C16 (1:2:4)', 'C20 (1:1.5:3)', 'C25 (1:1:2)', 'C28', 'C30', 'C35',
]
const REBAR_GRADES = ['Grade 40', 'Grade 60', 'Grade 75']

const DIM_LABELS = {
  length_m: 'Length (m)', width_m: 'Width (m)', depth_m: 'Depth (m)',
  height_m: 'Height (m)', thickness_m: 'Thickness (m)',
  floor_to_floor_m: 'Floor-to-Floor (m)',
}

const emptyElement = (i = 1, type = 'slab') => {
  const et = ELEMENT_TYPES.find(e => e.value === type) || ELEMENT_TYPES[0]
  return { id: Date.now() + i, type, label: `${et.label} ${i}`, quantity: 1, ...et.defaults }
}

export default function StructuralCalculator() {
  const [projects, setProjects]     = useState([])
  const [selProject, setSelProject] = useState('')
  const [elements, setElements]     = useState([emptyElement(1, 'slab')])
  const [settings, setSettings]     = useState({
    concrete_class: 'C25 (1:1:2)', rebar_grade: 'Grade 60',
  })
  const [result, setResult]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  const addElement = () => setElements(es => [...es, emptyElement(es.length + 1, 'slab')])

  const removeElement = (id) => setElements(es => es.filter(e => e.id !== id))

  const updateElement = (id, k, v) => setElements(es =>
    es.map(el => {
      if (el.id !== id) return el
      if (k === 'type') {
        const et = ELEMENT_TYPES.find(e => e.value === v) || ELEMENT_TYPES[0]
        return { ...el, type: v, label: `${et.label} ${el.id % 100}`, ...et.defaults }
      }
      return { ...el, [k]: v }
    })
  )

  const runAnalysis = async () => {
    setLoading(true); setSaved(false)
    try {
      const payload = {
        elements: elements.map(({ id, ...e }) => e),
        ...settings,
      }
      const r = await runStructuralAnalysis(payload)
      setResult(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveToProject = async () => {
    if (!selProject || !result) return
    setSaving(true)
    try {
      await saveStructural(selProject, {
        project_id: parseInt(selProject),
        elements: elements.map(({ id, ...e }) => e),
        ...settings,
      })
      setSaved(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const tot = result?.totals

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-orange-400" size={22} /> Structural Calculator
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Concrete volume · Rebar quantity · Formwork area · BOQ generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-48" value={selProject} onChange={e => setSelProject(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
          </select>
          {result && selProject && (
            <button className="btn-accent flex items-center gap-2"
              onClick={saveToProject} disabled={saving}>
              {saved ? <CheckCircle size={16} className="text-green-400" /> : <Save size={16} />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save to Project'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Settings */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Concrete & Rebar Specifications</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Concrete Class</label>
                <select className="input" value={settings.concrete_class}
                  onChange={e => setSettings(s => ({ ...s, concrete_class: e.target.value }))}>
                  {CONCRETE_CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Rebar Grade</label>
                <select className="input" value={settings.rebar_grade}
                  onChange={e => setSettings(s => ({ ...s, rebar_grade: e.target.value }))}>
                  {REBAR_GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Elements */}
          <div className="space-y-3">
            {elements.map((el, idx) => {
              const et = ELEMENT_TYPES.find(e => e.value === el.type) || ELEMENT_TYPES[0]
              return (
                <div key={el.id} className="card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <label className="label">Element Type</label>
                        <select className="input" value={el.type}
                          onChange={e => updateElement(el.id, 'type', e.target.value)}>
                          {ELEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Label</label>
                        <input className="input" value={el.label}
                          onChange={e => updateElement(el.id, 'label', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Quantity</label>
                        <input className="input" type="number" min="1" value={el.quantity}
                          onChange={e => updateElement(el.id, 'quantity', parseInt(e.target.value) || 1)} />
                      </div>
                    </div>
                    {elements.length > 1 && (
                      <button onClick={() => removeElement(el.id)}
                        className="text-gray-600 hover:text-accent mt-5">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {et.dims.map(dim => (
                      <div key={dim}>
                        <label className="label">{DIM_LABELS[dim]}</label>
                        <input className="input" type="number" min="0.01" step="0.01"
                          value={el[dim] ?? 0}
                          onChange={e => updateElement(el.id, dim, parseFloat(e.target.value) || 0)} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3">
            <button className="btn-ghost flex items-center gap-2" onClick={addElement}>
              <Plus size={15} /> Add Element
            </button>
            <button className="btn-accent flex-1 flex items-center justify-center gap-2"
              onClick={runAnalysis} disabled={loading}>
              <Building2 size={16} />
              {loading ? 'Calculating…' : 'Run Structural Takeoff'}
            </button>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="space-y-4">
          {tot ? (
            <>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Quantity Totals</h3>
                <div className="space-y-3">
                  <div className="bg-white/5 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-orange-400">{tot.concrete_m3} m³</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Concrete Volume</p>
                    <p className="text-xs text-gray-600">{result.concrete_class}</p>
                  </div>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{tot.rebar_tons} tons</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rebar / RSB ({tot.rebar_kg} kg)</p>
                    <p className="text-xs text-gray-600">{result.rebar_grade}</p>
                  </div>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{tot.formwork_m2} m²</p>
                    <p className="text-xs text-gray-400 mt-0.5">Formwork Area</p>
                  </div>
                </div>
              </div>

              {/* Per element breakdown */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Element Breakdown</h3>
                <div className="space-y-1.5 text-xs">
                  {result.elements.map((el, i) => (
                    <div key={i} className="bg-white/5 rounded p-2">
                      <p className="font-medium text-white">{el.label} <span className="text-gray-500">×{el.quantity}</span></p>
                      <p className="text-gray-400">{el.dimensions}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-orange-400">{el.concrete_m3} m³</span>
                        <span className="text-blue-400">{el.rebar_kg} kg</span>
                        <span className="text-green-400">{el.formwork_m2} m²</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <Building2 size={36} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Add elements and run takeoff</p>
            </div>
          )}
        </div>
      </div>

      {/* Material Quantities Table */}
      {result?.material_quantities && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-gray-300">Structural Bill of Materials</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="table-head">
                  <th className="text-left px-3 py-2">Material</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Size / Spec</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.material_quantities.map((m, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-3 py-2 font-medium text-white">{m.material}</td>
                    <td className="px-3 py-2 text-gray-400">{m.category}</td>
                    <td className="px-3 py-2 text-center text-gray-300">{m.size || '—'}</td>
                    <td className="px-3 py-2 text-center font-bold text-accent">{m.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-gray-400">{m.unit}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
