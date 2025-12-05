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
  domElement: HTMLElement;
  chunkIndex: number; 
}

/**
 * Parse content from DOM and create array of elements with direct DOM references.
 * Uses a nesting check to ensure only top-level block elements are chosen as chunks.
 */
function parseContentToElements(contentRef: MutableRefObject<HTMLDivElement | null>, article: Article | null): TTSChunkElement[] {
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
      domElement: htmlElement,
      chunkIndex: globalChunkIndex++,
    });
    
    // Mark all children as processed to avoid double-reading nested elements
    htmlElement.querySelectorAll(textElementSelector).forEach(child => processedElements.add(child as HTMLElement));
  });
  
  console.log('[TTS] Parsed', elements.length, 'HTML element chunks from DOM');
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

  // --- TTS Controls ---

  // Speak next chunk
  const speakNextChunk = useCallback(() => {
    if (chunksRef.current.length === 0 || currentChunkIndexRef.current >= chunksRef.current.length) {
      console.log('[TTS] Finished all chunks - stopping');
      setState('stopped');
      setProgress(null);
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
      
      if (!isPausedRef.current) {
        currentChunkIndexRef.current++;
        speakNextChunk();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('[TTS] Error:', event);
      setState('stopped');
      setProgress(null);
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
  }, [options, currentVoice]);

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
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    console.log('[TTS] Stopping playback');
    window.speechSynthesis.cancel();
    isPausedRef.current = false;
    currentChunkIndexRef.current = 0;
    setState('stopped');
    setProgress(null);
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
