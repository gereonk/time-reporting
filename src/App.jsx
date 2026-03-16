import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ConsultantTimeReporting from './pages/consultant/TimeReporting'
import Vacation from './pages/consultant/Vacation'
import Summary from './pages/consultant/Summary'
import SettingsPage from './pages/consultant/Settings'
import AdminTimeReporting from './pages/admin/AdminTimeReporting'
import AdminUsers from './pages/admin/AdminUsers'

function RootRedirect() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  if (profile?.role === 'admin') {
    return <Navigate to="/admin/time-reporting" replace />
  }

  return <Navigate to="/time-reporting" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<RootRedirect />} />

            {/* Consultant routes */}
            <Route path="/time-reporting" element={<ConsultantTimeReporting />} />
            <Route path="/vacation" element={<Vacation />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Admin routes */}
            <Route path="/admin/time-reporting" element={<AdminTimeReporting />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#1e293b',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
