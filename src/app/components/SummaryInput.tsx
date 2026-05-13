import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  FileText, Trash2, Loader2, Sparkles, UploadCloud,
  ChevronDown, ChevronRight, Zap, BookOpen, Gauge, FileScan, X, Files, Target,
} from 'lucide-react';
import type {
  SummarizationMode, OutputFormat, SummaryDepth, DocumentDomain,
} from '../types/summary';
import { validateText } from '../lib/summarizationEngine';
import { extractTextFromPDF } from '../lib/pdfService';
import { toast } from 'sonner';

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  pageCount: number;
  wordCount: number;
  images?: string[]; // Support for scanned images
}

interface SummaryInputProps {
  onSummarize: (
    text: string,
    mode: SummarizationMode,
    depth: SummaryDepth,
    format: OutputFormat,
    domain: DocumentDomain,
    images?: string[]
  ) => void;
  isProcessing: boolean;
}

const MODE_OPTIONS: { value: SummarizationMode; label: string; desc: string; icon: typeof Zap }[] = [
  { value: 'precise_summary', label: 'Precise Summary', desc: 'Focuses on accuracy while preserving the most important information.', icon: Target },
  { value: 'readable_summary', label: 'Readable Summary', desc: 'Transforms complex content into clear, natural summaries.', icon: Sparkles },
  { value: 'quick_digest', label: 'Quick Digest', desc: 'Condenses content into key takeaways for fast reading.', icon: Zap },
];

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'structured', label: 'Structured' },
];

const DOMAIN_OPTIONS: { value: DocumentDomain; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '📄' },
  { value: 'academic', label: 'Academic', emoji: '🎓' },
  { value: 'news', label: 'News', emoji: '📰' },
  { value: 'technical', label: 'Technical', emoji: '⚙️' },
  { value: 'legal', label: 'Legal', emoji: '⚖️' },
  { value: 'medical', label: 'Medical', emoji: '🩺' },
];


export function SummaryInput({ onSummarize, isProcessing }: SummaryInputProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SummarizationMode>('precise_summary');
  const [depth, setDepth] = useState<SummaryDepth>(0.5);
  const [format, setFormat] = useState<OutputFormat>('paragraph');
  const [domain, setDomain] = useState<DocumentDomain>('general');
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDocumentMode = attachedFiles.length > 0;

  // ── PDF Handling ────────────────────────────────────────────────────────────
  async function processPDFFiles(files: File[]) {
    const pdfs = files.filter(f => f.type.includes('pdf'));
    if (pdfs.length === 0) {
      toast.error('Unsupported file type', { description: 'Only PDF files are supported.' });
      return;
    }

    if (attachedFiles.length + pdfs.length > 5) {
      toast.error('File limit reached', {
        description: `You already have ${attachedFiles.length} file${attachedFiles.length === 1 ? '' : 's'} attached. Limit is 5 total.`,
        icon: '⚠️'
      });
      return;
    }

    setIsParsingPDF(true);
    let successCount = 0;
    for (const file of pdfs) {
      try {
        const result = await extractTextFromPDF(file);
        if (result.isScanned) {
          toast.warning(`${file.name} is a scanned PDF`, {
            description: 'No text found. Try a text-based PDF.',
            duration: 5000,
          });
        } else {
          setAttachedFiles(prev => [
            ...prev,
            {
              id: `${file.name}-${Date.now()}`,
              name: file.name,
              content: result.text,
              pageCount: result.pageCount,
              wordCount: result.wordCount,
            },
          ]);
          successCount++;
        }
      } catch {
        toast.error(`Failed to read ${file.name}`, { description: 'The file may be corrupted or password-protected.' });
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} PDF${successCount > 1 ? 's' : ''} attached`, {
        description: 'Your PDFs are ready for summarization.',
      });
    }
    setIsParsingPDF(false);
  }

  function removeAttachedFile(id: string) {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(false); }
  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    await processPDFFiles(Array.from(e.dataTransfer.files));
  }
  async function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) await processPDFFiles(Array.from(e.target.files));
    e.target.value = '';
  }

  // ── Text Mode ───────────────────────────────────────────────────────────────
  const wordCount = isDocumentMode
    ? attachedFiles.reduce((sum, f) => sum + f.wordCount, 0)
    : text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = text.length;

  const handleSubmit = () => {
    if (!isDocumentMode) {
      const validationError = validateText(text);
      if (validationError) { setError(validationError); return; }
    }

    let contentToSummarize = text;
    let allImages: string[] = [];

    if (isDocumentMode) {
      contentToSummarize = attachedFiles
        .map(f => `--- DOCUMENT: ${f.name} ---\n${f.content}`)
        .join('\n\n');

      allImages = attachedFiles.flatMap(f => f.images || []);
    }

    setError(null);
    onSummarize(contentToSummarize, mode, depth, format, domain, allImages);
  }

  function handleClear() { setText(''); setError(null); textareaRef.current?.focus(); }
  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) { setText(e.target.value); if (error) setError(null); }

  const depthLabel = depth <= 0.3 ? 'Brief' : depth >= 0.7 ? 'Deep Dive' : 'Balanced';
  const isReady = isDocumentMode ? wordCount >= 50 : wordCount >= 50;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg transition-colors ${isDocumentMode ? 'bg-violet-50 dark:bg-violet-950/30' : 'bg-indigo-50 dark:bg-indigo-950/30'}`}>
              {isDocumentMode
                ? <Files className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                : <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              }
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isDocumentMode ? `Document Mode · ${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''}` : 'Document Input'}
            </span>
          </div>
        </div>

        {/* ── Textarea with Drag & Drop ── */}
        <div
          className={`relative flex flex-col min-h-[240px] transition-all duration-300
            ${isDragging ? 'ring-4 ring-indigo-400/40 ring-offset-1' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            disabled={isParsingPDF || isDocumentMode}
            placeholder={
              isDocumentMode
                ? `Docs: ${attachedFiles.length}/5. Remove files to type manually.`
                : 'Paste text, or drag and drop your PDF documents here.'
            }
            className={`w-full flex-1 resize-none px-4 py-3.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-300 leading-relaxed
              ${isDocumentMode
                ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
                : isDragging
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 dark:border-indigo-500 shadow-inner'
                  : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/5'
              }`}
          />

          {/* Character Count Badge */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'} · {charCount.toLocaleString()} {charCount === 1 ? 'character' : 'characters'}
            </span>
          </div>

          {/* Clear Button (text mode only) */}
          {text && !isParsingPDF && !isDocumentMode && (
            <button
              onClick={handleClear}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isParsingPDF && (
            <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-3 z-10 animate-in fade-in duration-300 text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse uppercase tracking-widest px-4">Parsing Documents…</p>
            </div>
          )}
        </div>

        {/* ── Attached Files Gallery ── */}
        {isDocumentMode && attachedFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <FileScan className="w-3.5 h-3.5 text-violet-500" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-violet-700 dark:text-violet-300 truncate max-w-[100px]">{file.name}</p>
                  <p className="text-[8px] text-violet-400 dark:text-violet-500">{file.pageCount}p · {file.wordCount.toLocaleString()}w</p>
                </div>
                <button onClick={() => removeAttachedFile(file.id)} className="p-0.5 rounded-md hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-400 hover:text-violet-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Word Count / Error Row ── */}
        <div className="flex items-center justify-between min-h-[20px]">
          {error ? (
            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold animate-in fade-in slide-in-from-left-1 flex items-center gap-1.5 uppercase">
              <X className="w-3 h-3" /> {error}
            </p>
          ) : wordCount > 0 && wordCount < 50 && !isDocumentMode ? (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {50 - wordCount} more {50 - wordCount === 1 ? 'word' : 'words'} needed
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Ready</span>
            </div>
          )}
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Min. 50 words · Max. 15,000 words
          </span>
        </div>

        {/* ── Summary Slider ── */}
        <div className="pt-2 px-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 text-indigo-500" /> Summary Depth
            </span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
              {depthLabel}
            </span>
          </div>
          <div className="relative py-2 group">
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all duration-200"
            />
            <div className="flex justify-between mt-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Tiny</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Balanced</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Detailed</span>
            </div>
          </div>
        </div>

        {/* ── Advanced Settings Trigger ── */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center w-full py-2 group"
        >
          <div className="flex items-center gap-2">
            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${showAdvanced ? 'rotate-90 text-indigo-500' : ''}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${showAdvanced ? 'text-indigo-500' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              Summary Settings
            </span>
          </div>
          <div className="h-px flex-1 mx-4 bg-slate-100 dark:bg-slate-800/50" />
        </button>

        {showAdvanced && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-tighter">Style</p>
              <div className="flex flex-col gap-2">
                {MODE_OPTIONS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} onClick={() => setMode(m.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-300
                        ${mode === m.value
                          ? 'border-indigo-500 ring-4 ring-indigo-500/5 bg-indigo-50/30 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                    >
                      <div className={`p-1.5 rounded-lg transition-colors ${mode === m.value ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Icon className={`w-3.5 h-3.5 ${mode === m.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${mode === m.value ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 leading-snug mt-0.5">{m.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Visual Format</p>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f.value} onClick={() => setFormat(f.value)}
                    className={`flex-1 px-2 py-2 rounded-xl border text-center text-[10px] font-bold transition-all duration-200 uppercase tracking-tighter
                      ${format === f.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-tighter">Context Domain</p>
              <div className="relative">
                <select value={domain} onChange={e => setDomain(e.target.value as DocumentDomain)}
                  className="w-full appearance-none px-3.5 py-2.5 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all duration-200 cursor-pointer"
                >
                  {DOMAIN_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.emoji} {d.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Actions ── */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
        <div className="relative group">
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !isReady}
            className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all duration-300 active:scale-[0.98]"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing Your Summary…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {isDocumentMode ? `Summarize ${attachedFiles.length} Document${attachedFiles.length > 1 ? 's' : ''}` : 'Generate Summary'}</>
            )}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileInputChange} />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-300 group mt-1 uppercase tracking-widest"
        >
          <UploadCloud className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
          Upload PDF
        </button>
      </div>
    </div>
  );
}
