import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Keywords from './pages/Keywords'
import Serp from './pages/Serp'
import AiScan from './pages/AiScan'
import Heatmap from './pages/Heatmap'
import Questions from './pages/Questions'
import Competitors from './pages/Competitors'
import Content from './pages/Content'

export default function DiscoverApp() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      {/* Onboarding is now the brand-level wizard at /dashboard/onboarding */}
      <Route path="onboarding"  element={<Navigate to="/dashboard/onboarding" replace />} />
      <Route path="keywords"    element={<Keywords />} />
      <Route path="competitors" element={<Competitors />} />
      <Route path="content"     element={<Content />} />
      <Route path="serp"        element={<Serp />} />
      <Route path="ai-scan"     element={<AiScan />} />
      <Route path="heatmap"     element={<Heatmap />} />
      <Route path="questions"   element={<Questions />} />
    </Routes>
  )
}
