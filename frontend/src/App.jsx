import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './layouts/AppLayout'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import CreateGoal from './pages/CreateGoal'
import Roadmap from './pages/Roadmap'
import Lesson from './pages/Lesson'
import Quiz from './pages/Quiz'
import Feynman from './pages/Feynman'
import Progress from './pages/Progress'
import History from './pages/History'
import Materials from './pages/Materials'
import Resources from './pages/Resources'
import Tutor from './pages/Tutor'
import Settings from './pages/Settings'

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#f3f4f6', border: '1px solid #374151' },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/goals/new" element={<CreateGoal />} />
            <Route path="/goals/:goalId" element={<Roadmap />} />
            <Route path="/checkpoint/:checkpointId" element={<Lesson />} />
            <Route path="/quiz/:checkpointId" element={<Quiz />} />
            <Route path="/feynman/:checkpointId" element={<Feynman />} />
            <Route path="/progress" element={<Navigate to="/goals" replace />} />
            <Route path="/progress/:goalId" element={<Progress />} />
            <Route path="/history" element={<History />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:checkpointId" element={<Resources />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
