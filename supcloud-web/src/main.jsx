import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import './index.css'

import { AuthProvider } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import FilesPage from './pages/FilesPage'
import SearchPage from './pages/SearchPage'
import TrashPage from './pages/TrashPage'
import SharesPage from './pages/SharesPage'
import SettingsPage from './pages/SettingsPage'
import PublicSharePage from './pages/PublicSharePage'
import OAuthCallbackPage from './pages/OAuthCallbackPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/share/:token" element={<PublicSharePage />} />

          <Route element={<AppLayout />}>
            {/* Dashboard */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/trash" element={<TrashPage />} />

            <Route path="/shares" element={<SharesPage />} />
          </Route>
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1C1C1E',
            color: '#EBEBF5',
            border: '1px solid #2C2C2E',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#30D158', secondary: '#1C1C1E' } },
          error: { iconTheme: { primary: '#FF453A', secondary: '#1C1C1E' } },
        }}
      />
    </AuthProvider>
  </React.StrictMode>
)
