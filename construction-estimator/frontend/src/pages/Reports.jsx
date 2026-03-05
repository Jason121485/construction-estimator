import { useEffect, useState } from 'react'
import { getProjects, getBOQData, downloadBOQ, downloadReport } from '../utils/api'
import { FileText, Download, BarChart3, List } from 'lucide-react'

export default function Reports() {
  const [projects, setProjects]   = useState([])
  const [selProject, setSelProject] = useState('')
  const [boqData, setBoqData]     = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => { getProjects().then(r => setProjects(r.data)) }, [])

  useEffect(() => {
    if (!selProject) { setBoqData(null); return }
    setLoading(true)
    getBOQData(selProject)
      .then(r => setBoqData(r.data))
      .catch(() => setBoqData(null))
      .finally(() => setLoading(false))
  }, [selProject])

  const project = projects.find(p => p.id === parseInt(selProject))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">Generate BOQ and Engineering Reports as PDF</p>
      </div>

      {/* Project selector */}
      <div className="card">
        <label className="label">Select Project</label>
        <select className="input max-w-sm" value={selProject}
          onChange={e => setSelProject(e.target.value)}>
          <option value="">Choose a project…</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.project_name}</option>
          ))}
        </select>
      </div>

      {!selProject ? (
        <div className="card text-center py-16">
          <FileText size={40} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a project to generate reports</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Loading BOQ data…</div>
      ) : !boqData ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No estimate data found. Run the Cost Estimator first.</p>
        </div>
      ) : (
        <>
          {/* Download buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card text-center space-y-3">
              <List size={32} className="text-blue-400 mx-auto" />
              <div>
                <h3 className="font-semibold text-white">Bill of Quantities (BOQ)</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Complete material list with quantities, unit prices, and totals
                </p>
              </div>
              <button
                onClick={() => downloadBOQ(selProject)}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Download size={16} /> Download BOQ PDF
              </button>
            </div>

            <div className="card text-center space-y-3">
              <BarChart3 size={32} className="text-accent mx-auto" />
              <div>
                <h3 className="font-semibold text-white">Engineering Report</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Full report with project info, calculations, and cost summary
                </p>
              </div>
              <button
                onClick={() => downloadReport(selProject)}
                className="btn-accent w-full flex items-center justify-center gap-2">
                <Download size={16} /> Download Engineering PDF
              </button>
            </div>
          </div>

          {/* BOQ Preview */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">BOQ Preview</h3>

            {/* Project info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 pb-4 border-b border-white/10">
              {[
                { label: 'Project',  val: boqData.project.name },
                { label: 'Location', val: boqData.project.location || '—' },
                { label: 'Type',     val: boqData.project.building_type || '—' },
                { label: 'Floors',   val: boqData.project.floors || '—' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-medium text-white mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-5 pb-4 border-b border-white/10">
              {[
                { label: 'Material Cost', val: `₱${(boqData.summary.material_cost || 0).toLocaleString()}`, color: 'text-blue-400' },
                { label: 'Labor Cost',    val: `₱${(boqData.summary.labor_cost    || 0).toLocaleString()}`, color: 'text-yellow-400' },
                { label: 'Grand Total',   val: `₱${(boqData.summary.grand_total   || 0).toLocaleString()}`, color: 'text-accent' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center bg-white/5 rounded p-3">
                  <p className={`text-lg font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head">
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit Price</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {boqData.items.map((item, i) => (
                    <tr key={i} className="table-row">
                      <td className="px-3 py-2 text-gray-600">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-white">{item.item_name}</td>
                      <td className="px-3 py-2 text-center text-gray-400">{item.category}</td>
                      <td className="px-3 py-2 text-center text-gray-400">{item.size || '—'}</td>
                      <td className="px-3 py-2 text-center text-gray-400">{item.unit || '—'}</td>
                      <td className="px-3 py-2 text-center text-white">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-300">
                        ₱{(item.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-accent">
                        ₱{(item.total_cost || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-navy/40 text-sm font-bold">
                    <td colSpan={7} className="px-3 py-3 text-right text-gray-300">GRAND TOTAL</td>
                    <td className="px-3 py-3 text-right text-accent">
                      ₱{(boqData.summary.grand_total || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
