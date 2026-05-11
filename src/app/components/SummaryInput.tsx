import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  FileText, Trash2, Loader2, Sparkles, UploadCloud,
  ChevronDown, Zap, BookOpen, Gauge, FileScan, X, Files,
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
  { value: 'fact_checker', label: 'Exact Extraction', desc: 'Pulls the most important sentences exactly as written. Best for accuracy.', icon: FileText },
  { value: 'storyteller', label: 'Creative Rewriting', desc: 'Rewrites the text in a natural, conversational way. Best for easy reading.', icon: BookOpen },
  { value: 'speed_reader', label: 'Speed Reader', desc: 'Condenses everything into the 2-3 most critical points. Ultra-fast overview.', icon: Zap },
];

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'story_arc', label: 'Story Arc' },
];

const DOMAIN_OPTIONS: { value: DocumentDomain; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '📄' },
  { value: 'academic', label: 'Academic', emoji: '🎓' },
  { value: 'news', label: 'News', emoji: '📰' },
  { value: 'technical', label: 'Technical', emoji: '⚙️' },
  { value: 'legal', label: 'Legal', emoji: '⚖️' },
  { value: 'medical', label: 'Medical', emoji: '🩺' },
];

const SAMPLE_TEXT = `Artificial intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn like humans. The term may also be applied to any machine that exhibits traits associated with a human mind such as learning and problem-solving.\n\nThe ideal characteristic of artificial intelligence is its ability to rationalize and take actions that have the best chance of achieving a specific goal. A subset of artificial intelligence is machine learning (ML), which refers to the concept that computer programs can automatically learn from and adapt to new data without being assisted by humans.\n\nDeep learning techniques enable this automatic learning through the absorption of huge amounts of unstructured data such as text, images, or video. AI systems are used in a wide range of industries, from healthcare and finance to education and transportation.\n\nIn healthcare, AI algorithms can analyze medical images to detect diseases with remarkable accuracy, sometimes surpassing human specialists. In finance, AI-powered systems can process millions of transactions per second to detect fraudulent activity. In education, personalized learning platforms use AI to adapt to individual student needs and learning styles.\n\nThe rapid advancement of AI technology has sparked significant debate about its implications for the future of work and society. While AI promises to enhance productivity and solve complex problems, it also raises concerns about job displacement, privacy, and algorithmic bias. Ensuring that AI systems are transparent, fair, and aligned with human values remains one of the central challenges for researchers and policymakers alike.`;

export function SummaryInput({ onSummarize, isProcessing }: SummaryInputProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<SummarizationMode>('fact_checker');
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
        description: 'Textarea is now in Document Mode.',
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
  function loadSample() { setText(SAMPLE_TEXT); setError(null); }
  function handleTextChange(e: ChangeEvent<HTMLTextAreaElement>) { setText(e.target.value); if (error) setError(null); }

  const depthLabel = depth <= 0.3 ? 'Skim' : depth >= 0.7 ? 'Deep Dive' : 'Balanced';
  const isReady = isDocumentMode ? wordCount >= 50 : wordCount >= 50;

  return (
    <div className="flex flex-col h-full gap-5">

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
            {isDocumentMode ? `Document Mode · ${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''}` : 'Document Content'}
          </span>
        </div>
        {!isDocumentMode && (
          <button onClick={loadSample} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            Sample Text
          </button>
        )}
      </div>

      {/* ── Textarea with Drag & Drop ── */}
      <div
        className={`relative flex-1 min-h-0 rounded-xl transition-all duration-300
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
              ? `Document Mode active — ${attachedFiles.length}/5 PDFs attached. Remove files to type manually.`
              : 'Paste your text here — or drag & drop up to 5 PDFs…'
          }
          className={`w-full h-full min-h-48 resize-none px-4 py-3.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all duration-300 leading-relaxed
            ${isDocumentMode
              ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed'
              : isDragging
              ? 'bg-indigo-50/30 dark:bg-indigo-950/10 border-indigo-400 dark:border-indigo-600'
              : error
              ? 'bg-white dark:bg-slate-900 border-red-300 dark:border-red-800 focus:ring-4 focus:ring-red-500/10'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10'
            }`}
        />

        {/* Drop Zone Overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-400 dark:border-indigo-600 pointer-events-none">
            <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Drop PDFs here</p>
            <p className="text-xs text-indigo-400 dark:text-indigo-500 mt-0.5">Max 5 files supported</p>
          </div>
        )}

        {/* Parsing Overlay */}
        {isParsingPDF && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-800 pointer-events-none">
            <div className="relative mb-3">
              <FileScan className="w-8 h-8 text-indigo-400" />
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute -top-1 -right-1" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Parsing PDF…</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Extracting text from your document</p>
          </div>
        )}

        {/* Clear Button (text mode only) */}
        {text && !isParsingPDF && !isDocumentMode && (
          <button
            onClick={handleClear}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Attached Files Gallery ── */}
      {isDocumentMode && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mt-2 scrollbar-none">
          {attachedFiles.map(file => (
            <div
              key={file.id}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <FileScan className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300 truncate max-w-[120px]">
                  {file.name}
                </p>
                <p className="text-[9px] text-violet-400 dark:text-violet-500">
                  {file.pageCount}p · {file.wordCount.toLocaleString()}w
                </p>
              </div>
              <button
                onClick={() => removeAttachedFile(file.id)}
                className="p-0.5 rounded-md hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Word / char count */}
      <div className="flex items-center justify-between -mt-3 min-h-[20px]">
        {error ? (
          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium animate-in fade-in slide-in-from-left-1">
            ⚠️ {error}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {isDocumentMode
                ? `${wordCount.toLocaleString()} words across ${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''}`
                : wordCount > 0
                ? `${wordCount.toLocaleString()} words · ${charCount.toLocaleString()} chars`
                : 'Min. 50 words · Max. 15,000 words'
              }
            </p>
            {isReady && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
          </div>
        )}
        {isReady && !error && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tighter">
            Ready
          </span>
        )}
      </div>

      <div className="h-px bg-slate-100 dark:bg-slate-800/50" />

      {/* ── Depth Slider ── */}
      <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <Gauge className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Target Length</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <Sparkles className="w-2.5 h-2.5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{depthLabel}</span>
          </div>
        </div>
        <div className="px-1 relative">
          <input
            type="range" min="0.1" max="0.9" step="0.1" value={depth}
            onChange={e => setDepth(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-slate-100 dark:bg-slate-800 outline-none cursor-pointer accent-indigo-600 transition-all"
          />
        </div>
        <div className="flex items-center justify-between mt-3 px-0.5">
          {['Tiny', 'Balanced', 'Detailed'].map(l => (
            <span key={l} className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">{l}</span>
          ))}
        </div>
      </div>

      {/* ── Advanced Toggle ── */}
      <div className="space-y-3">
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center justify-between w-full group py-1">
          <div className="flex items-center gap-2">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showAdvanced ? '' : '-rotate-90'}`} />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
              Advanced Settings
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

      {/* ── Submit ── */}
      <div className="relative group mt-auto pt-4">
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
        {!isReady && !isProcessing && wordCount > 0 && !isDocumentMode && (
          <div className="absolute -bottom-7 left-0 right-0 text-center">
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              {50 - wordCount} more words needed
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileInputChange} />

      {/* Upload Trigger */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all duration-300 group mt-2 uppercase tracking-widest"
      >
        <UploadCloud className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
        Upload PDF
      </button>
    </div>
  );
}
