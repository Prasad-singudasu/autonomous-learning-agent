export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return <div className={`border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ${sizes[size]} ${className}`} />
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Spinner size="lg" />
      <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-center p-8">
      {Icon && <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center"><Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" /></div>}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
        {description && <p className="text-gray-500 text-sm max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
      {message}
    </div>
  )
}

export function ProgressBar({ value, max = 100, color = 'violet', showLabel = true, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const colors = { violet: 'bg-violet-500', indigo: 'bg-violet-500', emerald: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-red-500' }
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden ${heights[size]}`}>
        <div className={`${colors[color]} ${heights[size]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <p className="text-xs text-gray-500 mt-1">{pct.toFixed(0)}%</p>}
    </div>
  )
}

export function ScoreBadge({ score }) {
  const color = score >= 70 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-danger'
  return <span className={color}>{score?.toFixed(1)}%</span>
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
