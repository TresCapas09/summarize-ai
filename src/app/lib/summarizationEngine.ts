import type {
  SummarizationMethod,
  SummarizationMode,
  OutputFormat,
  SummaryDepth,
  SummaryLength,
  DocumentDomain,
  SummarizationResult,
  SummaryStats,
} from '../types/summary';

// ─── Stop-word list ───────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','in','on','at','to','for','of','and','or','but','is','was',
  'are','were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','it','its','this','that','these',
  'those','i','we','you','he','she','they','me','us','him','her','them','my',
  'our','your','his','their','with','by','from','up','about','into','through',
  'during','before','after','above','below','each','more','than','other',
  'some','such','no','not','only','same','so','just','as','if','when','there',
  'all','both','few','most','which','who','what','where','how','very','also',
  'well','back','any','even','still','then','now','too','here','already','yet',
  'since','can','shall','need','used','did','put','let',
]);

// ─── Tokenizers ───────────────────────────────────────────────────────────────

/** Split text into individual sentences */
function tokenizeSentences(text: string): string[] {
  const normalized = text
    .replace(/\r?\n\s*\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Insert delimiters at sentence boundaries: end-punct + space + capital letter
  const withDelimiters = normalized.replace(
    /([.!?])\s+(?=[A-Z"'])/g,
    '$1\u0000'
  );

  return withDelimiters
    .split('\u0000')
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 5 && s.length > 0);
}

/** Tokenize into meaningful non-stop words */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// ─── TF scoring ───────────────────────────────────────────────────────────────

/** Calculate normalized term frequencies for the whole document */
function calculateWordFrequency(text: string): Map<string, number> {
  const words = tokenizeWords(text);
  const freq = new Map<string, number>();
  words.forEach(w => freq.set(w, (freq.get(w) ?? 0) + 1));
  const max = Math.max(...freq.values(), 1);
  freq.forEach((v, k) => freq.set(k, v / max));
  return freq;
}

/** Score sentences based on TF, position, length, and named-entity density */
function scoreSentences(
  sentences: string[],
  wordFreq: Map<string, number>
): number[] {
  return sentences.map((sentence, idx) => {
    const words = tokenizeWords(sentence);
    if (words.length === 0) return 0;

    const tfScore =
      words.reduce((sum, w) => sum + (wordFreq.get(w) ?? 0), 0) / words.length;

    const posBonus =
      idx === 0 ? 0.6
      : idx === 1 ? 0.3
      : idx === sentences.length - 1 ? 0.4
      : idx === sentences.length - 2 ? 0.2
      : 0;

    const raw = sentence.split(/\s+/).length;
    const lenBonus = raw >= 10 && raw <= 40 ? 0.15 : 0;

    const entities = (sentence.match(/\b[A-Z][a-z]+/g) ?? []).length;
    const entityBonus = Math.min(entities * 0.05, 0.2);

    return tfScore + posBonus + lenBonus + entityBonus;
  });
}

/** How many sentences to extract for a given length setting */
function getTargetCount(total: number, length: SummaryLength): number {
  const ratios: Record<SummaryLength, number> = {
    brief: 0.15,
    medium: 0.30,
    detailed: 0.50,
  };
  return Math.max(2, Math.min(Math.round(total * ratios[length]), total - 1));
}

/** Convert depth value to length setting */
function depthToLength(depth: SummaryDepth): SummaryLength {
  if (depth <= 0.3) return 'brief';
  if (depth >= 0.7) return 'detailed';
  return 'medium';
}

/** Map user mode to technical method */
function modeToMethod(mode: SummarizationMode): SummarizationMethod {
  switch (mode) {
    case 'precise_summary':
      return 'extractive';
    case 'readable_summary':
      return 'abstractive';
    case 'quick_digest':
      return 'extractive'; // Uses extractive but with minimal sentences
  }
}

/** Top N keywords from frequency map */
function extractTopKeywords(
  wordFreq: Map<string, number>,
  n = 5
): string[] {
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

// ─── Summarization algorithms ─────────────────────────────────────────────────

/** Extractive: pick the highest-scoring sentences verbatim */
function runExtractive(
  sentences: string[],
  wordFreq: Map<string, number>,
  length: SummaryLength
): { summary: string; highlightedSentences: number[] } {
  const scores = scoreSentences(sentences, wordFreq);
  const target = getTargetCount(sentences.length, length);

  const ranked = scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .slice(0, target)
    .sort((a, b) => a.idx - b.idx);

  return {
    summary: ranked.map(r => sentences[r.idx]).join(' '),
    highlightedSentences: ranked.map(r => r.idx),
  };
}

/** Abstractive-style: restructures extracted content with transitions */
function runAbstractive(
  sentences: string[],
  wordFreq: Map<string, number>,
  length: SummaryLength,
  domain: DocumentDomain
): { summary: string; highlightedSentences: number[] } {
  const scores = scoreSentences(sentences, wordFreq);
  const target = getTargetCount(sentences.length, length);
  const keywords = extractTopKeywords(wordFreq, 6);

  const selectedCount = Math.min(target + 2, sentences.length);
  const ranked = scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .slice(0, selectedCount)
    .sort((a, b) => a.idx - b.idx);

  const openings: Record<DocumentDomain, string> = {
    auto: `The text examines ${keywords[0] ?? 'the subject'} and its relationship to ${keywords[1] ?? 'related themes'}.`,
    general: `The text examines ${keywords[0] ?? 'the subject'} and its relationship to ${keywords[1] ?? 'related themes'}.`,
    academic: `This academic work investigates ${keywords[0] ?? 'the topic'}, with a primary focus on ${keywords[1] ?? 'key findings'} and their scholarly implications.`,
    news: `In recent developments, this report covers ${keywords[0] ?? 'current events'} and the broader impact on ${keywords[1] ?? 'stakeholders'}.`,
    technical: `This technical document details ${keywords[0] ?? 'the system'} alongside its relationship to ${keywords[1] ?? 'core components'} and operational parameters.`,
    legal: `The document addresses ${keywords[0] ?? 'the matter'} and establishes clear provisions regarding ${keywords[1] ?? 'the relevant procedures'}.`,
    medical: `This medical text discusses ${keywords[0] ?? 'the condition'} and examines connections to ${keywords[1] ?? 'treatment approaches'} and patient outcomes.`,
  };

  const transitions = [
    'The document further states that ',
    'According to the source, ',
    'Notably, ',
    'The author highlights that ',
    'A key finding is that ',
    'This is reinforced by the observation that ',
    'The text underscores that ',
  ];

  const parts: string[] = [openings[domain]];

  ranked.forEach(({ idx }, i) => {
    const sentence = sentences[idx];
    const lower = sentence.charAt(0).toLowerCase() + sentence.slice(1);
    if (i === 0) {
      parts.push(sentence);
    } else if (i === ranked.length - 1) {
      parts.push(`In summary, ${lower}`);
    } else {
      parts.push(transitions[i % transitions.length] + lower);
    }
  });

  return {
    summary: parts.join(' ').trim(),
    highlightedSentences: ranked.map(r => r.idx),
  };
}

/** Extract key bullet-point sentences (up to 5) */
function extractKeyPoints(
  sentences: string[],
  wordFreq: Map<string, number>
): string[] {
  const scores = scoreSentences(sentences, wordFreq);
  return scores
    .map((score, idx) => ({ score, idx }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .sort((a, b) => a.idx - b.idx)
    .map(({ idx }) => {
      const words = sentences[idx].split(/\s+/);
      return words.length > 28
        ? words.slice(0, 28).join(' ') + '…'
        : sentences[idx];
    });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/** Format summary text based on user preference and document domain */
function formatSummary(
  summary: string,
  format: OutputFormat,
  domain: DocumentDomain,
  sentences: string[]
): string {
  if (format === 'paragraph') {
    return summary;
  }

  if (format === 'bullets') {
    // Split summary into sentence-like chunks and format as bullets
    const chunks = summary.match(/[^.!?]+[.!?]+/g) || [summary];
    return chunks
      .map(chunk => `• ${chunk.trim()}`)
      .join('\n\n');
  }

  if (format === 'structured') {
    // Create a structured format based on document type
    const chunks = summary.match(/[^.!?]+[.!?]+/g) || [summary];
    if (chunks.length <= 2) return summary;

    // Context-aware headers based on document domain
    const headers = getStructuredHeaders(domain);

    // For general domain, return clean paragraphs without headers
    if (headers.opening === '') {
      return summary;
    }

    const parts: string[] = [];
    parts.push(`**${headers.opening}:** ${chunks[0].trim()}`);

    if (chunks.length > 3) {
      const middle = chunks.slice(1, -1).join(' ');
      parts.push(`\n\n**${headers.middle}:** ${middle.trim()}`);
    }

    parts.push(`\n\n**${headers.closing}:** ${chunks[chunks.length - 1].trim()}`);
    return parts.join('');
  }

  return summary;
}

/** Get context-aware headers for Structured format based on document type */
function getStructuredHeaders(domain: DocumentDomain): {
  opening: string;
  middle: string;
  closing: string;
} {
  switch (domain) {
    case 'academic':
    case 'technical':
      return {
        opening: 'Abstract',
        middle: 'Findings',
        closing: 'Conclusion',
      };
    case 'news':
      return {
        opening: 'Lead',
        middle: 'Context',
        closing: 'Impact',
      };
    case 'legal':
      return {
        opening: 'Overview',
        middle: 'Key Provisions',
        closing: 'Implications',
      };
    case 'medical':
      return {
        opening: 'Background',
        middle: 'Clinical Details',
        closing: 'Recommendations',
      };
    case 'general':
    default:
      // For general content, no headers - just clean paragraphs
      return {
        opening: '',
        middle: '',
        closing: '',
      };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main summarization entry point.
 * Runs extractive or abstractive NLP simulation and returns structured results.
 */
export function summarizeText(
  text: string,
  method: SummarizationMethod,
  length: SummaryLength,
  domain: DocumentDomain
): SummarizationResult {
  const sentences = tokenizeSentences(text);

  if (sentences.length === 0) {
    throw new Error(
      'Unable to detect sentence boundaries. Please check your input text.'
    );
  }
  if (sentences.length < 3) {
    throw new Error(
      'Text is too short to summarize. Please provide at least 3–4 sentences.'
    );
  }

  const wordFreq = calculateWordFrequency(text);

  const { summary, highlightedSentences } =
    method === 'extractive'
      ? runExtractive(sentences, wordFreq, length)
      : runAbstractive(sentences, wordFreq, length, domain);

  const keyPoints = extractKeyPoints(sentences, wordFreq);

  const origWords = countWords(text);
  const sumWords = countWords(summary);
  const wpm = 200;

  const stats: SummaryStats = {
    originalWordCount: origWords,
    summaryWordCount: sumWords,
    compressionRatio: Math.max(0, Math.round((1 - sumWords / origWords) * 100)),
    originalReadTime: Math.round((origWords / wpm) * 10) / 10,
    summaryReadTime: Math.round((sumWords / wpm) * 10) / 10,
    sentencesExtracted: highlightedSentences.length,
  };

  return { summary, keyPoints, highlightedSentences, stats };
}

/**
 * New mode-based summarization API.
 * User-friendly interface with customization controls.
 */
export function summarizeWithMode(
  text: string,
  mode: SummarizationMode,
  depth: SummaryDepth,
  format: OutputFormat,
  domain: DocumentDomain
): SummarizationResult {
  const sentences = tokenizeSentences(text);

  if (sentences.length === 0) {
    throw new Error(
      'Unable to detect sentence boundaries. Please check your input text.'
    );
  }
  if (sentences.length < 3) {
    throw new Error(
      'Text is too short to summarize. Please provide at least 3–4 sentences.'
    );
  }

  const wordFreq = calculateWordFrequency(text);
  const length = depthToLength(depth);
  const method = modeToMethod(mode);

  // For quick digest mode, always use brief
  const effectiveLength = mode === 'quick_digest' ? 'brief' : length;

  const { summary: rawSummary, highlightedSentences } =
    method === 'extractive'
      ? runExtractive(sentences, wordFreq, effectiveLength)
      : runAbstractive(sentences, wordFreq, effectiveLength, domain);

  // Apply formatting with context-aware headers
  const summary = formatSummary(rawSummary, format, domain, sentences);

  // For quick digest, extract only top 2-3 key points
  const keyPoints =
    mode === 'quick_digest'
      ? extractKeyPoints(sentences, wordFreq).slice(0, 3)
      : extractKeyPoints(sentences, wordFreq);

  const origWords = countWords(text);
  const sumWords = countWords(rawSummary);
  const wpm = 200;

  const stats: SummaryStats = {
    originalWordCount: origWords,
    summaryWordCount: sumWords,
    compressionRatio: Math.max(0, Math.round((1 - sumWords / origWords) * 100)),
    originalReadTime: Math.round((origWords / wpm) * 10) / 10,
    summaryReadTime: Math.round((sumWords / wpm) * 10) / 10,
    sentencesExtracted: highlightedSentences.length,
  };

  return { summary, keyPoints, highlightedSentences, stats };
}

/**
 * Auto-generate a short title from the first line of text.
 */
export function generateTitle(text: string): string {
  const sentences = tokenizeSentences(text);
  if (sentences.length === 0) return 'Untitled Summary';
  const words = sentences[0].split(/\s+/);
  return words.length <= 8
    ? sentences[0].replace(/[.!?]$/, '')
    : words.slice(0, 7).join(' ') + '…';
}

/**
 * Validate text input before processing.
 * Returns an error string or null if valid.
 */
export function validateText(text: string): string | null {
  if (!text.trim()) return 'Please enter some text to summarize.';
  const wc = countWords(text);
  if (wc < 50) return 'Please provide at least 50 words for meaningful summarization.';
  if (wc > 15000) return 'Text exceeds the 15,000-word limit. Please shorten your input.';
  return null;
}
