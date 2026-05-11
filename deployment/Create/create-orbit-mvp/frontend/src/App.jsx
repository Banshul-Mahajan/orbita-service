import { Routes, Route, Navigate } from 'react-router-dom'
import useAuth from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BrandSetupPage from './pages/BrandSetupPage'
import DashboardPage from './pages/DashboardPage'
import CorpusPage from './pages/CorpusPage'
import BriefBuilderPage from './pages/BriefBuilderPage'
import BriefDetailPage from './pages/BriefDetailPage'
import EditorPage from './pages/EditorPage'

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}

function ProtectedRoute({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (!getCookie('orbit_brand_id')) return <Navigate to="/brand-setup" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/brand-setup" element={<BrandSetupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="corpus" element={<CorpusPage />} />
        <Route path="briefs/new" element={<BriefBuilderPage />} />
        <Route path="briefs/:id" element={<BriefDetailPage />} />
        <Route path="editor/:id" element={<EditorPage />} />
      </Route>
    </Routes>
  )
}
