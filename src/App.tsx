// PATH: src/App.tsx

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MonitoringPage from "./pages/admin/MonitoringPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import CommunityImpactAdminDashboard from "./pages/admin/CommunityImpactAdminDashboard";

function NotFoundPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-semibold">Page Not Found</h1>
        <p className="mt-2 text-slate-600">
          The page you requested does not exist.
        </p>
      </div>
    </div>
  );
}

function AdminSectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-slate-600">
          This admin section is not yet implemented. Routing is registered, but
          the dedicated page still needs to be built.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/monitoring" replace />} />

        <Route path="/admin" element={<AdminHomePage />} />
        <Route
          path="/admin/dashboard"
          element={<CommunityImpactAdminDashboard />}
        />
        <Route path="/admin/monitoring" element={<MonitoringPage />} />
        <Route
          path="/admin/rewards"
          element={<AdminSectionPlaceholder title="Rewards Admin" />}
        />
        <Route
          path="/admin/execution"
          element={<AdminSectionPlaceholder title="Execution Admin" />}
        />
        <Route
          path="/admin/users"
          element={<AdminSectionPlaceholder title="Users Admin" />}
        />

        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route path="*" element={<NotFoundPlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}