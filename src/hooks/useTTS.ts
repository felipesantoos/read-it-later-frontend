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
  spanIds: string[]; // Array of span IDs (ritl-w-*) - stored as IDs to avoid stale DOM references
  chunkIndex: number;
  domElement?: HTMLElement; // Keep for backward compatibility/fallback
}

/**
 * Helper function to get span elements by their IDs from the current DOM.
 * Re-queries the DOM each time to ensure we get valid references even after DOM changes (e.g., highlights).
 */
function getSpansByIds(contentRef: MutableRefObject<HTMLDivElement | null>, spanIds: string[]): HTMLElement[] {
  console.log('[TTS] getSpansByIds called with', spanIds.length, 'spanIds');
  if (!contentRef.current) {
    console.warn('[TTS] getSpansByIds: contentRef.current is null');
    return [];
  }
  if (spanIds.length === 0) {
    console.warn('[TTS] getSpansByIds: spanIds array is empty');
    return [];
  }
  
  const spans: HTMLElement[] = [];
  let foundCount = 0;
  let notFoundIds: string[] = [];
  
  for (const spanId of spanIds) {
    // Try to find span by ID - it might be inside a mark element (highlight) or directly in the DOM
    // Use document.getElementById as fallback if querySelector doesn't find it in contentRef
    let span = contentRef.current.querySelector(`#${spanId}`) as HTMLElement;
    if (!span) {
      // Fallback: try document.getElementById and check if it's within contentRef
      const docSpan = document.getElementById(spanId);
      if (docSpan && contentRef.current.contains(docSpan)) {
        span = docSpan as HTMLElement;
        console.log('[TTS] getSpansByIds: Found span', spanId, 'via document.getElementById');
      } else {
        console.warn('[TTS] getSpansByIds: Could not find span', spanId);
        notFoundIds.push(spanId);
      }
    } else {
      foundCount++;
    }
    
    if (span && span.id && span.id.startsWith('ritl-w-')) {
      spans.push(span);
    } else if (span) {
      console.warn('[TTS] getSpansByIds: Found element but ID does not match:', span.id, 'expected:', spanId);
    }
  }
  
  console.log('[TTS] getSpansByIds: Found', foundCount, 'out of', spanIds.length, 'spans. Not found:', notFoundIds.slice(0, 5), notFoundIds.length > 5 ? '...' : '');
  return spans;
}

/**
 * Parse content from DOM and create array of chunks based on spans with IDs (ritl-w-*).
 * Groups spans into sentence-like chunks for natural reading.
 */
function parseContentToElements(contentRef: MutableRefObject<HTMLDivElement | null>, article: Article | null): TTSChunkElement[] {
  if (!contentRef.current || !article) return [];
  
  // Try to find spans with IDs first
  const allSpans = Array.from(contentRef.current.querySelectorAll('[id^="ritl-w-"]')) as HTMLElement[];
  console.log('[TTS] parseContentToElements: Found', allSpans.length, 'spans with ritl-w- IDs');
  
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
  
  console.log('[TTS] parseContentToElements: First span ID:', allSpans[0]?.id, 'Last span ID:', allSpans[allSpans.length - 1]?.id);
  
  const chunks: TTSChunkElement[] = [];
  let currentChunkSpanIds: string[] = [];
  let currentChunkText: string[] = [];
  let globalChunkIndex = 0;
  
  // Group spans into sentence-like chunks
  // A chunk ends at sentence-ending punctuation (. ! ?) or at a reasonable length
  const sentenceEndRegex = /[.!?。！？]\s*$/;
  const maxChunkLength = 200; // Maximum characters per chunk
  
  for (let i = 0; i < allSpans.length; i++) {
    const span = allSpans[i];
    const spanText = span.textContent || '';
    const spanId = span.id;
    
    // Store the ID instead of the DOM reference
    if (spanId && spanId.startsWith('ritl-w-')) {
      currentChunkSpanIds.push(spanId);
    }
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
      
      if (chunkText.length > 0 && currentChunkSpanIds.length > 0) {
        chunks.push({
          text: chunkText,
          spanIds: [...currentChunkSpanIds],
          chunkIndex: globalChunkIndex++,
        });
        if (globalChunkIndex <= 3) {
          console.log('[TTS] parseContentToElements: Created chunk', globalChunkIndex - 1, 'with', currentChunkSpanIds.length, 'spans. First IDs:', currentChunkSpanIds.slice(0, 3), '...');
        }
      }
      
      currentChunkSpanIds = [];
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
      spanIds: [], // No spans available in fallback mode
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

  // Monitor and reapply styles if they get removed (e.g., by React re-renders)
  useEffect(() => {
    if (state !== 'playing') return;

    const checkAndReapplyStyles = () => {
      if (activeSpansRef.current.length === 0) {
        // If no active spans but we're playing, try to get current chunk spans
        const currentChunk = chunksRef.current[currentChunkIndexRef.current];
        if (currentChunk && currentChunk.spanIds.length > 0) {
          const currentSpans = getSpansByIds(contentRef, currentChunk.spanIds);
          if (currentSpans.length > 0) {
            console.log('[TTS] useEffect: Found', currentSpans.length, 'spans for current chunk, applying styles');
            currentSpans.forEach((span) => {
              span.classList.add('tts-active');
              span.style.setProperty('background-color', 'rgba(0, 123, 255, 0.35)', 'important');
              span.style.setProperty('box-shadow', '0 0 0 1px rgba(0, 123, 255, 0.2)', 'important');
              activeSpansRef.current.push(span);
            });
          }
        }
        return;
      }

      activeSpansRef.current.forEach((span, index) => {
        // Check if the span still exists and has the class
        if (!span.isConnected) {
          // Span was removed from DOM, try to find it again by ID
          const spanId = span.id;
          if (spanId && contentRef.current) {
            const foundSpan = contentRef.current.querySelector(`#${spanId}`) as HTMLElement;
            if (foundSpan) {
              activeSpansRef.current[index] = foundSpan;
              span = foundSpan;
            } else {
              return; // Span not found, skip
            }
          } else {
            return; // No ID, skip
          }
        }

        // Reapply class if missing
        if (!span.classList.contains('tts-active')) {
          span.classList.add('tts-active');
        }

        // Reapply styles if missing or incorrect
        const computedBg = window.getComputedStyle(span).backgroundColor;
        
        // Check if background color is not what we expect (transparent or different)
        if (computedBg === 'rgba(0, 0, 0, 0)' || computedBg === 'transparent' || 
            (!computedBg.includes('0, 123, 255') && state === 'playing')) {
          console.log('[TTS] Reapplying styles to span', span.id, 'computed:', computedBg);
          span.style.setProperty('background-color', 'rgba(0, 123, 255, 0.35)', 'important');
          span.style.setProperty('box-shadow', '0 0 0 1px rgba(0, 123, 255, 0.2)', 'important');
        }
      });
    };

    // Check immediately (important for first chunk) and then periodically
    requestAnimationFrame(() => {
      checkAndReapplyStyles();
    });
    const interval = setInterval(checkAndReapplyStyles, 100); // Check every 100ms

    return () => {
      clearInterval(interval);
    };
  }, [state, contentRef, progress?.currentIndex]);

  // Cleanup highlights when state changes to stopped or component unmounts
  useEffect(() => {
    if (state === 'stopped' || state === 'idle') {
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
        // Restore original styles if they were saved
        const originalStyle = span.getAttribute('data-tts-original-style');
        if (originalStyle !== null) {
          if (originalStyle) {
            span.setAttribute('style', originalStyle);
          } else {
            span.removeAttribute('style');
          }
          span.removeAttribute('data-tts-original-style');
          span.removeAttribute('data-tts-original-bg');
        } else {
          // Fallback: just remove the properties we added
          span.style.removeProperty('background-color');
          span.style.removeProperty('box-shadow');
        }
      });
      activeSpansRef.current = [];
    }
    
    // Cleanup on unmount
    return () => {
      activeSpansRef.current.forEach(span => {
        span.classList.remove('tts-active');
        // Restore original styles if they were saved
        const originalStyle = span.getAttribute('data-tts-original-style');
        if (originalStyle !== null) {
          if (originalStyle) {
            span.setAttribute('style', originalStyle);
          } else {
            span.removeAttribute('style');
          }
          span.removeAttribute('data-tts-original-style');
          span.removeAttribute('data-tts-original-bg');
        } else {
          // Fallback: just remove the properties we added
          span.style.removeProperty('background-color');
          span.style.removeProperty('box-shadow');
        }
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
        // Restore original styles if they were saved
        const originalStyle = span.getAttribute('data-tts-original-style');
        if (originalStyle !== null) {
          if (originalStyle) {
            span.setAttribute('style', originalStyle);
          } else {
            span.removeAttribute('style');
          }
          span.removeAttribute('data-tts-original-style');
          span.removeAttribute('data-tts-original-bg');
        } else {
          // Fallback: just remove the properties we added
          span.style.removeProperty('background-color');
          span.style.removeProperty('box-shadow');
        }
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
      // Restore original styles if they were saved
      const originalStyle = span.getAttribute('data-tts-original-style');
      if (originalStyle !== null) {
        if (originalStyle) {
          span.setAttribute('style', originalStyle);
        } else {
          span.removeAttribute('style');
        }
        span.removeAttribute('data-tts-original-style');
        span.removeAttribute('data-tts-original-bg');
      } else {
        // Fallback: just remove the properties we added
        span.style.removeProperty('background-color');
        span.style.removeProperty('box-shadow');
      }
    });
    activeSpansRef.current = [];

    // Get current chunk spans by their IDs (re-query DOM to ensure valid references)
    console.log('[TTS] speakNextChunk: Chunk', currentChunkIndexRef.current, 'has', chunkElement.spanIds.length, 'spanIds');
    if (chunkElement.spanIds.length > 0) {
      console.log('[TTS] speakNextChunk: First 5 spanIds:', chunkElement.spanIds.slice(0, 5));
      const currentSpans = getSpansByIds(contentRef, chunkElement.spanIds);
      console.log('[TTS] speakNextChunk: Retrieved', currentSpans.length, 'spans from DOM');
      
      if (currentSpans.length > 0) {
        console.log('[TTS] speakNextChunk: Adding tts-active class to', currentSpans.length, 'spans');
        
        // Apply styles using requestAnimationFrame to ensure DOM is ready
        const applyStyles = () => {
          // Add highlight to current chunk spans
          currentSpans.forEach((span, index) => {
            span.classList.add('tts-active');
            // Also add inline style to ensure visibility even if CSS is overridden
            // Save original styles before modifying
            const originalBgColor = span.style.backgroundColor || '';
            const originalStyle = span.getAttribute('style') || '';
            
            // Set inline style with !important using setProperty
            span.style.setProperty('background-color', 'rgba(0, 123, 255, 0.35)', 'important');
            span.style.setProperty('box-shadow', '0 0 0 1px rgba(0, 123, 255, 0.2)', 'important');
            
            // Store original values for restoration
            span.setAttribute('data-tts-original-bg', originalBgColor);
            span.setAttribute('data-tts-original-style', originalStyle);
            
            activeSpansRef.current.push(span);
            if (index < 3) {
              const computed = window.getComputedStyle(span);
              console.log('[TTS] speakNextChunk: Added tts-active to span', span.id, 
                'classList:', Array.from(span.classList), 
                'inline style:', span.style.backgroundColor,
                'computed bg:', computed.backgroundColor,
                'computed boxShadow:', computed.boxShadow);
            }
          });
          console.log('[TTS] speakNextChunk: Total active spans:', activeSpansRef.current.length);

          // Verify styles were applied (especially important for first chunk)
          requestAnimationFrame(() => {
            currentSpans.forEach((span) => {
              const computed = window.getComputedStyle(span);
              if (computed.backgroundColor === 'rgba(0, 0, 0, 0)' || computed.backgroundColor === 'transparent') {
                console.log('[TTS] speakNextChunk: Reapplying styles to span', span.id, 'computed:', computed.backgroundColor);
                span.style.setProperty('background-color', 'rgba(0, 123, 255, 0.35)', 'important');
                span.style.setProperty('box-shadow', '0 0 0 1px rgba(0, 123, 255, 0.2)', 'important');
              }
            });
          });
        };

        // Apply styles immediately and also in next frame to ensure they stick
        applyStyles();
        requestAnimationFrame(applyStyles);

        // Scroll to first span of current chunk
        const firstSpan = currentSpans[0];
        if (firstSpan) {
          console.log('[TTS] speakNextChunk: Scrolling to first span', firstSpan.id);
          requestAnimationFrame(() => {
            firstSpan.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          });
        }
      } else {
        console.warn('[TTS] speakNextChunk: Could not find ANY spans for chunk', currentChunkIndexRef.current);
        console.warn('[TTS] speakNextChunk: spanIds were:', chunkElement.spanIds.slice(0, 10));
        console.warn('[TTS] speakNextChunk: contentRef.current exists?', !!contentRef.current);
        if (contentRef.current) {
          const allSpansInContent = contentRef.current.querySelectorAll('[id^="ritl-w-"]');
          console.warn('[TTS] speakNextChunk: Total spans in contentRef:', allSpansInContent.length);
          if (allSpansInContent.length > 0) {
            const firstSpanInContent = allSpansInContent[0] as HTMLElement;
            console.warn('[TTS] speakNextChunk: First span in contentRef:', firstSpanInContent.id);
          }
        }
      }
    } else {
      console.warn('[TTS] speakNextChunk: Chunk has no spanIds!');
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
        // Restore original styles if they were saved
        const originalStyle = span.getAttribute('data-tts-original-style');
        if (originalStyle !== null) {
          if (originalStyle) {
            span.setAttribute('style', originalStyle);
          } else {
            span.removeAttribute('style');
          }
          span.removeAttribute('data-tts-original-style');
          span.removeAttribute('data-tts-original-bg');
        } else {
          // Fallback: just remove the properties we added
          span.style.removeProperty('background-color');
          span.style.removeProperty('box-shadow');
        }
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
        // Restore original styles if they were saved
        const originalStyle = span.getAttribute('data-tts-original-style');
        if (originalStyle !== null) {
          if (originalStyle) {
            span.setAttribute('style', originalStyle);
          } else {
            span.removeAttribute('style');
          }
          span.removeAttribute('data-tts-original-style');
          span.removeAttribute('data-tts-original-bg');
        } else {
          // Fallback: just remove the properties we added
          span.style.removeProperty('background-color');
          span.style.removeProperty('box-shadow');
        }
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
    
    // Set state to 'playing' BEFORE starting speech to ensure useEffect triggers
    setState('playing');
    
    // Use requestAnimationFrame to ensure DOM updates are complete before starting speech
    requestAnimationFrame(() => {
      window.speechSynthesis.speak(utterance);
      console.log('[TTS] Started speaking chunk', currentChunkIndexRef.current + 1);
    });
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
      // Restore original styles if they were saved
      const originalStyle = span.getAttribute('data-tts-original-style');
      if (originalStyle !== null) {
        if (originalStyle) {
          span.setAttribute('style', originalStyle);
        } else {
          span.removeAttribute('style');
        }
        span.removeAttribute('data-tts-original-style');
        span.removeAttribute('data-tts-original-bg');
      } else {
        // Fallback: just remove the properties we added
        span.style.removeProperty('background-color');
        span.style.removeProperty('box-shadow');
      }
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
