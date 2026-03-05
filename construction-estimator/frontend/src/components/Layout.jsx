import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import TrialBanner from './TrialBanner'

export default function Layout() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => navigate('/pricing')
    window.addEventListener('subscription-expired', handler)
    return () => window.removeEventListener('subscription-expired', handler)
  }, [navigate])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-base">
      <TrialBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
