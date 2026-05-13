import { Routes, Route, Outlet } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import EntitiesPage from './pages/Entities'
import EntityDetail from './pages/EntityDetail'
import SourcesPage from './pages/Sources'
import AuthorsPage from './pages/Authors'
import FactGuardPage from './pages/FactGuard'

// Wrapper keeps max-width so content doesn't stretch too wide on large screens
// Padding is handled by the DashboardPage module wrapper (2rem all sides)
function KnowledgeLayout() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <Outlet />
    </div>
  )
}

export default function KnowledgeApp() {
  return (
    <Routes>
      <Route element={<KnowledgeLayout />}>
        <Route index                 element={<Dashboard />} />
        <Route path="entities"      element={<EntitiesPage />} />
        <Route path="entities/:id"  element={<EntityDetail />} />
        <Route path="sources"       element={<SourcesPage />} />
        <Route path="authors"       element={<AuthorsPage />} />
        <Route path="factguard"     element={<FactGuardPage />} />
      </Route>
    </Routes>
  )
}
