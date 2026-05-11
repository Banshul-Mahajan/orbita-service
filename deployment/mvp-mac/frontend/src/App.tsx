import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Keywords from './pages/Keywords'
import Serp from './pages/Serp'
import AiScan from './pages/AiScan'
import Heatmap from './pages/Heatmap'
import Questions from './pages/Questions'
import Competitors from './pages/Competitors'
import Content from './pages/Content'

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/keywords"  element={<Keywords />} />
            <Route path="/competitors" element={<Competitors />} />
            <Route path="/content" element={<Content />} />
            <Route path="/serp"      element={<Serp />} />
            <Route path="/ai-scan"   element={<AiScan />} />
            <Route path="/heatmap"   element={<Heatmap />} />
            <Route path="/questions" element={<Questions />} />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  )
}
