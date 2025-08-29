
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Mappings from './pages/Mappings';
import Reconciliation from './pages/Reconciliation';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/mappings" element={<Mappings />} />
        <Route path="/reconciliation" element={<Reconciliation />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
