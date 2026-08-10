import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { ExperimentProvider } from '@/contexts/ExperimentContext';

import { routes } from './routes';

const App: React.FC = () => {
  return (
    <Router>
      <ExperimentProvider>
        <IntersectObserver />
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/workspace/dashboard" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </ExperimentProvider>
    </Router>
  );
};

export default App;
