import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { learningAPI } from '../services/api'
import { Brain, Sparkles, ArrowRight } from 'lucide-react'
import { ErrorMessage, Spinner } from '../components/ui'
import toast from 'react-hot-toast'

const SUGGESTED = ['Python', 'Machine Learning', 'SQL', 'Data Structures', 'JavaScript', 'React', 'Java', 'Cloud Computing', 'Docker & Kubernetes', 'System Design']

export default function CreateGoal() {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true); setError('')
    try {
      const res = await learningAPI.createGoal({ topic: topic.trim(), description })
      toast.success('Goal created! Generating your roadmap...')
      navigate(`/goals/${res.data.id}`)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create goal') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">What do you want to learn?</h1>
        <p className="text-gray-500">The AI will generate a complete personalized roadmap for you</p>
      </div>

      <div className="card mb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Learning Topic *</label>
            <input type="text" className="input text-lg" placeholder="e.g. Python, Machine Learning, SQL..." value={topic} onChange={e => setTopic(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Context (optional)</label>
            <textarea className="input resize-none" rows={3} placeholder="e.g. I'm a beginner, I want to focus on web development..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <ErrorMessage message={error} />
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3" disabled={loading || !topic.trim()}>
            {loading ? <><Spinner size="sm" /> Creating your learning path...</> : <><Sparkles className="w-4 h-4" /> Generate My Roadmap <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-3">Popular topics:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map(s => (
            <button key={s} onClick={() => setTopic(s)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${topic === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
