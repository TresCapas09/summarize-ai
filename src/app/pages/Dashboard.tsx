import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AppHeader } from '../components/AppHeader';
import { SummaryInput } from '../components/SummaryInput';
import { SummaryResult } from '../components/SummaryResult';
import { HistoryList } from '../components/HistoryList';
import { RecentSidebar } from '../components/RecentSidebar';
import {
  summarizeWithMode,
  generateTitle,
} from '../lib/summarizationEngine';
import { summarizeWithAI } from '../lib/aiService';
import { generateHash } from '../lib/hashUtils';
import type {
  SummarizationMethod,
  SummarizationMode,
  OutputFormat,
  SummaryDepth,
  SummaryLength,
  DocumentDomain,
  SummarizationResult,
  SummaryRecord,
} from '../types/summary';
import type { UserStats } from '../types/profile';
import type { User } from '../types/auth';

type DashView = 'summarize' | 'history';

const PROCESSING_STAGES = [
  'Tokenizing document…',
  'Calculating term frequencies…',
  'Scoring sentences…',
  'Applying NLP algorithm…',
  'Building summary…',
];

/** Map a Supabase row (snake_case) back to the app's SummaryRecord (camelCase) */
function rowToRecord(row: Record<string, unknown>): SummaryRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    originalText: row.original_text as string,
    summary: row.summary as string,
    keyPoints: (row.key_points as string[]) ?? [],
    method: row.method as SummarizationMethod,
    mode: row.mode as SummarizationMode | undefined,
    format: row.format as OutputFormat | undefined,
    depth: row.depth as SummaryDepth | undefined,
    length: row.length as SummaryLength,
    domain: row.domain as DocumentDomain,
    stats: row.stats as SummaryRecord['stats'],
    createdAt: row.created_at as string,
    isFavorited: row.is_favorited as boolean,
    contentHash: row.content_hash as string | undefined,
  };
}

/** Main application dashboard — Summarize and History views */
export function Dashboard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<DashView>('summarize');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [result, setResult] = useState<SummarizationResult | null>(null);
  const [currentMode, setCurrentMode] = useState<SummarizationMode>('fact_checker');
  const [isSaved, setIsSaved] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SummaryRecord | null>(null);
  const [history, setHistory] = useState<SummaryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentHash, setCurrentHash] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Load history from Supabase
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load history', { description: error.message });
      } else {
        setHistory((data ?? []).map(rowToRecord));
      }
      setHistoryLoading(false);
    };

    loadHistory();
  }, [user]);

  /** Calculate user statistics based on history */
  const userStats = useMemo<UserStats>(() => {
    const stats: UserStats = {
      summariesGenerated: history.length,
      totalTimeSaved: 0,
      totalWordsProcessed: 0,
      averageCompression: 0,
    };

    if (history.length === 0) return stats;

    let totalCompression = 0;

    history.forEach(record => {
      stats.totalWordsProcessed += record.stats.originalWordCount;
      stats.totalTimeSaved += (record.stats.originalReadTime - record.stats.summaryReadTime);
      totalCompression += record.stats.compressionRatio;
    });

    // Convert totalTimeSaved to minutes for the interface
    stats.totalTimeSaved = Math.round(stats.totalTimeSaved);
    stats.averageCompression = Math.round(totalCompression / history.length);

    return stats;
  }, [history]);

  const handleSummarize = useCallback(
    async (
      text: string,
      mode: SummarizationMode,
      depth: SummaryDepth,
      format: OutputFormat,
      domain: DocumentDomain,
      images?: string[]
    ) => {
      setIsProcessing(true);
      setResult(null);
      setIsSaved(false);
      setCurrentMode(mode);

      // 1. Generate Content Hash
      const hash = await generateHash(text);
      setCurrentHash(hash);

      // 2. Check for "Settings-Aware" Cache Hit
      const { data: existing } = await supabase
        .from('summaries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('content_hash', hash)
        .eq('mode', mode)
        .eq('depth', depth)
        .eq('format', format)
        .eq('domain', domain)
        .maybeSingle();

      if (existing) {
        const cachedRecord = rowToRecord(existing);
        handleLoadRecord(cachedRecord);
        setIsProcessing(false);
        toast.success('Instant Summary!', {
          description: 'Restored from your history. ⚡',
          icon: '⚡',
        });
        return;
      }

      let stageIdx = 0;
      setProcessingStage(PROCESSING_STAGES[0]);

      const stageInterval = setInterval(() => {
        stageIdx = Math.min(stageIdx + 1, PROCESSING_STAGES.length - 1);
        setProcessingStage(PROCESSING_STAGES[stageIdx]);
      }, 350);

      await new Promise<void>(res => setTimeout(res, 1600));
      clearInterval(stageInterval);

      try {
        const hasAIKey = !!import.meta.env.VITE_GEMINI_API_KEY;
        const res = hasAIKey 
          ? await summarizeWithAI(text, mode, depth, format, domain, images)
          : summarizeWithMode(text, mode, depth, format, domain);
          
        if (res.engineUsed && res.engineUsed !== 'gemini-3.1-flash-lite') {
          toast.info(`Primary AI busy. Fallback used: ${res.engineUsed}`, {
            icon: '⚡',
            duration: 4000
          });
        }

        setResult(res);

        const method: SummarizationMethod =
          mode === 'storyteller' ? 'abstractive' : 'extractive';
        const length: SummaryLength =
          depth <= 0.3 ? 'brief' : depth >= 0.7 ? 'detailed' : 'medium';

        const record: SummaryRecord = {
          id: `summary_${Date.now()}`,
          userId: user!.id,
          title: generateTitle(text),
          originalText: text,
          summary: res.summary,
          keyPoints: res.keyPoints,
          method,
          mode,
          format,
          depth,
          length,
          domain,
          stats: res.stats,
          createdAt: new Date().toISOString(),
          isFavorited: false,
        };
        setCurrentRecord(record);

        toast.success('Summary generated successfully!', {
          description: `${res.stats.compressionRatio}% compression · ${res.stats.summaryWordCount} words`,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'An unexpected error occurred.';
        toast.error('Summarization failed', { description: msg });
      } finally {
        setIsProcessing(false);
        setProcessingStage('');
      }
    },
    [user]
  );

  /** CREATE — insert summary into Supabase */
  async function handleSave() {
    if (!currentRecord || isSaved || !user) return;

    const { data, error } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        title: currentRecord.title,
        original_text: currentRecord.originalText,
        summary: currentRecord.summary,
        key_points: currentRecord.keyPoints,
        method: currentRecord.method,
        mode: currentRecord.mode,
        format: currentRecord.format,
        depth: currentRecord.depth,
        length: currentRecord.length,
        domain: currentRecord.domain,
        stats: currentRecord.stats,
        is_favorited: false,
        content_hash: currentHash,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to save summary', { description: error.message });
      return;
    }

    const saved = rowToRecord(data as Record<string, unknown>);
    setHistory(prev => [saved, ...prev]);
    setCurrentRecord(saved);
    setIsSaved(true);
    toast.success('Summary saved to history!');
  }

  /** DELETE — remove summary from Supabase */
  async function handleDeleteRecord(id: string) {
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete summary', { description: error.message });
      return;
    }

    setHistory(prev => prev.filter(r => r.id !== id));
    toast.success('Summary deleted');
  }

  /** UPDATE — toggle favorite status in Supabase */
  async function handleToggleFavorite(id: string) {
    const record = history.find(r => r.id === id);
    if (!record) return;

    const newFav = !record.isFavorited;

    const { error } = await supabase
      .from('summaries')
      .update({ is_favorited: newFav })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update favorite', { description: error.message });
      return;
    }

    setHistory(prev =>
      prev.map(r => r.id === id ? { ...r, isFavorited: newFav } : r)
    );
  }

  function handleLoadRecord(record: SummaryRecord) {
    setActiveView('summarize');
    const synthetic: SummarizationResult = {
      summary: record.summary,
      keyPoints: record.keyPoints,
      highlightedSentences: [],
      stats: record.stats,
    };
    setResult(synthetic);
    setCurrentMode(record.mode || 'fact_checker');
    setCurrentRecord(record);
    setIsSaved(true);
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-[Inter,sans-serif]">
      <AppHeader
        activeView={activeView}
        onViewChange={v => setActiveView(v)}
        summaryCount={history.length}
        stats={userStats}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Welcome Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Welcome back, {user?.displayName || user?.username}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            What would you like to summarize today?
          </p>
        </div>

        {/* ── Summarize view ── */}
        <div style={{ display: activeView === 'summarize' ? 'block' : 'none' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[calc(100vh-8rem)]">
            {/* Input panel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm flex flex-col min-h-[500px] sm:min-h-[600px] lg:min-h-[calc(100vh-12rem)]">
              <SummaryInput
                onSummarize={handleSummarize}
                isProcessing={isProcessing}
              />
            </div>

            {/* Result panel */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm flex flex-col min-h-[400px] sm:min-h-[500px] lg:min-h-[calc(100vh-12rem)]">
              <SummaryResult
                result={result}
                mode={currentMode}
                isProcessing={isProcessing}
                processingStage={processingStage}
                onSave={handleSave}
                isSaved={isSaved}
              />
            </div>
          </div>
        </div>

        {/* ── History view ── */}
        <div style={{ display: activeView === 'history' ? 'block' : 'none' }}>
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-slate-900 dark:text-white mb-1">
                Summary History
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {historyLoading
                  ? 'Loading your summaries…'
                  : history.length > 0
                  ? `${history.length} saved ${
                      history.length === 1 ? 'summary' : 'summaries'
                    } — synced to your account`
                  : 'Your saved summaries will appear here'}
              </p>
            </div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <HistoryList
                records={history}
                onDelete={handleDeleteRecord}
                onToggleFavorite={handleToggleFavorite}
                onLoadRecord={handleLoadRecord}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
