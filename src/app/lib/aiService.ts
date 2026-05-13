import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

import type {
  SummarizationMode,
  OutputFormat,
  SummaryDepth,
  DocumentDomain,
  SummarizationResult,
  SummaryStats
} from '../types/summary';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

const genAI = GEMINI_KEY
  ? new GoogleGenerativeAI(GEMINI_KEY)
  : null;

const groq = GROQ_KEY
  ? new Groq({
    apiKey: GROQ_KEY,
    dangerouslyAllowBrowser: true
  })
  : null;

const MODELS = {
  PRIMARY: 'gemini-3.1-flash-lite',
  FALLBACK_A: 'gemini-2.5-flash',
  FALLBACK_B: 'openai/gpt-oss-120b',
  FALLBACK_C: 'meta-llama/llama-4-scout-17b'
};

const SYSTEM_PROMPT = `
You are a deterministic AI summarization engine designed for production environments.

STRICT OPERATIONAL RULES:
1. OUTPUT ONLY VALID JSON. 
2. NO MARKDOWN (no \`\`\`json blocks).
3. NO EXPLANATIONS or conversational filler.
4. ABSOLUTE ADHERENCE to the requested format (bullets, paragraphs, or story arc).
5. FACTUAL INTEGRITY: Do not hallucinate or add information not present in the source.
6. STICK TO THE REQUESTED LENGTH: If a word count or sentence limit is provided, you MUST NOT exceed it.
`;



/**
 * Timeout Helper
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    )
  ]);
}



/**
 * Safe JSON Parser
 */
function safeJsonParse(raw: string) {
  try {
    // Remove potential markdown code blocks if the AI ignored the system prompt
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[AI] JSON Parse Error. Raw output:', raw);
    return {
      summary: 'Failed to generate a valid structured summary. Please try again.',
      keyPoints: []
    };
  }
}



/**
 * Prompt Constructor
 */
function constructPrompt(
  text: string,
  mode: SummarizationMode,
  depth: number, // 0.1 to 0.9
  format: OutputFormat,
  domain: DocumentDomain
): string {
  const wordCount = text.trim().split(/\s+/).length;

  // 1. QUANTITATIVE DEPTH REQUIREMENTS
  let depthText = '';
  let bulletCount = '';
  let sentenceLimit = '';

  if (depth <= 0.3) {
    const targetWords = Math.max(50, Math.round(wordCount * 0.15));
    depthText = `ULTRA-CONCISE BRIEF. Target: ~${targetWords} words. Focus ONLY on the absolute core thesis.`;
    bulletCount = '2-3 high-impact bullets';
    sentenceLimit = 'MAXIMUM 3 sentences total.';
  } else if (depth >= 0.7) {
    const targetWords = Math.round(wordCount * 0.5);
    depthText = `COMPREHENSIVE DEEP-DIVE. Target: ~${targetWords} words. Include nuances, data points, and sub-arguments.`;
    bulletCount = '8-12 detailed bullets';
    sentenceLimit = 'Minimum 8-10 sentences to ensure detail.';
  } else {
    const targetWords = Math.round(wordCount * 0.3);
    depthText = `BALANCED OVERVIEW. Target: ~${targetWords} words. Cover main ideas and supporting logic.`;
    bulletCount = '5-7 balanced bullets';
    sentenceLimit = '4-6 well-structured sentences.';
  }

  // 2. MODE REQUIREMENTS
  let modeText = '';
  switch (mode) {
    case 'precise_summary':
      modeText = `PRECISE & FAITHFUL SUMMARY. Generate a precise and faithful summary that preserves the most important information from the original document. Prioritize factual accuracy, clarity, and minimal distortion of meaning. ${sentenceLimit}`;
      break;
    case 'readable_summary':
      modeText = 'NATURAL & READABLE SUMMARY. Generate a clear, natural, and easy-to-read summary that simplifies complex ideas while preserving the original meaning. Improve readability without adding fictional or exaggerated details.';
      break;
    case 'quick_digest':
      modeText = `HIGHLY CONDENSED QUICK DIGEST. Generate a highly condensed summary focused only on the most critical takeaways. Prioritize brevity, clarity, and fast readability. ${sentenceLimit}`;
      break;
    default:
      modeText = 'General summarization.';
  }

  // 3. FORMAT REQUIREMENTS
  let formatText = '';
  if (format === 'bullets') {
    formatText = `LIST FORMAT. Every line MUST begin with the "-" character. NO paragraphs. Target: ${bulletCount}.`;
  } else if (format === 'structured') {
    formatText = 'STRUCTURED FORMAT. Organize the content into clear, logical sections with descriptive bold headers. Group ideas by theme or category for maximum clarity. Use a professional, organized tone.';
  } else {
    formatText = `PARAGRAPH FORMAT. Cohesive paragraphs. ${sentenceLimit}`;
  }

  // 4. KEY POINT COUNT
  let pointCount = 5;
  if (depth <= 0.3) pointCount = 3;
  else if (depth >= 0.7) pointCount = 10;

  return `
OBJECTIVE: Summarize the document below with 100% adherence to technical constraints.

DOCUMENT DOMAIN: ${domain}

DEPTH REQUIREMENTS: ${depthText}

MODE REQUIREMENTS: ${modeText}

FORMAT REQUIREMENTS: ${formatText}

KEY POINT REQUIREMENTS:
- Extract exactly ${pointCount} high-impact takeaways.
- Be concise and non-repetitive.

STRICT OUTPUT RULES:
- VALID JSON ONLY.
- NO MARKDOWN.
- NO EXPLANATIONS.

REQUIRED JSON SCHEMA:
{
  "summary": "...",
  "keyPoints": ["point 1", "point 2", ..., "point ${pointCount}"]
}

DOCUMENT:
${text}
`;
}



/**
 * Gemini API
 */
async function callGemini(
  prompt: string,
  modelId: string,
  images?: string[]
): Promise<any> {

  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  // Use systemInstruction for better adherence to rules
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json'
    }
  });

  // 2. Construct Multimodal Parts
  const parts: any[] = [{ text: prompt }];

  if (images && images.length > 0) {
    images.forEach(img => {
      const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      });
    });
  }

  const result = await model.generateContent(parts);

  return safeJsonParse(result.response.text());
}



/**
 * Groq API
 */
async function callGroq(
  prompt: string,
  modelName: string
): Promise<any> {

  if (!groq) {
    throw new Error('Groq not configured');
  }

  const chatCompletion =
    await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: modelName,
      temperature: 0, // Force strict adherence to rules
      top_p: 1,
      response_format: {
        type: 'json_object'
      }
    });

  return safeJsonParse(
    chatCompletion.choices[0].message.content || '{}'
  );
}



/**
 * Retry Wrapper
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = 1
): Promise<T> {

  let lastError: any;

  for (let i = 0; i <= retries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      console.warn(
        `[Retry Attempt ${i + 1}]`,
        err
      );
    }
  }

  throw lastError;
}



/**
 * Main Summarization
 */
export async function summarizeWithAI(
  text: string,
  mode: SummarizationMode,
  depth: SummaryDepth,
  format: OutputFormat,
  domain: DocumentDomain,
  images?: string[]
): Promise<SummarizationResult> {

  const prompt = constructPrompt(
    text,
    mode,
    depth,
    format,
    domain
  );

  const originalWords =
    text.trim().split(/\s+/).length;



  const runWaterfall = async () => {
    /**
     * PRIMARY: Gemini 3.1
     */
    try {
      console.log(`[AI] Attempting Primary: ${MODELS.PRIMARY}`);
      const data = await withTimeout(
        retryOperation(
          () => callGemini(prompt, MODELS.PRIMARY, images),
          1
        ),
        15000, // Increase timeout for vision processing
        'Primary Gemini'
      );
      return { data, engine: MODELS.PRIMARY };
    } catch (err: any) {
      console.warn(`[AI] Primary Failed: ${err.message}`);

      /**
       * FALLBACK A: Gemini Stable
       */
      try {
        console.log(`[AI] Attempting Fallback A: ${MODELS.FALLBACK_A}`);
        const data = await retryOperation(() => callGemini(prompt, MODELS.FALLBACK_A, images), 1);
        return { data, engine: MODELS.FALLBACK_A };
      } catch (err2: any) {
        console.warn(`[AI] Fallback A Failed: ${err2.message}`);

        /**
         * FALLBACK B: Groq GPT-OSS
         */
        try {
          console.log(`[AI] Attempting Fallback B: ${MODELS.FALLBACK_B}`);
          const data = await retryOperation(() => callGroq(prompt, MODELS.FALLBACK_B), 1);
          return { data, engine: MODELS.FALLBACK_B };
        } catch (err3: any) {
          console.warn(`[AI] Fallback B Failed: ${err3.message}`);

          /**
           * FALLBACK C: Groq Llama-Scout
           */
          console.log(`[AI] Attempting Fallback C: ${MODELS.FALLBACK_C}`);
          const data = await retryOperation(() => callGroq(prompt, MODELS.FALLBACK_C), 1);
          return { data, engine: MODELS.FALLBACK_C };
        }
      }
    }
  };



  const startTime = performance.now();

  const { data, engine } =
    await runWaterfall();

  const endTime = performance.now();

  const summaryWords =
    (data.summary || '')
      .trim()
      .split(/\s+/)
      .length;



  const stats: SummaryStats = {

    originalWordCount: originalWords,

    summaryWordCount: summaryWords,

    compressionRatio: Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (1 - summaryWords / originalWords) * 100
        )
      )
    ),

    originalReadTime:
      Math.ceil(originalWords / 200),

    summaryReadTime:
      Math.ceil(summaryWords / 200),

    sentencesExtracted: mode === 'extractive' ? Math.ceil(summaryWords / 15) : 0,

    processingTimeMs:
      Math.round(endTime - startTime)

  };



  return {

    summary:
      data.summary ||
      'Summary generation failed.',

    keyPoints:
      data.keyPoints || [],

    highlightedSentences: [],

    stats,

    engineUsed: engine

  };
}