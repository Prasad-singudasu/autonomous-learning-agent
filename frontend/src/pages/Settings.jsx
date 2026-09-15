import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/ui'
import { User, Mail, Calendar } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Profile & Settings" subtitle="Manage your account" />

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.full_name || user?.username}</h2>
            <p className="text-gray-500">@{user?.username}</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { icon: User, label: 'Username', value: user?.username },
            { icon: Mail, label: 'Email', value: user?.email },
            { icon: Calendar, label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 text-sm w-32">{label}</span>
              <span className="text-gray-800 dark:text-gray-200 text-sm">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
        <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">AI Learning Agent</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Powered by Gemini AI with Groq fallback. Your learning data is private and isolated to your account.</p>
      </div>
    </div>
  )
}
