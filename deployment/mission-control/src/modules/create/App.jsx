import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import CorpusPage from './pages/CorpusPage'
import BriefBuilderPage from './pages/BriefBuilderPage'
import BriefDetailPage from './pages/BriefDetailPage'
import EditorPage from './pages/EditorPage'

export default function CreateApp() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="corpus" element={<CorpusPage />} />
      <Route path="briefs/new" element={<BriefBuilderPage />} />
      <Route path="briefs/:id" element={<BriefDetailPage />} />
      <Route path="editor/:id" element={<EditorPage />} />
    </Routes>
  )
}
