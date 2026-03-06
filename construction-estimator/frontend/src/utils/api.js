import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Backend warmup (singleton — fires once regardless of how many callers) ────
let _warmupPromise = null
export function warmup() {
  if (!_warmupPromise) {
    _warmupPromise = api.get('/health').catch(() => {})
  }
  return _warmupPromise
}

// ── Auth interceptors ─────────────────────────────────────────────────────────

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 (invalid/expired token) and 402 (trial/subscription expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      // Token is invalid — clear storage and redirect to login
      localStorage.removeItem('access_token')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    if (status === 402) {
      // Trial expired or subscription inactive
      window.dispatchEvent(
        new CustomEvent('subscription-expired', { detail: error.response.data })
      )
    }

    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authSignup = (data) => api.post('/auth/signup', data)
export const authLogin  = (data) => api.post('/auth/login', data)
export const getMe      = ()     => api.get('/auth/me')

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects       = ()           => api.get('/projects/')
export const getProject        = (id)         => api.get(`/projects/${id}`)
export const createProject     = (data)       => api.post('/projects/', data)
export const updateProject     = (id, data)   => api.put(`/projects/${id}`, data)
export const deleteProject     = (id)         => api.delete(`/projects/${id}`)
export const getProjectSummary = (id)         => api.get(`/projects/${id}/summary`)

// ── Materials ─────────────────────────────────────────────────────────────────
export const getMaterials   = (params)     => api.get('/materials/', { params })
export const getCategories  = ()           => api.get('/materials/categories')
export const createMaterial = (data)       => api.post('/materials/', data)
export const updateMaterial = (id, data)   => api.put(`/materials/${id}`, data)
export const updatePrice    = (id, price)  => api.patch(`/materials/${id}/price`, { price })
export const deleteMaterial = (id)         => api.delete(`/materials/${id}`)

// ── Plumbing Calculations ─────────────────────────────────────────────────────
export const getFixtureTable = ()       => api.get('/calculations/fixtures/table')
export const runAnalysis     = (data)   => api.post('/calculations/analyze', data)
export const calcWsfu        = (data)   => api.post('/calculations/wsfu', data)

// ── Electrical ────────────────────────────────────────────────────────────────
export const getElectricalConstants = ()          => api.get('/electrical/constants')
export const runElectricalAnalysis  = (data)      => api.post('/electrical/analyze', data)
export const saveElectrical         = (pid, data) => api.post(`/electrical/${pid}/save`, data)
export const getLatestElectrical    = (pid)       => api.get(`/electrical/${pid}/latest`)

// ── Structural ────────────────────────────────────────────────────────────────
export const getStructuralConstants = ()          => api.get('/structural/constants')
export const runStructuralAnalysis  = (data)      => api.post('/structural/analyze', data)
export const saveStructural         = (pid, data) => api.post(`/structural/${pid}/save`, data)
export const getLatestStructural    = (pid)       => api.get(`/structural/${pid}/latest`)

// ── Solar ─────────────────────────────────────────────────────────────────────
export const getSolarConstants = ()          => api.get('/solar/constants')
export const runSolarAnalysis  = (data)      => api.post('/solar/analyze', data)
export const saveSolar         = (pid, data) => api.post(`/solar/${pid}/save`, data)
export const getLatestSolar    = (pid)       => api.get(`/solar/${pid}/latest`)

// ── Estimates ─────────────────────────────────────────────────────────────────
export const getEstimate        = (pid)           => api.get(`/estimates/${pid}`)
export const addEstimateItem    = (pid, data)      => api.post(`/estimates/${pid}/items`, data)
export const updateEstimateItem = (pid, id, data)  => api.put(`/estimates/${pid}/items/${id}`, data)
export const deleteEstimateItem = (pid, id)        => api.delete(`/estimates/${pid}/items/${id}`)
export const autoGenerate       = (pid, data)      => api.post(`/estimates/${pid}/auto-generate`, data)
export const getEstimateSummary = (pid)            => api.get(`/estimates/${pid}/summary`)

// ── Reports ───────────────────────────────────────────────────────────────────
export const getBOQData     = (pid) => api.get(`/reports/${pid}/boq/data`)
export const downloadBOQ    = (pid) => window.open(`/api/reports/${pid}/boq/pdf`, '_blank')
export const downloadReport = (pid) => window.open(`/api/reports/${pid}/engineering/pdf`, '_blank')

export default api
