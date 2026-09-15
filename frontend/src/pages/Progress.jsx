import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { progressAPI, learningAPI } from '../services/api'
import { LoadingScreen, ProgressBar, PageHeader } from '../components/ui'
import { TrendingUp, CheckCircle, AlertTriangle, Clock, Zap, Activity, Target, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Progress() {
  const { goalId } = useParams()
  const [progress, setProgress] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (goalId) {
      progressAPI.getProgress(goalId)
        .then(res => setProgress(res.data))
        .catch(() => toast.error('Failed to load progress'))
        .finally(() => setLoading(false))
    } else {
      learningAPI.getGoals()
        .then(res => setGoals(res.data))
        .catch(() => toast.error('Failed to load goals'))
        .finally(() => setLoading(false))
    }
  }, [goalId])

  if (loading) return <LoadingScreen />

  if (!goalId) return (
    <div className="p-8">
      <PageHeader title="Progress & Analytics" subtitle="Select a goal to view detailed progress" />
      {goals.length === 0 ? (
        <p className="text-gray-500">No learning goals yet. <Link to="/goals/new" className="text-indigo-600 dark:text-indigo-400 hover:underline">Create one</Link>.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => (
            <Link key={g.id} to={`/progress/${g.id}`} className="card hover:border-indigo-400 dark:hover:border-indigo-700 transition-colors flex items-center justify-between group">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{g.topic}</p>
                <p className="text-sm text-gray-500">{g.total_progress?.toFixed(0)}% complete</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="p-8">
      <PageHeader title={`Progress: ${progress.topic}`} subtitle="Your learning analytics" />

      <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium uppercase tracking-wide">What to do next</p>
            <p className="text-gray-900 dark:text-white font-semibold">{progress.next_recommendation}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Overall Progress', value: `${progress.total_progress?.toFixed(0)}%`, icon: TrendingUp, color: 'text-indigo-500' },
          { label: 'Checkpoints Done', value: `${progress.completed_checkpoints?.length || 0}/${progress.total_checkpoints}`, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Avg Score', value: `${progress.average_score?.toFixed(1)}%`, icon: Zap, color: 'text-yellow-500' },
          { label: 'Study Time', value: `${progress.total_study_time_minutes}m`, icon: Clock, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Overall Progress</h3>
          <ProgressBar value={progress.total_progress} size="lg" color="indigo" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>0%</span><span>Mastery</span><span>100%</span>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Current Position</h3>
          <div className="space-y-3">
            {[
              { label: 'Phase', value: progress.current_phase || 'Not started' },
              { label: 'Checkpoint', value: progress.current_checkpoint || 'Not started' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Streak</span>
              <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">🔥 {progress.current_streak_days} days</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Strong Areas
          </h3>
          {progress.strong_areas?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {progress.strong_areas.map(a => <span key={a} className="badge-success">{a}</span>)}
            </div>
          ) : <p className="text-gray-500 text-sm">Complete more checkpoints to see strong areas</p>}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" /> Areas to Improve
          </h3>
          {progress.weak_areas?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {progress.weak_areas.map(a => <span key={a} className="badge-warning">{a}</span>)}
            </div>
          ) : <p className="text-gray-500 text-sm">No weak areas detected yet</p>}
        </div>
      </div>

      {progress.agent_activity_log?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Agent Activity
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[...progress.agent_activity_log].reverse().map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                {log.action}
                {log.score !== undefined && <span className={`ml-auto text-xs ${log.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{log.score?.toFixed(0)}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
