import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
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
      <Routes>
        <Route path="/" element={<Layout />}>
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
      </Routes>
    </BrowserRouter>
  )
}
