import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { ChartViewPage } from './pages/ChartViewPage';
import { DatasetOverviewPage } from './pages/DatasetOverviewPage';
import { SavedPage } from './pages/SavedPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="chart" element={<ChartViewPage />} />
          <Route path="datasets" element={<DatasetOverviewPage />} />
          <Route path="saved" element={<SavedPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
