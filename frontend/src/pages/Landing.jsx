import { Link } from 'react-router-dom'
import { Brain, Zap, Target, BookOpen, BarChart3, Shield, ArrowRight } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI-Generated Roadmaps', desc: 'Personalized learning paths from beginner to advanced' },
  { icon: Target, title: 'Mastery-Based Progress', desc: 'Unlock next checkpoint only after demonstrating understanding' },
  { icon: Zap, title: 'Feynman Technique', desc: 'Simplify difficult concepts through proven teaching methods' },
  { icon: BookOpen, title: 'Interactive Lessons', desc: 'Rich lessons with examples, analogies, and code samples' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Track your learning journey with detailed insights' },
  { icon: Shield, title: 'Weak Area Detection', desc: 'AI identifies and targets your specific knowledge gaps' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">LearnFlow Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-1.5 text-indigo-600 dark:text-indigo-400 text-sm mb-8">
          <Zap className="w-3.5 h-3.5" />
          ✨ Learn Smarter. Master Faster.
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
          Your Personal<br />
          <span className="text-indigo-600 dark:text-indigo-400">AI Learning Agent</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Set your goal. Learn step-by-step. Practice, improve, and master every concept.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base py-3 px-8">
            Start Learning Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base py-3 px-8">Sign In</Link>
        </div>

        {/* Flow */}
        <div className="mt-20 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
          {['Enter Topic', 'AI Generates Roadmap', 'Learn Checkpoint', 'Take Quiz', 'Detect Weaknesses', 'Feynman Teaching', 'Verify Mastery', 'Unlock Next'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 shadow-sm">{step}</span>
              {i < 7 && <ArrowRight className="w-3 h-3 text-gray-400 dark:text-gray-700" />}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Everything you need to master any topic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to learn smarter?</h2>
          <p className="text-gray-500 mb-8">Join thousands of learners mastering new skills with AI guidance.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base py-3 px-8">
            Start Your Journey <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
