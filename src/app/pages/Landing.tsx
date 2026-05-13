import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Sparkles,
  FileText,
  Zap,
  ArrowRight,
  Check,
  Brain,
  Layers,
  Clock,
  Lightbulb,
  ScanSearch,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: Brain,
    title: 'Precise Summaries',
    description:
      'Keeps the most important information from your original document with high accuracy.',
    tag: 'High Accuracy',
    color: 'indigo',
  },
  {
    icon: Sparkles,
    title: 'Readable Summaries',
    description:
      'Transforms long or complex documents into clear, natural summaries that are easier to read.',
    tag: 'AI-Powered',
    color: 'violet',
  },
  {
    icon: Layers,
    title: 'Key Insights',
    description:
      'Automatically identifies and extracts the most important ideas and presents them as easy-to-read bullet points.',
    tag: 'Instant',
    color: 'sky',
  },
  {
    icon: Lightbulb,
    title: 'Reading Time Saved',
    description:
      'Track compression, reading time saved, and summary statistics at a glance.',
    tag: 'Metrics',
    color: 'emerald',
  },
  {
    icon: ScanSearch,
    title: 'Smart Context',
    description:
      'Adapts summaries based on your document type for more relevant and accurate results.',
    tag: 'Context-Aware',
    color: 'amber',
  },
  {
    icon: Clock,
    title: 'Summary History',
    description:
      'Save, revisit, and organize your summaries whenever you need them.',
    tag: 'Saved',
    color: 'rose',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Upload or paste your document',
    desc: 'Add a PDF, research paper, report, article, or any long-form content.',
  },
  {
    num: '02',
    title: 'Customize your summary',
    desc: 'Choose summary length, style (bullet or paragraph), and tone to match your needs.',
  },
  {
    num: '03',
    title: 'Get your results',
    desc: 'Receive a clear summary with key insights, reading stats, and export options.',
  },
];


/** Public landing page with hero, features, and CTAs */
export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-[Inter,sans-serif]">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 dark:text-slate-100">
              SummarizeAI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/auth')}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors duration-200"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 shadow-sm"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-violet-400/15 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs mb-8">
            <Sparkles className="w-3 h-3" />
            <span>Built for students, researchers, and professionals.</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white mb-6 leading-tight">
            Summarize anything.{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Instantly.
            </span>
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn PDFs, research papers, reports, and articles into clean, 
            accurate AI-powered summaries in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="group flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200"
            >
              Start summarizing for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              Sign in
            </button>
          </div>

          {/* Checklist */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
            {['PDF & Document Support', 'Smart AI Key Insights', 'Flexible Summary Styles'].map(
              item => (
                <div
                  key={item}
                  className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── App Preview Card ── */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 dark:shadow-black/30 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="flex-1 mx-3 h-5 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {/* Input pane */}
              <div className="p-5 border-r border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Input Document
                </div>
                <div className="space-y-1.5">
                  {[100, 95, 88, 78, 90, 60, 84, 72].map((w, i) => (
                    <div
                      key={i}
                      style={{ width: `${w}%` }}
                      className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full"
                    />
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs">
                    Abstractive
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                    Academic
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                    Medium
                  </div>
                </div>
              </div>
              {/* Output pane */}
              <div className="p-5 bg-slate-50/50 dark:bg-slate-900">
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-500" /> AI Summary
                </div>
                <div className="space-y-1.5">
                  {[94, 100, 82].map((w, i) => (
                    <div
                      key={i}
                      style={{ width: `${w}%` }}
                      className="h-2 bg-indigo-100 dark:bg-indigo-950 rounded-full"
                    />
                  ))}
                  {[70].map((w, i) => (
                    <div
                      key={i}
                      style={{ width: `${w}%` }}
                      className="h-2 bg-indigo-100 dark:bg-indigo-950 rounded-full"
                    />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { l: 'Compression', v: '74%' },
                    { l: 'Time saved', v: '3.2m' },
                    { l: 'Key points', v: '5' },
                  ].map(s => (
                    <div
                      key={s.l}
                      className="rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-2 text-center"
                    >
                      <div className="text-indigo-600 dark:text-indigo-400 text-sm">
                        {s.v}
                      </div>
                      <div className="text-slate-400 text-xs">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── Features ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl text-slate-900 dark:text-white mb-3">
              Everything you need to summarize <span className="text-indigo-600 dark:text-indigo-400 font-bold">SMARTER</span> 
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Turn PDFs, reports, and research papers into clear insights in seconds.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-4 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors duration-200">
                  <f.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-slate-900 dark:text-slate-100 text-base">
                    {f.title}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {f.tag}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 sm:px-6 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl text-slate-900 dark:text-white mb-3">
              How it works?
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              From document to summary in three simple steps:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-5 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-700" />
                )}
                <div className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-indigo-600 text-white text-sm mb-4">
                  {i + 1}
                </div>
                <h3 className="text-slate-900 dark:text-slate-100 mb-2 text-base">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl text-slate-900 dark:text-white mb-4">
            Ready to save hours of reading?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Built for students, researchers, and professionals working with long documents.
          </p>
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200"
          >
            Create free account
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              SummarizeAI
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            AI-powered document summarization for students, researchers, and professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}
