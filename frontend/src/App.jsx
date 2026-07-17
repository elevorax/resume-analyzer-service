import React from 'react';
import AnalyzerPage from './pages/AnalyzerPage';
import Toast from './components/common/Toast';

/**
 * Main Application component for the pivoted AI Resume & Document Analyzer.
 * Renders the single-page workspace directly.
 */
export const App = () => {
  return (
    <div className="w-full min-h-screen bg-background">
      <AnalyzerPage />
      <Toast />
    </div>
  );
};

export default App;
