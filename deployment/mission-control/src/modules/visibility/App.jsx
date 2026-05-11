import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './api/auth'
import BrandList from './pages/BrandList'
import BrandDetail from './pages/BrandDetail'
import Probes from './pages/Probes'
import Alerts from './pages/Alerts'
import KnowledgeCore from './pages/KnowledgeCore'

export default function VisibilityApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<Navigate to="brands" replace />} />
        <Route path="brands"                              element={<BrandList />} />
        <Route path="brands/:brandId"                    element={<BrandDetail />} />
        <Route path="brands/:brandId/probes"             element={<Probes />} />
        <Route path="brands/:brandId/alerts"             element={<Alerts />} />
        <Route path="brands/:brandId/knowledge"          element={<KnowledgeCore />} />
      </Routes>
    </AuthProvider>
  )
}
