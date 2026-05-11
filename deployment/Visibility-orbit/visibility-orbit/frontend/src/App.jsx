import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './api/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Layout from './components/Layout'
import BrandList from './pages/BrandList'
import BrandDetail from './pages/BrandDetail'
import Probes from './pages/Probes'
import Alerts from './pages/Alerts'
import KnowledgeCore from './pages/KnowledgeCore'

function RequireAuth({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/brands" replace />} />
          <Route path="brands"                              element={<BrandList />} />
          <Route path="brands/:brandId"                    element={<BrandDetail />} />
          <Route path="brands/:brandId/probes"             element={<Probes />} />
          <Route path="brands/:brandId/alerts"             element={<Alerts />} />
          <Route path="brands/:brandId/knowledge"          element={<KnowledgeCore />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
