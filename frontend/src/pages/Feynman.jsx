import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { quizAPI, learningAPI } from '../services/api'
import { LoadingScreen, Spinner } from '../components/ui'
import ReactMarkdown from 'react-markdown'
import { Brain, Lightbulb, MessageSquare, ChevronRight, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Feynman() {
  const { checkpointId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const weakConcepts = location.state?.weakConcepts || []

  const [checkpoint, setCheckpoint] = useState(null)
  const [session, setSession] = useState(null)
  const [userExplanation, setUserExplanation] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [step, setStep] = useState('intro')

  useEffect(() => {
    learningAPI.getCheckpoint(checkpointId)
      .then(res => { setCheckpoint(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [checkpointId])

  const startFeynman = async () => {
    setGenerating(true)
    try {
      const res = await quizAPI.feynman({ checkpoint_id: checkpointId, weak_concepts: weakConcepts })
      setSession(res.data); setStep('reading')
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to generate Feynman explanation') }
    finally { setGenerating(false) }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feynman Learning</h1>
          <p className="text-gray-500 text-sm">{checkpoint?.title}</p>
        </div>
      </div>

      {weakConcepts.length > 0 && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mb-2">Concepts to strengthen:</p>
          <div className="flex flex-wrap gap-2">
            {weakConcepts.map(c => <span key={c} className="badge-warning">{c}</span>)}
          </div>
        </div>
      )}

      {step === 'intro' && (
        <div className="card text-center py-12">
          <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">The Feynman Technique</h2>
          <p className="text-gray-500 mb-2 max-w-md mx-auto">The AI will explain the difficult concepts in the simplest possible language using real-world analogies.</p>
          <p className="text-gray-400 text-sm mb-8">Then you'll explain it back in your own words to identify any remaining gaps.</p>
          <button onClick={startFeynman} disabled={generating} className="btn-primary inline-flex items-center gap-2">
            {generating ? <><Spinner size="sm" /> Generating explanation...</> : <><Zap className="w-4 h-4" /> Start Feynman Session</>}
          </button>
        </div>
      )}

      {step === 'reading' && session && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold text-yellow-700 dark:text-yellow-300">Simple Explanation</h2>
            </div>
            <ReactMarkdown
              components={{
                p: ({children}) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{children}</p>,
                h2: ({children}) => <h2 className="text-base font-semibold text-yellow-700 dark:text-yellow-300 mt-4 mb-2">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1">{children}</h3>,
                code: ({inline, children}) => inline
                  ? <code className="bg-gray-100 dark:bg-gray-800 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                  : <code className="block bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 rounded-xl text-sm font-mono overflow-x-auto mb-3">{children}</code>,
                ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700 dark:text-gray-300">{children}</ul>,
                strong: ({children}) => <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>,
              }}
            >
              {session.explanation}
            </ReactMarkdown>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('intro')} className="btn-secondary">← Back</button>
            <button onClick={() => setStep('explain')} className="btn-primary flex items-center gap-2">
              I understand, let me explain it <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'explain' && (
        <div className="space-y-6">
          <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h2 className="font-semibold text-indigo-700 dark:text-indigo-300">Your Turn</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-1">Explain the concept in your own words, as if teaching a 10-year-old.</p>
            <p className="text-gray-500 text-sm">Focus on: {weakConcepts.join(', ')}</p>
          </div>
          <div className="card">
            <textarea className="input resize-none w-full" rows={8} placeholder="Explain the concept in your own words..." value={userExplanation} onChange={e => setUserExplanation(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('reading')} className="btn-secondary">← Re-read</button>
            <button onClick={() => navigate(`/quiz/${checkpointId}`, { state: { isRetest: true, weakConcepts } })} disabled={!userExplanation.trim()} className="btn-primary flex items-center gap-2">
              Take Retest <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
