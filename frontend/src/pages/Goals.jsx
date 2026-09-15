import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { learningAPI } from '../services/api'
import { LoadingScreen, EmptyState, PageHeader } from '../components/ui'
import { Target, Plus, ArrowRight, Map } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    learningAPI.getGoals()
      .then(res => setGoals(res.data))
      .catch(() => toast.error('Failed to load goals'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <div className="p-8">
      <PageHeader
        title="Learning Goals"
        subtitle="All your learning journeys"
        action={<button onClick={() => navigate('/goals/new')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Goal</button>}
      />

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create your first learning goal to get started"
          action={<button onClick={() => navigate('/goals/new')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Create Goal</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <div key={goal.id} className="card hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors cursor-pointer group" onClick={() => navigate(`/goals/${goal.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className={`badge ${goal.status === 'active' ? 'badge-success' : 'badge-gray'}`}>{goal.status}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{goal.topic}</h3>
              {goal.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{goal.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{goal.total_progress?.toFixed(0)}% complete</span>
                <span className="text-indigo-500 dark:text-indigo-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  {goal.roadmap ? <><Map className="w-3.5 h-3.5" /> View Roadmap</> : 'Get Started'} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
