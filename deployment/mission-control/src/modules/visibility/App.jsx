import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider } from './api/auth'
import BrandDetail from './pages/BrandDetail'
import Probes from './pages/Probes'
import Alerts from './pages/Alerts'
import KnowledgeCore from './pages/KnowledgeCore'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : ''
}

function VisibilityHome() {
  const activeBrandId = getCookie('orbit_brand_id')

  if (activeBrandId) {
    return <Navigate to={`brands/${activeBrandId}`} replace />
  }

  return (
    <div className="max-w-4xl mx-auto py-16">
      <div className="card p-8">
        <p className="label mb-3">Visibility Orbit</p>
        <h1 className="text-2xl font-bold text-gray-100">Select a brand to monitor</h1>
        <p className="text-gray-500 text-sm mt-2 max-w-2xl">
          Visibility Orbit tracks probes, alerts, sentiment, and verified facts for a specific brand. Create or select a brand first, then open its visibility dashboard.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link className="btn-primary" to="/dashboard/brands">Open Brands</Link>
          <Link className="btn-secondary" to="/dashboard/discover/onboarding">Start Discover Onboarding</Link>
        </div>
      </div>
    </div>
  )
}

export default function VisibilityApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<VisibilityHome />} />
        <Route path="brands"                              element={<Navigate to="/dashboard/brands" replace />} />
        <Route path="brands/:brandId"                    element={<BrandDetail />} />
        <Route path="brands/:brandId/probes"             element={<Probes />} />
        <Route path="brands/:brandId/alerts"             element={<Alerts />} />
        <Route path="brands/:brandId/knowledge"          element={<KnowledgeCore />} />
      </Routes>
    </AuthProvider>
  )
}
