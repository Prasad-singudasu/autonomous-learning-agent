import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { learningAPI, quizAPI } from '../services/api'
import { LoadingScreen, Spinner, ProgressBar } from '../components/ui'
import { CheckCircle, XCircle, HelpCircle, Zap, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Quiz() {
  const { checkpointId } = useParams()
  const navigate = useNavigate()
  const [checkpoint, setCheckpoint] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    learningAPI.getCheckpoint(checkpointId)
      .then(res => { setCheckpoint(res.data); setLoading(false) })
      .catch(() => { toast.error('Failed to load checkpoint'); setLoading(false) })
  }, [checkpointId])

  const generateQuiz = async (isRetest = false, weakConcepts = []) => {
    setGenerating(true); setResult(null); setAnswers({})
    try {
      const res = await quizAPI.generate({ checkpoint_id: checkpointId, is_retest: isRetest, weak_concepts: weakConcepts })
      setQuiz(res.data)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to generate quiz') }
    finally { setGenerating(false) }
  }

  const submitQuiz = async () => {
    if (Object.keys(answers).length < quiz.questions.length) { toast.error('Please answer all questions'); return }
    setSubmitting(true)
    try {
      const res = await quizAPI.submit({ checkpoint_id: checkpointId, attempt_id: quiz.attempt_id, answers, is_retest: quiz.is_retest })
      setResult(res.data)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to submit quiz') }
    finally { setSubmitting(false) }
  }

  if (loading) return <LoadingScreen message="Loading quiz..." />

  const answered = Object.keys(answers).length
  const total = quiz?.questions?.length || 0

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz</h1>
          <p className="text-gray-500 mt-0.5">{checkpoint?.title}</p>
        </div>
        {quiz && !result && (
          <div className="text-right">
            <p className="text-sm text-gray-500">{answered}/{total} answered</p>
            <ProgressBar value={answered} max={total || 1} showLabel={false} size="sm" />
          </div>
        )}
      </div>

      {!quiz && !generating && (
        <div className="card text-center py-16">
          <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready for the quiz?</h2>
          <p className="text-gray-500 mb-2">You need 70% to pass and unlock the next checkpoint</p>
          <p className="text-sm text-gray-400 mb-6">Attempt #{(checkpoint?.attempts || 0) + 1}</p>
          <button onClick={() => generateQuiz()} className="btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" /> Start Quiz
          </button>
        </div>
      )}

      {generating && <LoadingScreen message="Generating quiz questions..." />}

      {quiz && !result && (
        <div className="space-y-6">
          {quiz.questions?.map((q, i) => (
            <div key={q.id} className="card">
              <div className="flex items-start gap-3 mb-4">
                <span className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">{i + 1}</span>
                <div className="flex-1">
                  <span className="badge-info text-xs mb-2 inline-block">{q.type.replace('_', ' ')}</span>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">{q.question}</p>
                </div>
              </div>

              {q.options && (
                <div className="space-y-2 ml-10">
                  {q.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: opt[0] }))}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        answers[q.id] === opt[0]
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between">
            <button onClick={() => navigate(`/checkpoint/${checkpointId}`)} className="btn-secondary">← Back to Lesson</button>
            <button onClick={submitQuiz} disabled={submitting || answered < total} className="btn-primary flex items-center gap-2">
              {submitting ? <><Spinner size="sm" /> Evaluating...</> : <>Submit Quiz <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className={`card text-center ${result.passed ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {result.passed ? <CheckCircle className="w-10 h-10 text-white" /> : <XCircle className="w-10 h-10 text-white" />}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{result.score?.toFixed(1)}%</h2>
            <p className={`text-lg font-semibold mb-2 ${result.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {result.passed ? '🎉 Passed!' : 'Not passed yet'}
            </p>
            <p className="text-gray-500 text-sm mb-1">{result.correct_answers}/{result.total_questions} correct</p>
            <p className="text-gray-700 dark:text-gray-300">{result.message}</p>
          </div>

          <div className="space-y-3">
            {result.evaluations?.map((ev, i) => (
              <div key={ev.question_id} className={`card ${ev.correct ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-red-200 dark:border-red-800/50'}`}>
                <div className="flex items-start gap-3">
                  {ev.correct ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Q{i + 1}: Your answer: <span className={ev.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{ev.user_answer || '(no answer)'}</span></p>
                    {!ev.correct && <p className="text-sm text-gray-500 mb-1">Correct: <span className="text-emerald-600 dark:text-emerald-400">{ev.correct_answer}</span></p>}
                    <p className="text-xs text-gray-500">{ev.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {result.weak_concepts?.length > 0 && (
            <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Weak Areas Detected</h3>
              <div className="flex flex-wrap gap-2">
                {result.weak_concepts.map(c => <span key={c} className="badge-warning">{c}</span>)}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {result.passed ? (
              <button onClick={() => navigate(-3)} className="btn-success flex items-center gap-2">
                Continue Learning <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => navigate(`/feynman/${checkpointId}`, { state: { weakConcepts: result.weak_concepts } })} className="btn-primary flex items-center gap-2">
                <Zap className="w-4 h-4" /> Feynman Learning
              </button>
            )}
            {!result.passed && (
              <button onClick={() => generateQuiz(true, result.weak_concepts)} className="btn-secondary">Retry Quiz</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
