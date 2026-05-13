import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  BookmarkPlus,
  BarChart2,
  List,
  FileText,
  Loader2,
  Zap,
  CheckCircle2,
  Clock,
  AlignLeft,
  TrendingDown,
  BookOpen,
  Timer,
  Trash2,
} from 'lucide-react';
import type { SummarizationResult, SummarizationMode, SummaryComment } from '../types/summary';
import { toast } from 'sonner';
import { CommentToolbar } from './CommentToolbar';
import { Avatar } from './Avatar';
import { SmartPopover } from './SmartPopover';
import type { AvatarId } from '../types/profile';

interface SummaryResultProps {
  result: SummarizationResult | null;
  mode: SummarizationMode;
  isProcessing: boolean;
  processingStage: string;
  onSave: () => void;
  isSaved: boolean;
  /** Current comments for this summary */
  comments: SummaryComment[];
  /** Callback to update comments (bubbles up to Dashboard) */
  onCommentsChange: (comments: SummaryComment[]) => void;
  /** Current user info for authoring comments */
  currentUser?: { id: string; displayName: string; avatar: string; avatarUrl?: string };
}

type Tab = 'summary' | 'keypoints' | 'stats';

const MODE_LABELS: Record<SummarizationMode, string> = {
  precise_summary: 'Precise Summary',
  readable_summary: 'Readable Summary',
  quick_digest: 'Quick Digest',
};

/** Right-panel: animated summary output with tabs for key points and stats */
export function SummaryResult({
  result,
  mode,
  isProcessing,
  processingStage,
  onSave,
  isSaved,
  comments,
  onCommentsChange,
  currentUser,
}: SummaryResultProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Comment toolbar state
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [activeComment, setActiveComment] = useState<{ id: string; rect: DOMRect; isLocked: boolean } | null>(null);
  const summaryPanelRef = useRef<HTMLDivElement>(null);

  // Typewriter animation whenever result changes
  useEffect(() => {
    if (!result) {
      setDisplayedText('');
      return;
    }

    setActiveTab('summary');
    setDisplayedText('');
    setIsTyping(true);

    if (intervalRef.current) clearInterval(intervalRef.current);

    const summary = result.summary;
    let idx = 0;
    const CHUNK = 4;
    const DELAY = 12;

    intervalRef.current = setInterval(() => {
      idx += CHUNK;
      setDisplayedText(summary.slice(0, idx));
      if (idx >= summary.length) {
        setDisplayedText(summary);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, DELAY);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [result]);

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  /** Detect text selection and show the comment toolbar */
  const handleMouseUp = useCallback(() => {
    if (isTyping) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return; // Don't dismiss — let outside click handle it
    }
    const text = selection.toString().trim();
    if (text.length < 3) return;

    // Calculate character offsets within the displayed text
    const startIdx = displayedText.indexOf(text);
    if (startIdx === -1) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionRange({ start: startIdx, end: startIdx + text.length, text });
    setAnchorRect(rect);
  }, [isTyping, displayedText]);

  /** Add a comment to the current selection */
  function handleAddComment(commentText: string) {
    if (!selectionRange || !currentUser) return;
    const newComment: SummaryComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      snippetText: selectionRange.text,
      startIndex: selectionRange.start,
      endIndex: selectionRange.end,
      comment: commentText,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatar,
      userAvatarUrl: currentUser.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    onCommentsChange([...comments, newComment]);
    setAnchorRect(null);
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
    toast.success('Comment added!', { duration: 2000 });
  }

  /** Delete a comment */
  function handleDeleteComment(id: string) {
    onCommentsChange(comments.filter(c => c.id !== id));
    setActiveComment(null);
    toast.success('Comment removed', { duration: 1500 });
  }

  // Handle clicking away to dismiss locked comments
  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (!activeComment || !activeComment.isLocked) return;
      
      // If we clicked something that isn't the highlight or the popover, close it
      const target = e.target as HTMLElement;
      const isPopover = target.closest('[data-popover="true"]');
      const isHighlight = target.closest('[data-highlight="true"]');
      
      if (!isPopover && !isHighlight) {
        setActiveComment(null);
      }
    }

    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [activeComment]);

  /**
   * Render summary text with comment highlights.
   * Splits the text into segments: plain text and highlighted spans.
   */
  function renderAnnotatedText(text: string) {
    // Combine real comments and the active selection (if any)
    const allAnnotations = [...comments];
    if (selectionRange && !isTyping) {
      allAnnotations.push({
        id: 'pending-selection',
        snippetText: selectionRange.text,
        startIndex: selectionRange.start,
        endIndex: selectionRange.end,
        comment: '',
        userId: 'pending',
        userName: '',
        userAvatar: '',
        createdAt: '',
      });
    }

    if (allAnnotations.length === 0) {
      return text;
    }

    // Sort comments by start index
    const sorted = [...allAnnotations].sort((a, b) => a.startIndex - b.startIndex);
    const segments: React.ReactNode[] = [];
    let cursor = 0;

    for (const c of sorted) {
      // Validate the comment still matches the text
      const actualSnippet = text.slice(c.startIndex, c.endIndex);
      if (actualSnippet !== c.snippetText) continue;

      // Plain text before this highlight
      if (c.startIndex > cursor) {
        segments.push(text.slice(cursor, c.startIndex));
      }

      const isPending = c.id === 'pending-selection';

      // Highlighted span
      segments.push(
        <span
          key={c.id}
          data-highlight="true"
          className={`relative inline rounded-sm transition-all duration-200 cursor-pointer 
            ${isPending 
              ? 'bg-indigo-500/30 border-b-2 border-indigo-500' 
              : 'bg-amber-100/60 dark:bg-amber-800/20 border-b-2 border-amber-300 dark:border-amber-600 hover:bg-amber-200/80 dark:hover:bg-amber-700/30'
            }`}
          onMouseEnter={(e) => {
            if (isPending) return;
            // Only set if not already locked to a different comment
            if (!activeComment?.isLocked) {
              setActiveComment({ id: c.id, rect: e.currentTarget.getBoundingClientRect(), isLocked: false });
            }
          }}
          onMouseLeave={() => {
            if (isPending) return;
            // Only clear if it's not locked
            if (activeComment?.id === c.id && !activeComment.isLocked) {
              setActiveComment(null);
            }
          }}
          onClick={(e) => {
            if (isPending) return;
            e.stopPropagation();
            setActiveComment({ id: c.id, rect: e.currentTarget.getBoundingClientRect(), isLocked: true });
          }}
        >
          {c.snippetText}

          {/* Hover tooltip using SmartPopover (only for real comments) */}
          {!isPending && (
            <SmartPopover
              isOpen={activeComment?.id === c.id}
              anchorRect={activeComment?.rect ?? null}
            >
              <div 
                data-popover="true"
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-800/95 backdrop-blur-md border border-slate-600/50 shadow-2xl shadow-black/40 min-w-[220px] max-w-[320px]"
              >
                <div className="shrink-0 mt-0.5">
                  <Avatar 
                    avatarId={c.userAvatar as AvatarId} 
                    avatarUrl={c.userAvatarUrl}
                    size="sm" 
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-200 truncate">{c.userName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteComment(c.id); }}
                      className="p-0.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed break-words">{c.comment}</div>
                  <div className="text-[9px] text-slate-500">
                    {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </SmartPopover>
          )}
        </span>
      );

      cursor = c.endIndex;
    }

    // Remaining text
    if (cursor < text.length) {
      segments.push(text.slice(cursor));
    }

    return segments;
  }


  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'keypoints', label: 'Key Points', icon: List },
    { id: 'stats', label: 'Analytics', icon: BarChart2 },
  ];

  // ── Empty / idle state ──────────────────────────────────────────────────────
  if (!isProcessing && !result) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-5 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-900/30">
          <Sparkles className="w-7 h-7 text-indigo-400 dark:text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Your summary will appear here
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Paste text on the left and click{' '}
            <span className="text-indigo-500 font-medium">Generate Summary</span>
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5 w-full max-w-xs">
          {[
            { icon: TrendingDown, label: 'Compression ratio' },
            { icon: Clock, label: 'Reading time saved' },
            { icon: CheckCircle2, label: 'Key points' },
            { icon: AlignLeft, label: 'Sentences used' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center"
            >
              <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 mx-auto mb-2 flex items-center justify-center animate-pulse">
                <Icon className="w-3 h-3 text-slate-400" />
              </div>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Processing state ────────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
            <Zap className="w-7 h-7 text-indigo-500" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {processingStage}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            AI engine processing your document…
          </p>
        </div>
        <div className="w-full max-w-sm space-y-2.5 px-4">
          {[92, 100, 76, 88, 60].map((w, i) => (
            <div
              key={i}
              style={{ width: `${w}%` }}
              className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            >
              <div
                className="h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-200 dark:via-indigo-800 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { stats, keyPoints } = result;
  const timeSaved = stats.originalReadTime - stats.summaryReadTime;

  return (
    <div className="flex flex-col h-full gap-4 relative">
      {/* Creation Toolbar using SmartPopover */}
      <SmartPopover
        isOpen={!!anchorRect && !isTyping}
        anchorRect={anchorRect}
        margin={16}
      >
        <CommentToolbar
          onSubmit={handleAddComment}
          onDismiss={() => { setAnchorRect(null); setSelectionRange(null); }}
        />
      </SmartPopover>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              AI Summary
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-tighter">
            {MODE_LABELS[mode] ?? mode}
          </span>
          {result.engineUsed && (
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-mono">
              {result.engineUsed}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 transition-all duration-200"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 border
              ${isSaved
                ? 'text-white bg-indigo-600 border-indigo-600 cursor-default shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* ── Segmented Tab Control ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/30">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-tighter transition-all duration-300
              ${activeTab === t.id
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 20px;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #1e293b;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #334155;
          }
        `}} />

        {/* ── Summary Tab ── */}
        {activeTab === 'summary' && (
          <div
            ref={summaryPanelRef}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 mb-4 select-text cursor-text"
            onMouseUp={handleMouseUp}
          >
            <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-[1.9] whitespace-pre-wrap tracking-[-0.01em]">
              {isTyping ? displayedText : renderAnnotatedText(displayedText)}
              {isTyping && (
                <span className="inline-block w-0.5 h-5 bg-indigo-500 ml-0.5 animate-pulse align-middle rounded-full" />
              )}
            </p>

            {/* Comment count indicator */}
            {comments.length > 0 && !isTyping && (
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {comments.length} {comments.length === 1 ? 'annotation' : 'annotations'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Key Points Tab ── */}
        {activeTab === 'keypoints' && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 mb-3">
              {keyPoints.length} High-Impact Takeaways
            </p>
            {keyPoints.map((point, i) => (
              <div
                key={i}
                className="flex gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all duration-200 group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/60 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {point}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[9px] font-black text-slate-300 dark:text-slate-700 self-start mt-1 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats Tab ── */}
        {activeTab === 'stats' && (
          <div className="space-y-3">

            {/* Primary Stat: Compression */}
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-indigo-50/30 dark:from-indigo-950/30 dark:to-transparent">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tighter">Compression</span>
                </div>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {stats.compressionRatio}%
                </span>
              </div>
              <p className="text-[10px] text-indigo-400 dark:text-indigo-500">of original content removed</p>
            </div>

            {/* Time Saved */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50 to-emerald-50/30 dark:from-emerald-950/30 dark:to-transparent">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-tighter">Time Saved</span>
                </div>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {timeSaved}m
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 dark:text-emerald-600">of reading time recovered</p>
            </div>

            {/* Word Counts Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Original', value: stats.originalWordCount.toLocaleString(), sub: 'words', icon: BookOpen },
                { label: 'Summary', value: stats.summaryWordCount.toLocaleString(), sub: 'words', icon: AlignLeft },
                { label: 'Original read', value: `${stats.originalReadTime}m`, sub: 'at 200 wpm', icon: Timer },
                { label: 'Summary read', value: `${stats.summaryReadTime}m`, sub: 'at 200 wpm', icon: Zap },
              ].map(s => (
                <div
                  key={s.label}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
                >
                  <s.icon className="w-3.5 h-3.5 text-slate-400 mb-2" />
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums mb-0.5">
                    {s.value}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    {s.label}
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500">
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Content Retained Bar */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-400">
                  Content Retained
                </span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 tabular-nums">
                  {100 - stats.compressionRatio}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${100 - stats.compressionRatio}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">0%</span>
                <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">100%</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
