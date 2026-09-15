import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { progressAPI } from '../services/api'
import { LoadingScreen, EmptyState, PageHeader, Spinner } from '../components/ui'
import { Library, ExternalLink, BookOpen, Play, FileText, Code, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Resources() {
  const { checkpointId } = useParams()
  const [resources, setResources] = useState(null)
  const [loading, setLoading] = useState(!!checkpointId)

  useEffect(() => {
    if (!checkpointId) return
    progressAPI.getResources(checkpointId)
      .then(res => setResources(res.data))
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false))
  }, [checkpointId])

  if (loading) return <LoadingScreen />

  if (!checkpointId) return (
    <div className="p-8">
      <PageHeader title="Learning Resources" subtitle="Navigate to a checkpoint to see curated resources" />
      <EmptyState icon={Library} title="Select a checkpoint" description="Open any checkpoint lesson and click 'Resources' to see curated materials" />
    </div>
  )

  const sections = [
    {
      key: 'videos',
      label: 'YouTube Videos',
      icon: Play,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      border: 'border-red-800/50',
      renderItem: (item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-red-700 transition-all group">
          <div className="w-9 h-9 bg-red-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Play className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-sm group-hover:text-red-400 transition-colors">{item.title}</p>
            {item.channel && <p className="text-xs text-gray-500 mt-0.5">📺 {item.channel}</p>}
            {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-red-400 shrink-0 mt-1 transition-colors" />
        </a>
      )
    },
    {
      key: 'documentation',
      label: 'Official Documentation',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-900/20',
      border: 'border-blue-800/50',
      renderItem: (item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-blue-700 transition-all group">
          <div className="w-9 h-9 bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-sm group-hover:text-blue-400 transition-colors">{item.title}</p>
            {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
        </a>
      )
    },
    {
      key: 'books',
      label: 'Books',
      icon: BookOpen,
      color: 'text-purple-400',
      bg: 'bg-purple-900/20',
      border: 'border-purple-800/50',
      renderItem: (item, i) => (
        <a key={i} href={item.url || `https://www.amazon.com/s?k=${encodeURIComponent(item.title)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-purple-700 transition-all group">
          <div className="w-9 h-9 bg-purple-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-sm group-hover:text-purple-400 transition-colors">{item.title}</p>
            {item.author && <p className="text-xs text-gray-500 mt-0.5">✍️ {item.author}</p>}
            {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 shrink-0 mt-1 transition-colors" />
        </a>
      )
    },
    {
      key: 'articles',
      label: 'Articles & Tutorials',
      icon: FileText,
      color: 'text-green-400',
      bg: 'bg-green-900/20',
      border: 'border-green-800/50',
      renderItem: (item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-green-700 transition-all group">
          <div className="w-9 h-9 bg-green-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-sm group-hover:text-green-400 transition-colors">{item.title}</p>
            {item.source && <p className="text-xs text-gray-500 mt-0.5">🌐 {item.source}</p>}
            {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-green-400 shrink-0 mt-1 transition-colors" />
        </a>
      )
    },
    {
      key: 'practice_sites',
      label: 'Practice Sites',
      icon: Code,
      color: 'text-yellow-400',
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-800/50',
      renderItem: (item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-gray-800 hover:bg-gray-750 rounded-xl border border-gray-700 hover:border-yellow-700 transition-all group">
          <div className="w-9 h-9 bg-yellow-900/40 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <Code className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-200 text-sm group-hover:text-yellow-400 transition-colors">{item.title}</p>
            {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-yellow-400 shrink-0 mt-1 transition-colors" />
        </a>
      )
    },
    {
      key: 'projects',
      label: 'Project Ideas',
      icon: Wrench,
      color: 'text-orange-400',
      bg: 'bg-orange-900/20',
      border: 'border-orange-800/50',
      renderItem: (item, i) => (
        <div key={i} className="p-3 bg-gray-800 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-gray-200 text-sm">{item.title}</p>
            {item.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                item.difficulty === 'beginner'
                  ? 'bg-green-900/40 text-green-400 border-green-800'
                  : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
              }`}>{item.difficulty}</span>
            )}
          </div>
          {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
        </div>
      )
    },
  ]

  return (
    <div className="p-8">
      <PageHeader
        title={resources?.checkpoint_title ? `Resources: ${resources.checkpoint_title}` : 'Learning Resources'}
        subtitle="Real curated materials — click any link to open"
      />

      {!resources ? (
        <EmptyState icon={Library} title="No resources found" description="Try navigating from a checkpoint" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sections.map(({ key, label, icon: Icon, color, bg, border, renderItem }) => {
            const items = resources[key] || []
            if (!items.length) return null
            return (
              <div key={key} className={`card border ${border}`}>
                <div className={`flex items-center gap-2 mb-4 pb-3 border-b border-gray-800`}>
                  <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-white">{label}</h3>
                  <span className="ml-auto text-xs text-gray-500">{items.length} resources</span>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => renderItem(item, i))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
