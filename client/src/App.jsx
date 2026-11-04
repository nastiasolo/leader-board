import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import DisplayPage from './pages/DisplayPage.jsx';
import Login from './pages/Login.jsx';

function ProtectedLayout() {
  const { loading, user } = useAuth();

  if (loading) {
    return <main className="app" aria-busy="true">Loading your account…</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.is_display) {
    return <Navigate to="/display" replace />;
  }

  return <Layout />;
}

function AdminRoute() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminPanel /> : <Navigate to="/dashboard" replace />;
}

function DisplayRoute() {
  const { loading, user } = useAuth();

  if (loading) {
    return <main className="app" aria-busy="true">Loading your account…</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_admin && !user.is_display) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DisplayPage />;
}

function AppRoutes() {
  const { loading, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : user ? (
          <Navigate to={user.is_display ? '/display' : '/dashboard'} replace />
        ) : <Login />}
      />
      <Route path="/display" element={<DisplayRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
