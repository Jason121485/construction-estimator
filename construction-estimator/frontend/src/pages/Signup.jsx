import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../utils/api'

export default function Signup() {
  const { signup } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({
    full_name:    '',
    company_name: '',
    email:        '',
    password:     '',
    confirm:      '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [warming, setWarming] = useState(true)

  // Ping the backend on mount so Render wakes up before the user submits
  useEffect(() => {
    api.get('/health').finally(() => setWarming(false))
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters')
    }
    if (form.password !== form.confirm) {
      return setError('Passwords do not match')
    }

    setLoading(true)
    try {
      await signup(form.email, form.password, form.full_name, form.company_name)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (!err.response) {
        setError('Server is starting up — please wait a moment and try again.')
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Signup failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Eng<span className="text-accent">Est</span> Pro
          </h1>
          <p className="text-gray-500 text-sm mt-1">Start your 30-day free trial</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Create your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input w-full"
                type="text"
                name="full_name"
                placeholder="Juan dela Cruz"
                value={form.full_name}
                onChange={handleChange}
                autoFocus
              />
            </div>

            <div>
              <label className="label">Company Name</label>
              <input
                className="input w-full"
                type="text"
                name="company_name"
                placeholder="ABC Engineering"
                value={form.company_name}
                onChange={handleChange}
              />
            </div>

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
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input w-full"
                type="password"
                name="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                className="input w-full"
                type="password"
                name="confirm"
                placeholder="••••••••"
                value={form.confirm}
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
              {warming ? 'Connecting…' : loading ? 'Creating account…' : 'Start Free Trial'}
            </button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-4">
            30-day free trial · No credit card required
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
