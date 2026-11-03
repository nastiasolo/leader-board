import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';

function ProtectedDashboard() {
  const { loading, user } = useAuth();

  if (loading) {
    return <main className="app" aria-busy="true">Loading your account…</main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="app">
      <h1 className="app__title">Dashboard</h1>
      <p className="app__message">Welcome, {user.name}.</p>
    </main>
  );
}

function AppRoutes() {
  const { loading, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<ProtectedDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
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
