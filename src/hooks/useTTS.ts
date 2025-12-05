import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import type { Article } from '../api/articles';

export type TTSState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface TTSOptions {
  rate: number; // 0.5 - 2.0
  pitch: number; // 0 - 2
  volume: number; // 0 - 1
  voiceURI?: string;
  lang?: string;
}

export interface TTSProgress {
  currentIndex: number;
  totalChunks: number;
  currentText: string;
  progress: number; // 0 - 1
}

export interface UseTTSReturn {
  state: TTSState;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  rate: number;
  options: TTSOptions;
  progress: TTSProgress | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
  setOptions: (options: Partial<TTSOptions>) => void;
}

/**
 * Element structure for TTS chunks mapped to DOM
 */
interface TTSChunkElement {
  text: string;
  spans: HTMLElement[]; // Array of spans with IDs (ritl-w-*)
  chunkIndex: number;
  domElement?: HTMLElement; // Keep for backward compatibility/fallback
}

/**
 * Parse content from DOM and create array of chunks based on spans with IDs (ritl-w-*).
 * Groups spans into sentence-like chunks for natural reading.
 */
function parseContentToElements(contentRef: MutableRefObject<HTMLDivElement | null>, article: Article | null): TTSChunkElement[] {
  if (!contentRef.current || !article) return [];
  
  // Try to find spans with IDs first
  const allSpans = Array.from(contentRef.current.querySelectorAll('[id^="ritl-w-"]')) as HTMLElement[];
  
  // If no spans found, fallback to old behavior
  if (allSpans.length === 0) {
    console.log('[TTS] No token spans found, falling back to element-based parsing');
    return parseContentToElementsFallback(contentRef, article);
  }
  
  // Sort spans by their numeric index
  allSpans.sort((a, b) => {
    const aIndex = parseInt(a.id.replace('ritl-w-', ''), 10);
    const bIndex = parseInt(b.id.replace('ritl-w-', ''), 10);
    return aIndex - bIndex;
  });
  
  const chunks: TTSChunkElement[] = [];
  let currentChunkSpans: HTMLElement[] = [];
  let currentChunkText: string[] = [];
  let globalChunkIndex = 0;
  
  // Group spans into sentence-like chunks
  // A chunk ends at sentence-ending punctuation (. ! ?) or at a reasonable length
  const sentenceEndRegex = /[.!?。！？]\s*$/;
  const maxChunkLength = 200; // Maximum characters per chunk
  
  for (let i = 0; i < allSpans.length; i++) {
    const span = allSpans[i];
    const spanText = span.textContent || '';
    
    currentChunkSpans.push(span);
    currentChunkText.push(spanText);
    
    const currentText = currentChunkText.join('');
    const endsWithSentencePunctuation = sentenceEndRegex.test(currentText);
    const exceedsMaxLength = currentText.length >= maxChunkLength;
    
    // Create chunk if:
    // 1. Ends with sentence punctuation, OR
    // 2. Exceeds max length, OR
    // 3. Is the last span
    if (endsWithSentencePunctuation || exceedsMaxLength || i === allSpans.length - 1) {
      const chunkText = currentChunkText.join('').trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          spans: [...currentChunkSpans],
          chunkIndex: globalChunkIndex++,
        });
      }
      
      currentChunkSpans = [];
      currentChunkText = [];
    }
  }
  
  console.log('[TTS] Parsed', chunks.length, 'chunks from', allSpans.length, 'token spans');
  return chunks;
}

/**
 * Fallback parser for when token spans are not available.
 * Uses the old element-based approach.
 */
function parseContentToElementsFallback(contentRef: MutableRefObject<HTMLDivElement | null>, article: Article | null): TTSChunkElement[] {
  if (!contentRef.current || !article) return [];
  
  const elements: TTSChunkElement[] = [];
  let globalChunkIndex = 0;
  
  // Selector for clear, readable block elements.
  const textElementSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, div[role="paragraph"]';
  
  const allElements = contentRef.current.querySelectorAll(textElementSelector);
  const processedElements = new Set<HTMLElement>();
  
  allElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    
    if (processedElements.has(htmlElement)) return;
    
    // Check for nesting: Skip if this element is inside another valid chunk element
    let parent: HTMLElement | null = htmlElement.parentElement;
    let isNestedChunk = false;
    
    while (parent && parent !== contentRef.current) {
        // If a parent is also a selected chunk type, we prioritize the parent (or skip the child if the parent is already processed)
        if (parent.matches(textElementSelector)) {
            isNestedChunk = true;
            break;
        }
        parent = parent.parentElement;
    }
    
    if (isNestedChunk) {
        processedElements.add(htmlElement); 
        return;
    }
    
    const elementText = htmlElement.textContent || '';
    const trimmedText = elementText.trim();
    
    if (trimmedText.length < 3) return;
    
    elements.push({
      text: trimmedText,
      spans: [], // No spans available in fallback mode
      chunkIndex: globalChunkIndex++,
      domElement: htmlElement, // Keep for fallback
    });
    
    // Mark all children as processed to avoid double-reading nested elements
    htmlElement.querySelectorAll(textElementSelector).forEach(child => processedElements.add(child as HTMLElement));
  });
  
  console.log('[TTS] Parsed', elements.length, 'HTML element chunks from DOM (fallback)');
  return elements;
}

export function useTTS(article: Article | null, contentRef: MutableRefObject<HTMLDivElement | null>): UseTTSReturn {
  const [state, setState] = useState<TTSState>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1.0);
  const [options, setOptionsState] = useState<TTSOptions>({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'pt-BR',
  });
  const [progress, setProgress] = useState<TTSProgress | null>(null);
  
  const chunksRef = useRef<TTSChunkElement[]>([]);
  const currentChunkIndexRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPausedRef = useRef(false);
  const activeSpansRef = useRef<HTMLElement[]>([]); // Track currently highlighted spans

  // --- Hooks and Lifecycle ---

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);
    
    if (supported) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        setCurrentVoice(prev => {
          if (prev) return prev; 
          
          if (availableVoices.length > 0) {
            const ptVoice = availableVoices.find(v => v.lang.startsWith('pt') || v.lang.startsWith('PT')) || availableVoices.find(v => v.default) || availableVoices[0];
            return ptVoice;
          }
          return null;
        });
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Extract HTML Elements when article or content changes
  useEffect(() => {
    if (!article) {
      chunksRef.current = [];
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (contentRef.current) {
        const parsedChunks = parseContentToElements(contentRef, article); 
        chunksRef.current = parsedChunks;
        currentChunkIndexRef.current = 0;
        console.log('[TTS] Article parsed -', parsedChunks.length, 'chunks ready');
      }
    }, 200); 
    
    return () => clearTimeout(timeoutId);
  }, [article, contentRef]);

  // Cleanup highlights when state changes to stopped or component unmounts
  useEffect(() => {
    if (state === 'stopped' || state === 'idle') {
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
      });
      activeSpansRef.current = [];
    }
    
    // Cleanup on unmount
    return () => {
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
      });
      activeSpansRef.current = [];
    };
  }, [state]);

  // --- TTS Controls ---

  // Speak next chunk
  const speakNextChunk = useCallback(() => {
    if (chunksRef.current.length === 0 || currentChunkIndexRef.current >= chunksRef.current.length) {
      console.log('[TTS] Finished all chunks - stopping');
      setState('stopped');
      setProgress(null);
      // Remove highlights when finished
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
      });
      activeSpansRef.current = [];
      return;
    }
    
    const chunkElement = chunksRef.current[currentChunkIndexRef.current];
    if (!chunkElement) {
      console.warn('[TTS] Invalid chunk at index', currentChunkIndexRef.current, '- skipping');
      currentChunkIndexRef.current++;
      speakNextChunk();
      return;
    }
    
    const { text } = chunkElement;
    
    console.log('[TTS] Speaking chunk', currentChunkIndexRef.current + 1, 'of', chunksRef.current.length, '- text preview:', text.substring(0, 50) + '...');
    
    // Remove highlight from previous spans
    activeSpansRef.current.forEach(span => {
      span.classList.remove('tts-active');
    });
    activeSpansRef.current = [];

    // Add highlight to current chunk spans
    if (chunkElement.spans.length > 0) {
      chunkElement.spans.forEach(span => {
        span.classList.add('tts-active');
        activeSpansRef.current.push(span);
      });

      // Scroll to first span of current chunk
      const firstSpan = chunkElement.spans[0];
      if (firstSpan && contentRef.current) {
        requestAnimationFrame(() => {
          firstSpan.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        });
      }
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    utterance.lang = options.lang || 'pt-BR';
    if (currentVoice) {
      utterance.voice = currentVoice;
      console.log('[TTS] Using voice:', currentVoice.name, '- lang:', currentVoice.lang);
    }
    
    // Event handlers
    utterance.onend = () => {
      console.log('[TTS] Chunk', currentChunkIndexRef.current + 1, 'finished');
      
      // Remove highlight from current spans before moving to next
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
      });
      activeSpansRef.current = [];
      
      if (!isPausedRef.current) {
        currentChunkIndexRef.current++;
        speakNextChunk();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event);
      setState('stopped');
      setProgress(null);
      // Remove highlights on error
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
      });
      activeSpansRef.current = [];
    };
    
    // Update progress
    setProgress({
      currentIndex: currentChunkIndexRef.current,
      totalChunks: chunksRef.current.length,
      currentText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      progress: (currentChunkIndexRef.current + 1) / chunksRef.current.length,
    });
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setState('playing');
    console.log('[TTS] Started speaking chunk', currentChunkIndexRef.current + 1);
  }, [options, currentVoice, contentRef]);

  const play = useCallback(() => {
    if (!isSupported || !article) {
      console.log('[TTS] Play called but not supported or no article');
      return;
    }
    
    if (utteranceRef.current) utteranceRef.current.onend = null;
      window.speechSynthesis.cancel();
    
    const wasPaused = isPausedRef.current;
      isPausedRef.current = false;
    
    if (!wasPaused) {
      currentChunkIndexRef.current = 0;
      console.log('[TTS] Starting playback from beginning');
    } else {
      console.log('[TTS] Resuming playback from chunk', currentChunkIndexRef.current + 1);
    }
    
    speakNextChunk();
  }, [isSupported, article, speakNextChunk]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    
    console.log('[TTS] Pausing at chunk', currentChunkIndexRef.current + 1);
    isPausedRef.current = true;
    
    if (utteranceRef.current) utteranceRef.current.onend = null;
    window.speechSynthesis.cancel();
    setState('paused');
    // Keep highlights visible when paused (don't remove them)
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    console.log('[TTS] Stopping playback');
    window.speechSynthesis.cancel();
    isPausedRef.current = false;
    currentChunkIndexRef.current = 0;
    setState('stopped');
    setProgress(null);
    // Remove highlights when stopping
    activeSpansRef.current.forEach(span => {
      span.classList.remove('tts-active');
    });
    activeSpansRef.current = [];
  }, [isSupported]);

  const setRateValue = useCallback((newRate: number) => {
    setRate(newRate);
    setOptionsState(prev => ({ ...prev, rate: newRate }));
    
    if (utteranceRef.current && state === 'playing') {
      utteranceRef.current.rate = newRate;
    }
  }, [state]);

  const setVoiceValue = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
    setOptionsState(prev => ({ ...prev, voiceURI: voice?.voiceURI }));
    
    if (utteranceRef.current && state === 'playing') {
      utteranceRef.current.voice = voice;
    }
  }, [state]);

  const setOptions = useCallback((newOptions: Partial<TTSOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
    
    if (utteranceRef.current && state === 'playing') {
      if (newOptions.rate !== undefined) {
        utteranceRef.current.rate = newOptions.rate;
        setRate(newOptions.rate);
      }
      if (newOptions.pitch !== undefined) {
        utteranceRef.current.pitch = newOptions.pitch;
      }
      if (newOptions.volume !== undefined) {
        utteranceRef.current.volume = newOptions.volume;
      }
    }
  }, [state]);

  return {
    state,
    isSupported,
    voices,
    currentVoice,
    rate,
    options,
    progress,
    play,
    pause,
    stop,
    setRate: setRateValue,
    setVoice: setVoiceValue,
    setOptions,
  };
}
