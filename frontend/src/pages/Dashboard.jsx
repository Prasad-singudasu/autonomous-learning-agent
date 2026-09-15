import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { learningAPI, progressAPI } from '../services/api'
import { LoadingScreen, ProgressBar, EmptyState } from '../components/ui'
import { Target, Plus, Brain, CheckCircle, TrendingUp, ArrowRight, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [goals, setGoals] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    learningAPI.getGoals()
      .then(async res => {
        const g = res.data
        setGoals(g)
        const pm = {}
        await Promise.all(g.map(async goal => {
          try { const p = await progressAPI.getProgress(goal.id); pm[goal.id] = p.data } catch {}
        }))
        setProgressMap(pm)
      })
      .catch(() => toast.error('Failed to load goals'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen message="Loading your dashboard..." />

  const activeGoals = goals.filter(g => g.status === 'active')
  const totalCompleted = Object.values(progressMap).reduce((s, p) => s + (p.completed_checkpoints?.length || 0), 0)
  const avgProgress = goals.length ? (goals.reduce((s, g) => s + g.total_progress, 0) / goals.length).toFixed(0) : 0

  const stats = [
    { label: 'Active Goals', value: activeGoals.length, icon: Target, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-l-violet-500' },
    { label: 'Checkpoints Done', value: totalCompleted, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-emerald-500' },
    { label: 'Total Goals', value: goals.length, icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
    { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-500' },
  ]

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name || user?.username} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Here's your learning overview</p>
        </div>
        <Link to="/goals/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Goal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 border-l-4 ${border} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Goals */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No learning goals yet"
          description="Create your first goal and let the AI build your personalized learning roadmap"
          action={<Link to="/goals/new" className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Create First Goal</Link>}
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Your Goals</h2>
            <Link to="/goals" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map(goal => {
              const progress = progressMap[goal.id]
              return (
                <div
                  key={goal.id}
                  className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(`/goals/${goal.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">{goal.topic}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">{goal.description || 'AI-powered learning path'}</p>
                    </div>
                    <span className={`badge shrink-0 ${goal.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{goal.status}</span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>{goal.total_progress.toFixed(0)}% complete</span>
                      {progress && <span>{progress.completed_checkpoints?.length || 0} checkpoints</span>}
                    </div>
                    <ProgressBar value={goal.total_progress} showLabel={false} size="sm" color="indigo" />
                  </div>

                  {progress?.next_recommendation && (
                    <div className="flex items-start gap-2 bg-violet-50 dark:bg-violet-900/15 rounded-lg px-3 py-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-violet-700 dark:text-violet-300">{progress.next_recommendation}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    <span className="text-xs text-violet-500 dark:text-violet-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Continue <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
