import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components'
import { AuthGate } from './components/AuthGate'
import Dashboard from './pages/Dashboard'
import EntitiesPage from './pages/Entities'
import EntityDetail from './pages/EntityDetail'
import SourcesPage from './pages/Sources'
import AuthorsPage from './pages/Authors'
import FactGuardPage from './pages/FactGuard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Layout>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/entities"      element={<EntitiesPage />} />
            <Route path="/entities/:id"  element={<EntityDetail />} />
            <Route path="/sources"       element={<SourcesPage />} />
            <Route path="/authors"       element={<AuthorsPage />} />
            <Route path="/factguard"     element={<FactGuardPage />} />
          </Routes>
        </Layout>
      </AuthGate>
    </BrowserRouter>
  )
}
