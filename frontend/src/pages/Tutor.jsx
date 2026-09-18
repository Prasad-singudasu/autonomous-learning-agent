import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { progressAPI } from '../services/api'
import { Spinner } from '../components/ui'
import { Bot, User, BookOpen, Send, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

const WELCOME = { role: 'assistant', content: "Hi! I'm your AI tutor. Ask me anything about what you're learning — I'll explain concepts, give examples, and help you understand. What would you like to know?" }

const STORAGE_KEY = (checkpointId, goalId) => `tutor_history_${goalId || 'global'}_${checkpointId || 'general'}`

const mdComponents = {
  h1: ({children}) => <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2 first:mt-0">{children}</h1>,
  h2: ({children}) => <h2 className="text-base font-bold text-violet-700 dark:text-violet-300 mt-3 mb-1.5 first:mt-0">{children}</h2>,
  h3: ({children}) => <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">{children}</h3>,
  p: ({children}) => <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({children}) => <ul className="list-disc list-outside ml-4 space-y-1 mb-2 text-gray-700 dark:text-gray-200">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal list-outside ml-4 space-y-1 mb-2 text-gray-700 dark:text-gray-200">{children}</ol>,
  li: ({children}) => <li className="text-gray-700 dark:text-gray-200 leading-relaxed">{children}</li>,
  strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
  em: ({children}) => <em className="italic text-gray-600 dark:text-gray-300">{children}</em>,
  blockquote: ({children}) => <blockquote className="border-l-4 border-indigo-400 pl-3 my-2 text-gray-500 dark:text-gray-400 italic">{children}</blockquote>,
  code: ({inline, className, children}) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1] || ''
    return inline
      ? <code className="bg-gray-100 dark:bg-gray-700 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
      : (
        <div className="my-2 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {lang && <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1.5 font-mono border-b border-gray-200 dark:border-gray-700">{lang}</div>}
          <pre className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 text-xs font-mono overflow-x-auto">
            <code>{children}</code>
          </pre>
        </div>
      )
  },
  hr: () => <hr className="border-gray-200 dark:border-gray-700 my-3" />,
  a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 underline hover:no-underline">{children}</a>,
}

export default function Tutor() {
  const [searchParams] = useSearchParams()
  const checkpointId = searchParams.get('checkpoint')
  const goalId = searchParams.get('goal')

  const storageKey = STORAGE_KEY(checkpointId, goalId)

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : [WELCOME]
    } catch { return [WELCOME] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)) } catch {}
  }, [messages, storageKey])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    textareaRef.current && (textareaRef.current.style.height = 'auto')

    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const history = updatedMessages.slice(1).map(m => ({ role: m.role, content: m.content }))
      const res = await progressAPI.tutorChat({
        message: text,
        checkpoint_id: checkpointId || undefined,
        goal_id: goalId || undefined,
        history,
      })
      setMessages(p => [...p, { role: 'assistant', content: res.data.response, used_rag: res.data.used_rag }])
    } catch {
      toast.error('Failed to get response')
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const clearChat = () => {
    setMessages([WELCOME])
    setInput('')
    try { localStorage.removeItem(storageKey) } catch {}
  }

  const suggestions = ["Explain this concept simply", "Give me a real-world example", "Show me a code example", "What are common mistakes?", "Explain like I'm a beginner"]

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 sm:px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-violet-800 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900 dark:text-white text-sm">AI Tutor</h1>
          <p className="text-gray-400 text-xs">Ask anything · Shift+Enter for new line</p>
        </div>
        <div className="flex items-center gap-2">
          {checkpointId && (
            <span className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-2 py-1">
              <BookOpen className="w-3 h-3" /> Context-aware
            </span>
          )}
          {messages.length > 1 && (
            <button onClick={clearChat} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Clear chat">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4 bg-slate-50 dark:bg-gray-950">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-violet-600' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
              {msg.role === 'user'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3 sm:px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-tr-sm shadow-sm'
                : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {msg.content}
                  </ReactMarkdown>
                  {msg.used_rag && (
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> From your uploaded materials
                    </p>
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
              <Spinner size="sm" /><span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-3 sm:px-5 pb-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button key={s} onClick={() => setInput(s)} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 px-3 py-1.5 rounded-lg transition-all w-full sm:w-auto text-left">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            className="input flex-1 min-w-0 resize-none overflow-hidden leading-relaxed text-sm"
            placeholder="Ask anything..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{ minHeight: '42px', maxHeight: '160px' }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn-primary px-3 sm:px-4 py-2.5 flex items-center gap-1.5 shrink-0 text-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
