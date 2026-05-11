/** Summarization algorithm: extract sentences vs. reformulate content */
export type SummarizationMethod = 'extractive' | 'abstractive';

/** User-friendly summarization modes */
export type SummarizationMode = 'fact_checker' | 'storyteller' | 'speed_reader';

/** Output format preference */
export type OutputFormat = 'paragraph' | 'bullets' | 'story_arc';

/** Desired output length */
export type SummaryLength = 'brief' | 'medium' | 'detailed';

/** Summary depth (compression level) */
export type SummaryDepth = number; // 0.1 (skim) to 0.9 (deep dive)

/** Document domain for domain-aware summarization */
export type DocumentDomain =
  | 'general'
  | 'academic'
  | 'news'
  | 'technical'
  | 'legal'
  | 'medical';

/** Compression and readability statistics */
export interface SummaryStats {
  originalWordCount: number;
  summaryWordCount: number;
  compressionRatio: number; // percentage 0-100
  originalReadTime: number; // minutes
  summaryReadTime: number; // minutes
  sentencesExtracted: number;
  processingTimeMs?: number;
}

/** A persisted summary record saved to history */
export interface SummaryRecord {
  id: string;
  userId: string;
  title: string;
  originalText: string;
  summary: string;
  keyPoints: string[];
  method: SummarizationMethod;
  mode?: SummarizationMode;
  format?: OutputFormat;
  depth?: SummaryDepth;
  length: SummaryLength;
  domain: DocumentDomain;
  stats: SummaryStats;
  createdAt: string;
  isFavorited: boolean;
  contentHash?: string;
}

/** Transient result returned by the summarization engine */
export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  highlightedSentences: number[]; // sentence indices from source text
  stats: SummaryStats;
  engineUsed?: string;
}
