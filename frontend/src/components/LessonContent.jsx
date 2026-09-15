import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Lightbulb, Code2, AlertTriangle, CheckCircle2,
  BookOpen, Zap, ChevronDown, ChevronUp, Globe
} from 'lucide-react'

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor, bgColor, borderColor, title, children }) {
  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 mb-5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className={`font-semibold text-sm uppercase tracking-wide ${iconColor}`}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ─── Render inline markdown: **bold**, `code`, plain text ───────────────────
function InlineText({ text }) {
  // Split on **bold** and `code` tokens
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">{part.slice(1, -1)}</code>
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// ─── Explanation renderer: full structured learning format ───────────────────
function ExplanationContent({ text }) {
  if (!text) return null

  // Tokenise every line into a typed token
  const tokens = text.split('\n').map(raw => {
    const line = raw.trim()
    if (!line) return { type: 'blank' }

    // Headings: ##, ###, ####
    const h = line.match(/^(#{2,4})\s+(.+)/)
    if (h) return { type: 'heading', level: h[1].length, text: h[2].replace(/\*\*/g, '') }

    // **Bold standalone line** (acts as subheading)
    if (/^\*\*[^*]+\*\*:?$/.test(line))
      return { type: 'heading', level: 4, text: line.replace(/\*\*/g, '').replace(/:$/, '') }

    // ⚠️ Warning / Note lines
    if (/^(⚠️|🚨|❗|>\s*\*\*(Note|Warning|Important))/i.test(line))
      return { type: 'warning', text: line.replace(/^>\s*/, '').replace(/^(⚠️|🚨|❗)\s*/, '') }

    // 💡 Tip / highlight lines
    if (/^(💡|✅|📌)/.test(line))
      return { type: 'tip', text: line.replace(/^(💡|✅|📌)\s*/, '') }

    // Numbered list: 1. item
    const num = line.match(/^(\d+)\.\s+(.+)/)
    if (num) return { type: 'numbered', n: parseInt(num[1]), text: num[2] }

    // Bullet: - item or • item
    if (/^[-•*]\s+/.test(line))
      return { type: 'bullet', text: line.replace(/^[-•*]\s+/, '') }

    // Blockquote
    if (line.startsWith('> '))
      return { type: 'quote', text: line.slice(2) }

    // Plain paragraph
    return { type: 'para', text: line }
  })

  // Group consecutive same-type list tokens into list blocks
  const blocks = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (t.type === 'blank') { i++; continue }

    if (t.type === 'bullet') {
      const items = []
      while (i < tokens.length && tokens[i].type === 'bullet') items.push(tokens[i++].text)
      blocks.push({ type: 'bullet-list', items })
    } else if (t.type === 'numbered') {
      const items = []
      while (i < tokens.length && tokens[i].type === 'numbered') items.push(tokens[i++].text)
      blocks.push({ type: 'numbered-list', items })
    } else {
      blocks.push(t)
      i++
    }
  }

  if (!blocks.length) return <p className="text-gray-300 text-sm leading-relaxed">{text}</p>

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        switch (block.type) {

          case 'heading':
            return block.level <= 3 ? (
              <div key={idx} className="pt-2 pb-1 border-b border-blue-800/30">
                <h4 className="text-blue-300 font-bold text-base flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-400 rounded-full shrink-0" />
                  <InlineText text={block.text} />
                </h4>
              </div>
            ) : (
              <h5 key={idx} className="text-blue-200 font-semibold text-sm flex items-center gap-2 mt-1">
                <span className="w-1 h-4 bg-blue-500/60 rounded-full shrink-0" />
                <InlineText text={block.text} />
              </h5>
            )

          case 'para':
            return (
              <p key={idx} className="text-gray-300 text-sm leading-relaxed">
                <InlineText text={block.text} />
              </p>
            )

          case 'bullet-list':
            return (
              <ul key={idx} className="space-y-2 ml-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-[7px] shrink-0" />
                    <span className="leading-relaxed"><InlineText text={item} /></span>
                  </li>
                ))}
              </ul>
            )

          case 'numbered-list':
            return (
              <ol key={idx} className="space-y-2 ml-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 bg-blue-600/30 border border-blue-700/60 rounded-md flex items-center justify-center text-xs font-bold text-blue-300 shrink-0 mt-0.5">
                      {j + 1}
                    </span>
                    <span className="leading-relaxed"><InlineText text={item} /></span>
                  </li>
                ))}
              </ol>
            )

          case 'warning':
            return (
              <div key={idx} className="flex items-start gap-2.5 bg-amber-950/30 border border-amber-700/40 rounded-lg px-3.5 py-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-200 text-sm leading-relaxed"><InlineText text={block.text} /></p>
              </div>
            )

          case 'tip':
            return (
              <div key={idx} className="flex items-start gap-2.5 bg-emerald-950/30 border border-emerald-700/40 rounded-lg px-3.5 py-2.5">
                <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-200 text-sm leading-relaxed"><InlineText text={block.text} /></p>
              </div>
            )

          case 'quote':
            return (
              <blockquote key={idx} className="border-l-4 border-blue-500/60 pl-4 py-1">
                <p className="text-blue-200 text-sm leading-relaxed italic"><InlineText text={block.text} /></p>
              </blockquote>
            )

          default: return null
        }
      })}
    </div>
  )
}

// ─── Code block with copy button ────────────────────────────────────────────
function CodeBlock({ code, language = '' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 mb-3">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          {language && <span className="text-xs text-gray-500 ml-2 font-mono">{language}</span>}
        </div>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {copied ? <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> Copied</> : 'Copy'}
        </button>
      </div>
      <pre className="bg-gray-900 p-4 overflow-x-auto">
        <code className="text-sm font-mono text-gray-200 leading-relaxed">{code}</code>
      </pre>
    </div>
  )
}

// ─── Collapsible example card ────────────────────────────────────────────────
function ExampleCard({ example, index }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-gray-200">{example.title || `Example ${index + 1}`}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 bg-gray-900/50">
          {example.code && <CodeBlock code={example.code} />}
          {example.explanation && (
            <p className="text-gray-400 text-sm leading-relaxed mt-2">{example.explanation}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Parse the markdown content string into structured sections ──────────────
function parseContent(content) {
  if (!content) return {}

  const sections = {}

  // Extract ## title
  const titleMatch = content.match(/^##\s+(.+)/m)
  if (titleMatch) sections.title = titleMatch[1].trim()

  // Extract ### Explanation
  const explanationMatch = content.match(/###\s+Explanation\s*\n([\s\S]*?)(?=\n###|\n##|$)/)
  if (explanationMatch) sections.explanation = explanationMatch[1].trim()

  // Extract ### Real-World Analogy (blockquote)
  const analogyMatch = content.match(/###\s+Real-World Analogy\s*\n>\s*(.+)/m)
  if (analogyMatch) sections.analogy = analogyMatch[1].trim()

  // Extract ### Examples block
  const examplesMatch = content.match(/###\s+Examples\s*\n([\s\S]*?)(?=\n###|\n##|$)/)
  if (examplesMatch) sections.examplesRaw = examplesMatch[1].trim()

  // Extract ### Important Points list
  const importantMatch = content.match(/###\s+Important Points\s*\n([\s\S]*?)(?=\n###|\n##|$)/)
  if (importantMatch) {
    sections.importantPoints = importantMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim())
  }

  // Extract ### Common Mistakes list
  const mistakesMatch = content.match(/###\s+Common Mistakes\s*\n([\s\S]*?)(?=\n###|\n##|$)/)
  if (mistakesMatch) {
    sections.commonMistakes = mistakesMatch[1]
      .split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*⚠️?\s*/, '').trim())
  }

  // Fallback: if none of the above matched, treat entire content as explanation
  if (!sections.explanation && !sections.importantPoints) {
    sections.explanation = content
  }

  return sections
}

// ─── Extract description for a concept from lesson text ────────────────────
function extractConceptDescription(concept, lessonText) {
  if (!lessonText) return null
  const keyword = concept.replace(/[()]/g, '').toLowerCase()
  const lines = lessonText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(keyword)) {
      const snippet = lines
        .slice(i, i + 5)
        .map(l => l.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^[-•*#>]+\s*/, '')
        .replace(/\*\*/g, '')
      if (snippet.length > 20) return snippet
    }
  }
  return null
}

// ─── Clickable Key Concepts panel with inline description ───────────────────
function KeyConceptsPanel({ concepts, lessonContent }) {
  const [active, setActive] = useState(null)
  const description = active !== null
    ? extractConceptDescription(concepts[active], lessonContent)
    : null

  return (
    <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-indigo-300 uppercase tracking-wide">Key Concepts</span>
        <span className="text-xs text-indigo-500 ml-1">— click any to learn more</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {concepts.map((c, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 flex items-center gap-1.5
              ${active === i
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-900/40'
                : 'bg-indigo-900/60 border-indigo-700 text-indigo-300 hover:bg-indigo-800/60 hover:border-indigo-500'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active === i ? 'bg-white' : 'bg-indigo-400'}`} />
            {c}
            {active === i
              ? <ChevronUp className="w-3 h-3 ml-0.5" />
              : <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />}
          </button>
        ))}
      </div>

      {active !== null && (
        <div className="mt-4 rounded-xl border border-indigo-700/50 bg-indigo-900/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-indigo-300" />
              <span className="text-indigo-200 font-semibold text-sm">{concepts[active]}</span>
            </div>
            <button
              onClick={() => setActive(null)}
              className="text-indigo-500 hover:text-indigo-300 text-xs transition-colors"
            >
              ✕ close
            </button>
          </div>
          {description ? (
            <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
          ) : (
            <p className="text-indigo-400 text-sm italic">
              This concept is covered in the explanation below. Look for{' '}
              <strong className="text-indigo-300">{concepts[active]}</strong> in the lesson content.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main LessonContent component ───────────────────────────────────────────
export default function LessonContent({ lesson }) {
  const { content, key_concepts, examples } = lesson
  const parsed = parseContent(content)

  // Merge examples from DB (structured) with any parsed from content
  const dbExamples = Array.isArray(examples) && examples.length > 0 ? examples : null

  return (
    <div className="space-y-1">

      {/* ── Key Concepts chips ── */}
      {key_concepts?.length > 0 && (
        <KeyConceptsPanel concepts={key_concepts} lessonContent={content} />
      )}

      {/* ── Summary / first paragraph ── */}
      {parsed.title && !parsed.explanation && (
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 mb-5">
          <p className="text-gray-300 leading-relaxed text-sm">{parsed.title}</p>
        </div>
      )}

      {/* ── Explanation ── */}
      {parsed.explanation && (
        <Section
          icon={BookOpen}
          iconColor="text-blue-400"
          bgColor="bg-blue-950/20"
          borderColor="border-blue-800/40"
          title="Explanation"
        >
          {parsed.explanation.includes('```') ? (
            <div className="prose-lesson">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-gray-300 leading-relaxed text-sm mb-3">{children}</p>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  code: ({ inline, children }) => inline
                    ? <code className="bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                    : <CodeBlock code={String(children)} />,
                  ul: ({ children }) => <ul className="space-y-1.5 mb-3">{children}</ul>,
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 shrink-0" />
                      <span>{children}</span>
                    </li>
                  ),
                }}
              >
                {parsed.explanation}
              </ReactMarkdown>
            </div>
          ) : (
            <ExplanationContent text={parsed.explanation} />
          )}
        </Section>
      )}

      {/* ── Real-World Analogy ── */}
      {parsed.analogy && (
        <Section
          icon={Globe}
          iconColor="text-purple-400"
          bgColor="bg-purple-950/20"
          borderColor="border-purple-800/40"
          title="Real-World Analogy"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl mt-0.5">💡</div>
            <p className="text-purple-200 text-sm leading-relaxed italic">{parsed.analogy}</p>
          </div>
        </Section>
      )}

      {/* ── Code Examples ── */}
      {(dbExamples || parsed.examplesRaw) && (
        <Section
          icon={Code2}
          iconColor="text-emerald-400"
          bgColor="bg-emerald-950/20"
          borderColor="border-emerald-800/40"
          title="Code Examples"
        >
          {dbExamples ? (
            dbExamples.map((ex, i) => <ExampleCard key={i} example={ex} index={i} />)
          ) : (
            // Fallback: render raw examples markdown
            <div className="prose-lesson">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="text-gray-300 text-sm mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  code: ({ inline, children }) => inline
                    ? <code className="bg-gray-800 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                    : <CodeBlock code={String(children)} />,
                }}
              >
                {parsed.examplesRaw}
              </ReactMarkdown>
            </div>
          )}
        </Section>
      )}

      {/* ── Important Points ── */}
      {parsed.importantPoints?.length > 0 && (
        <Section
          icon={CheckCircle2}
          iconColor="text-yellow-400"
          bgColor="bg-yellow-950/20"
          borderColor="border-yellow-800/40"
          title="Important Points"
        >
          <ul className="space-y-2">
            {parsed.importantPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 bg-yellow-600/30 border border-yellow-700 rounded-full flex items-center justify-center text-xs font-bold text-yellow-400 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-300 text-sm leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Common Mistakes ── */}
      {parsed.commonMistakes?.length > 0 && (
        <Section
          icon={AlertTriangle}
          iconColor="text-red-400"
          bgColor="bg-red-950/20"
          borderColor="border-red-800/40"
          title="Common Mistakes to Avoid"
        >
          <ul className="space-y-2">
            {parsed.commonMistakes.map((mistake, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-red-400 text-base shrink-0 mt-0.5">⚠️</span>
                <span className="text-gray-300 text-sm leading-relaxed">{mistake}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Fallback: render raw content if nothing parsed ── */}
      {!parsed.explanation && !parsed.importantPoints && content && (
        <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-semibold text-indigo-300 mt-4 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1">{children}</h3>,
              p: ({ children }) => <p className="text-gray-300 leading-relaxed text-sm mb-3">{children}</p>,
              code: ({ inline, children }) => inline
                ? <code className="bg-gray-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                : <CodeBlock code={String(children)} />,
              ul: ({ children }) => <ul className="space-y-1.5 mb-3">{children}</ul>,
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 shrink-0" />
                  <span>{children}</span>
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500 pl-4 italic text-purple-200 my-3 text-sm">{children}</blockquote>
              ),
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
