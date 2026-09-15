import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { learningAPI } from '../services/api'
import { LoadingScreen, Spinner } from '../components/ui'
import LessonContent from '../components/LessonContent'
import {
  BookOpen, Zap, ChevronRight, Library,
  CheckCircle, Clock, RotateCcw, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Lesson() {
  const { checkpointId } = useParams()
  const navigate = useNavigate()
  const [checkpoint, setCheckpoint] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadCheckpoint() }, [checkpointId])

  const loadCheckpoint = async () => {
    try {
      const res = await learningAPI.getCheckpoint(checkpointId)
      setCheckpoint(res.data)
      if (res.data.has_lesson) {
        const lRes = await learningAPI.generateLesson(checkpointId)
        setLesson(lRes.data)
      }
    } catch {
      toast.error('Failed to load checkpoint')
    } finally {
      setLoading(false)
    }
  }

  const generateLesson = async () => {
    setGenerating(true)
    try {
      const res = await learningAPI.generateLesson(checkpointId)
      setLesson(res.data)
      toast.success('Lesson generated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate lesson')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingScreen message="Loading lesson..." />

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Checkpoint</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">{checkpoint?.title}</span>
        </div>

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h1 className="text-3xl font-bold text-white leading-tight">{checkpoint?.title}</h1>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              {checkpoint?.is_completed && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-900/40 border border-emerald-700 text-emerald-400 rounded-full text-xs font-medium">
                  <CheckCircle className="w-3 h-3" /> Completed
                </span>
              )}
              {checkpoint?.attempts > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-900/40 border border-indigo-700 text-indigo-400 rounded-full text-xs font-medium">
                  <RotateCcw className="w-3 h-3" /> {checkpoint.attempts} attempt{checkpoint.attempts > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {checkpoint?.description && (
            <p className="text-gray-400 text-sm leading-relaxed">{checkpoint.description}</p>
          )}

          {/* Reading time estimate */}
          {lesson && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>~{Math.max(2, Math.ceil((lesson.content?.length || 0) / 1000))} min read</span>
            </div>
          )}
        </div>

        {/* ── No lesson yet ── */}
        {!lesson ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-indigo-900/30 border border-indigo-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Ready to learn?</h2>
            <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
              The AI will generate a detailed lesson covering explanation, examples, analogies, and key points.
            </p>
            <button
              onClick={generateLesson}
              disabled={generating}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3"
            >
              {generating
                ? <><Spinner size="sm" /> Generating lesson...</>
                : <><Zap className="w-4 h-4" /> Generate Lesson</>
              }
            </button>
            {generating && (
              <p className="text-gray-500 text-xs mt-4 animate-pulse">
                This may take 15–30 seconds...
              </p>
            )}
          </div>
        ) : (
          <>
            {/* ── Lesson Content ── */}
            <LessonContent lesson={lesson} />

            {/* ── Divider ── */}
            <div className="border-t border-gray-800 my-8" />

            {/* ── Action Bar ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-white font-semibold text-sm">Ready to test your knowledge?</p>
                  <p className="text-gray-500 text-xs mt-0.5">You need 70% to unlock the next checkpoint</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    ← Roadmap
                  </button>
                  <button
                    onClick={() => navigate(`/tutor?checkpoint=${checkpointId}`)}
                    className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Ask Tutor
                  </button>
                  <button
                    onClick={() => navigate(`/resources/${checkpointId}`)}
                    className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
                  >
                    <Library className="w-3.5 h-3.5" /> Resources
                  </button>
                  <button
                    onClick={() => navigate(`/quiz/${checkpointId}`)}
                    className="btn-primary text-sm py-2 px-5 flex items-center gap-2"
                  >
                    Take Quiz <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
