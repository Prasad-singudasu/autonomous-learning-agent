import { useState, useEffect } from 'react'
import { progressAPI } from '../services/api'
import { LoadingScreen, EmptyState, PageHeader } from '../components/ui'
import { History as HistoryIcon, Target, CheckCircle, HelpCircle, Brain, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const eventIcons = {
  goal_created: Target, roadmap_generated: Brain,
  quiz_submitted: HelpCircle, feynman_session: Zap, checkpoint_completed: CheckCircle,
}
const eventColors = {
  goal_created: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30',
  roadmap_generated: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  quiz_submitted: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  feynman_session: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  checkpoint_completed: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
}

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    progressAPI.getHistory()
      .then(res => setHistory(res.data))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <div className="p-8">
      <PageHeader title="Learning History" subtitle="Your complete learning journey" />

      {history.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No history yet" description="Start learning to see your activity here" />
      ) : (
        <div className="space-y-3">
          {history.map(item => {
            const Icon = eventIcons[item.event_type] || HistoryIcon
            const colorClass = eventColors[item.event_type] || 'text-gray-500 bg-gray-100 dark:bg-gray-800'
            return (
              <div key={item.id} className="card flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.topic}</p>
                    <span className="text-xs text-gray-400 shrink-0">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.event_type.replace(/_/g, ' ')}</p>
                  {item.event_data && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.event_data.score !== undefined && (
                        <span className={`badge ${item.event_data.passed ? 'badge-success' : 'badge-warning'}`}>
                          Score: {item.event_data.score?.toFixed(0)}%
                        </span>
                      )}
                      {item.event_data.checkpoint && <span className="badge-info">{item.event_data.checkpoint}</span>}
                      {item.event_data.phases && <span className="badge-info">{item.event_data.phases} phases</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
