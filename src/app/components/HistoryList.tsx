import { useState } from 'react';
import {
  History,
  Search,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  BarChart2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { SummaryRecord, SummarizationMethod, SummarizationMode } from '../types/summary';
import { toast } from 'sonner';

interface HistoryListProps {
  records: SummaryRecord[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onLoadRecord: (record: SummaryRecord) => void;
}

const METHOD_COLORS: Record<SummarizationMethod, string> = {
  extractive:
    'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
  abstractive:
    'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
};

const DOMAIN_ICONS: Record<string, string> = {
  general: '📄',
  academic: '🎓',
  news: '📰',
  technical: '⚙️',
  legal: '⚖️',
  medical: '🩺',
};

const MODE_LABELS: Record<SummarizationMode, string> = {
  precise_summary: 'Precise Summary',
  readable_summary: 'Readable Summary',
  quick_digest: 'Quick Digest',
};

/** History tab — grid of saved summary cards with search, filter, expand */
export function HistoryList({
  records,
  onDelete,
  onToggleFavorite,
  onLoadRecord,
}: HistoryListProps) {
  const [query, setQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = records.filter(r => {
    const matchesQuery =
      !query ||
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.summary.toLowerCase().includes(query.toLowerCase());
    const matchesFav = !filterFavorites || r.isFavorited;
    return matchesQuery && matchesFav;
  });

  // Favorites first, then by newest
  const sorted = [...filtered].sort((a, b) => {
    if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  async function handleCopy(summary: string) {
    await navigator.clipboard.writeText(summary);
    toast.success('Summary copied to clipboard');
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-80 gap-5 text-center px-8 py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <History className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <div>
          <p className="text-slate-700 dark:text-slate-300 mb-1">
            No summaries yet
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Save a summary from the Summarize tab and it will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search summaries…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all duration-200"
          />
        </div>
        <button
          onClick={() => setFilterFavorites(v => !v)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-200
            ${filterFavorites
              ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
        >
          <Star className={`w-4 h-4 ${filterFavorites ? 'fill-current' : ''}`} />
          Favourites
        </button>
      </div>

      {/* ── Count ── */}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Showing {sorted.length} of {records.length} summaries
      </p>

      {/* ── Empty filtered state ── */}
      {sorted.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No summaries match your search.
          </p>
        </div>
      )}

      {/* ── Cards ── */}
      <div className="grid grid-cols-1 gap-3">
        {sorted.map(record => {
          const isExpanded = expandedId === record.id;
          return (
            <div
              key={record.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
            >
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 capitalize">
                        {record.mode ? MODE_LABELS[record.mode] : 'Precise Summary'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          METHOD_COLORS[record.method]
                        } capitalize`}
                      >
                        {record.method}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {DOMAIN_ICONS[record.domain]} {record.domain}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                        {record.length}
                      </span>
                      {record.isFavorited && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      )}
                    </div>
                    <h3 className="text-sm text-slate-900 dark:text-slate-100 truncate">
                      {record.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                      {record.summary}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleFavorite(record.id)}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${
                          record.isFavorited
                            ? 'text-amber-400 hover:text-amber-500'
                            : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                        }`}
                        title="Toggle favourite"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            record.isFavorited ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleCopy(record.summary)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                        title="Copy summary"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(record.id)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(record.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Stats mini row */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                    {record.stats.compressionRatio}% compressed
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    {record.stats.originalWordCount.toLocaleString()} → {record.stats.summaryWordCount.toLocaleString()} words
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => {
                        onLoadRecord(record);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Re-open
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Expand
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-4">
                  {/* Full summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Full Summary
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {record.summary}
                    </p>
                  </div>

                  {/* Key points */}
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                      Key Points
                    </p>
                    <ul className="space-y-1.5">
                      {record.keyPoints.map((kp, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {kp}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
