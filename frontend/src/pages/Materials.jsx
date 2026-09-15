import { useState, useEffect, useRef } from 'react'
import { materialsAPI } from '../services/api'
import { LoadingScreen, EmptyState, Spinner, PageHeader } from '../components/ui'
import { Upload, FileText, CheckCircle, XCircle, Clock, Bot, User, Send, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

const mdComponents = {
  h1: ({children}) => <h1 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
  h2: ({children}) => <h2 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-2 mb-1 first:mt-0">{children}</h2>,
  h3: ({children}) => <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-1">{children}</h3>,
  p: ({children}) => <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
  ul: ({children}) => <ul className="list-disc list-outside ml-4 space-y-1 mb-2 text-gray-700 dark:text-gray-200">{children}</ul>,
  ol: ({children}) => <ol className="list-decimal list-outside ml-4 space-y-1 mb-2 text-gray-700 dark:text-gray-200">{children}</ol>,
  li: ({children}) => <li className="text-gray-700 dark:text-gray-200 leading-relaxed">{children}</li>,
  strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
  code: ({inline, className, children}) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1] || ''
    return inline
      ? <code className="bg-gray-200 dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
      : (
        <div className="my-2">
          {lang && <div className="bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-t-lg font-mono">{lang}</div>}
          <pre className={`bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-3 ${lang ? 'rounded-b-lg' : 'rounded-lg'} text-xs font-mono overflow-x-auto`}>
            <code>{children}</code>
          </pre>
        </div>
      )
  },
}

export default function Materials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [input, setInput] = useState('')
  const [asking, setAsking] = useState(false)
  const fileRef = useRef()
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => { loadMaterials() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const loadMaterials = () => {
    materialsAPI.getAll()
      .then(res => setMaterials(res.data))
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false))
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await materialsAPI.upload(formData)
      toast.success('Document uploaded and processed!')
      loadMaterials()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const sendQuestion = async () => {
    const text = input.trim()
    if (!text || asking) return
    setInput('')
    textareaRef.current && (textareaRef.current.style.height = 'auto')

    const userMsg = { role: 'user', content: text }
    setChatMessages(p => [...p, userMsg])
    setAsking(true)

    try {
      const res = await materialsAPI.ask(text)
      const answer = res.data.found
        ? res.data.answer
        : 'No relevant content found in your documents for this question.'
      setChatMessages(p => [...p, { role: 'assistant', content: answer, found: res.data.found }])
    } catch {
      toast.error('Failed to get answer')
      setChatMessages(p => [...p, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', found: false }])
    } finally { setAsking(false) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion() }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const statusIcon = (status) => {
    if (status === 'ready') return <CheckCircle className="w-4 h-4 text-emerald-500" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
  }

  const hasReady = materials.some(m => m.status === 'ready')
  if (loading) return <LoadingScreen />

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Learning Materials" subtitle="Upload PDFs and ask questions directly from your documents" />

      {/* Upload */}
      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upload Document</h3>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-600 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-gray-500">Processing document...</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Click to upload PDF</p>
              <p className="text-gray-500 text-sm mt-1">Max 50MB • PDF only</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      </div>

      {/* RAG Chat */}
      {hasReady && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Ask Your Document</h3>
            </div>
            {chatMessages.length > 0 && (
              <button onClick={() => setChatMessages([])} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chat history */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {msg.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-white" />
                      : <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-tl-sm'}`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
                    <Spinner size="sm" /><span className="text-gray-500 text-xs">Searching document...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {chatMessages.length === 0 && (
            <p className="text-gray-500 text-sm mb-4">Ask any question — the AI will answer using your uploaded PDF.</p>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              className="input flex-1 resize-none overflow-hidden leading-relaxed"
              placeholder="Ask a question about your document... (Shift+Enter for new line)"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={asking}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button onClick={sendQuestion} disabled={asking || !input.trim()} className="btn-primary px-4 py-2.5 flex items-center gap-2 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <EmptyState icon={FileText} title="No materials uploaded" description="Upload a PDF to start asking questions from your documents" />
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wide">Uploaded Documents</h3>
          {materials.map(m => (
            <div key={m.id} className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{m.original_name}</p>
                <p className="text-xs text-gray-500">{(m.file_size / 1024).toFixed(0)} KB • {m.chunk_count} chunks • {new Date(m.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusIcon(m.status)}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : m.status === 'failed' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
