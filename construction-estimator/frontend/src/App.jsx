import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Pricing from './pages/Pricing'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import PlumbingCalculator from './pages/PlumbingCalculator'
import ElectricalCalculator from './pages/ElectricalCalculator'
import StructuralCalculator from './pages/StructuralCalculator'
import SolarCalculator from './pages/SolarCalculator'
import MaterialDatabase from './pages/MaterialDatabase'
import CostEstimator from './pages/CostEstimator'
import Reports from './pages/Reports'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login"   element={<Login />} />
          <Route path="/signup"  element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Protected routes — require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="projects"    element={<Projects />} />
            <Route path="calculator"  element={<PlumbingCalculator />} />
            <Route path="electrical"  element={<ElectricalCalculator />} />
            <Route path="structural"  element={<StructuralCalculator />} />
            <Route path="solar"       element={<SolarCalculator />} />
            <Route path="materials"   element={<MaterialDatabase />} />
            <Route path="estimator"   element={<CostEstimator />} />
            <Route path="reports"     element={<Reports />} />
            <Route path="admin"       element={<AdminPanel />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
