import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [warming, setWarming] = useState(true)

  useEffect(() => {
    api.get('/health').finally(() => setWarming(false))
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (!err.response) {
        setError('Server is starting up — please wait a moment and try again.')
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Eng<span className="text-accent">Est</span> Pro
          </h1>
          <p className="text-gray-500 text-sm mt-1">Engineering Construction Estimator</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input w-full"
                type="email"
                name="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input w-full"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-accent w-full justify-center"
              disabled={loading || warming}
            >
              {warming ? 'Connecting…' : loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  )
}
