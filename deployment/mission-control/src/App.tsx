import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

// Import all sub-modules
import DiscoverApp from './modules/discover/App';
import VisibilityApp from './modules/visibility/App';
import CreateApp from './modules/create/App';
import OptimizeApp from './modules/optimize/App';
import KnowledgeApp from './modules/knowledge/App';
import BrandList from './modules/brands/pages/BrandList';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />}>
          {/* Nested routes for components */}
          <Route path="discover/*" element={<DiscoverApp />} />
          <Route path="brands" element={<BrandList />} />
          <Route path="visibility/*" element={<VisibilityApp />} />
          <Route path="create/*" element={<CreateApp />} />
          <Route path="optimize/*" element={<OptimizeApp />} />
          <Route path="knowledge/*" element={<KnowledgeApp />} />
          <Route path="settings" element={<div>Settings UI will be injected here.</div>} />
        </Route>
        <Route path="*" element={<div style={{ padding: '2rem', color: 'white' }}><h2>404 Not Found</h2><p>No route matches this URL.</p></div>} />
      </Routes>
    </Router>
  );
};

export default App;
