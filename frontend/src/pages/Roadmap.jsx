import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { learningAPI } from '../services/api'
import { LoadingScreen, ProgressBar, Spinner } from '../components/ui'
import { CheckCircle, Lock, Circle, ChevronRight, Map, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Roadmap() {
  const { goalId } = useParams()
  const navigate = useNavigate()
  const [goal, setGoal] = useState(null)
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadGoal() }, [goalId])

  const loadGoal = async () => {
    try {
      const res = await learningAPI.getGoal(goalId)
      setGoal(res.data)
      if (res.data.roadmap) setRoadmap(res.data.roadmap)
    } catch { toast.error('Failed to load goal') }
    finally { setLoading(false) }
  }

  const generateRoadmap = async () => {
    setGenerating(true)
    try {
      await learningAPI.generateRoadmap(goalId)
      await loadGoal()
      toast.success('Roadmap generated!')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to generate roadmap') }
    finally { setGenerating(false) }
  }

  const handleCheckpoint = (cp) => {
    if (!cp.is_unlocked) { toast.error('Complete previous checkpoints first'); return }
    navigate(`/checkpoint/${cp.id}`)
  }

  if (loading) return <LoadingScreen message="Loading roadmap..." />

  const totalCPs = roadmap?.phases?.reduce((s, p) => s + p.checkpoints.length, 0) || 0
  const completedCPs = roadmap?.phases?.reduce((s, p) => s + p.checkpoints.filter(c => c.is_completed).length, 0) || 0

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{goal?.topic}</h1>
          <p className="text-gray-500 mt-1">Learning Roadmap</p>
        </div>
        {roadmap && (
          <div className="text-right">
            <p className="text-sm text-gray-500">{completedCPs}/{totalCPs} checkpoints</p>
            <ProgressBar value={completedCPs} max={totalCPs || 1} showLabel={false} size="sm" />
          </div>
        )}
      </div>

      {!roadmap ? (
        <div className="card text-center py-16">
          <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No roadmap yet</h2>
          <p className="text-gray-500 mb-6">Generate your personalized learning roadmap with AI</p>
          <button onClick={generateRoadmap} disabled={generating} className="btn-primary inline-flex items-center gap-2">
            {generating ? <><Spinner size="sm" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Roadmap</>}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {roadmap.overview && (
            <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{roadmap.overview}</p>
            </div>
          )}

          {roadmap.phases?.map((phase, pi) => (
            <div key={phase.id} className={`card ${!phase.is_unlocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${phase.is_completed ? 'bg-emerald-600 text-white' : phase.is_unlocked ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {phase.is_completed ? <CheckCircle className="w-4 h-4" /> : pi + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{phase.title}</h3>
                  {phase.description && <p className="text-gray-500 text-xs">{phase.description}</p>}
                </div>
                {!phase.is_unlocked && <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600 ml-auto" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {phase.checkpoints?.map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => handleCheckpoint(cp)}
                    disabled={!cp.is_unlocked}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      cp.is_completed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600' :
                      cp.is_unlocked ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' :
                      'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                    }`}
                  >
                    <div className="shrink-0">
                      {cp.is_completed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                       cp.is_unlocked ? <Circle className="w-5 h-5 text-indigo-500" /> :
                       <Lock className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${cp.is_unlocked ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>{cp.title}</p>
                      {cp.is_completed && <p className="text-xs text-emerald-600 dark:text-emerald-500">{cp.best_score?.toFixed(0)}% score</p>}
                      {cp.is_unlocked && !cp.is_completed && cp.attempts > 0 && <p className="text-xs text-yellow-600 dark:text-yellow-500">{cp.attempts} attempt(s)</p>}
                    </div>
                    {cp.is_unlocked && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
