import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Brain } from 'lucide-react'
import { ErrorMessage, Spinner } from '../components/ui'
import { GoogleLogin } from '@react-oauth/google'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await authAPI.register(form)
      login(res.data.access_token, res.data.user)
      toast.success('Account created! Welcome aboard!')
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      const status = err.response?.status
      if (detail) {
        setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
      } else if (err.request) {
        setError(`Cannot reach server — check your connection or try again. (${err.message})`)
      } else {
        setError(err.message || 'Registration failed')
      }
      if (status) setError(prev => `${prev} [${status}]`)
    } finally { setLoading(false) }
  }

  const handleGoogle = async (credentialResponse) => {
    try {
      const res = await authAPI.google(credentialResponse.credential)
      login(res.data.access_token, res.data.user)
      toast.success('Account created! Welcome aboard!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed')
    }
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input type={type} className="input" placeholder={placeholder} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key !== 'full_name'} />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-500 mt-1">Start your AI-powered learning journey</p>
        </div>

        <div className="card">
          {/* Google Button */}
          <div className="flex justify-center mb-4">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error('Google sign-in failed')}
              theme="outline"
              size="large"
              width="100%"
              text="signup_with"
              shape="rectangular"
            />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or register with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {field('full_name', 'Full Name (optional)', 'text', 'John Doe')}
            {field('username', 'Username', 'text', 'johndoe')}
            {field('email', 'Email', 'email', 'you@example.com')}
            {field('password', 'Password', 'password', '••••••••')}
            <ErrorMessage message={error} />
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
