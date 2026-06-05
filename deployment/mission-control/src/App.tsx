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
import BrandsPage from './modules/brands/BrandsPage';
import OnboardingWizard from './modules/onboarding/OnboardingWizard';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />}>
          {/* Nested routes for components */}
          <Route path="onboarding" element={<OnboardingWizard />} />
          <Route path="discover/*" element={<DiscoverApp />} />
          <Route path="visibility/*" element={<VisibilityApp />} />
          <Route path="create/*" element={<CreateApp />} />
          <Route path="optimize/*" element={<OptimizeApp />} />
          <Route path="knowledge/*" element={<KnowledgeApp />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="settings" element={<div>Settings UI will be injected here.</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
