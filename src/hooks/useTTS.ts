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
 * Extract clean text from HTML content
 */
function extractTextFromHTML(html: string): string {
  if (!html) return '';
  
  // Check if it's HTML
  const isHTML = /<[a-z][\s\S]*>/i.test(html);
  
  if (!isHTML) {
    return html.trim();
  }
  
  // Create temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script and style elements
  const scripts = tempDiv.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());
  
  // Get text content
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newline
    .trim();
  
  return text;
}

/**
 * Split text into chunks (sentences or phrases) for better control
 */
function splitTextIntoChunks(text: string): string[] {
  if (!text) return [];
  
  // Split by sentence endings, but keep them
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // If no sentence endings found, split by paragraphs
  if (sentences.length === 0) {
    return text.split(/\n\n+/).filter(chunk => chunk.trim().length > 0);
  }
  
  // Combine very short sentences
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length === 0) continue;
    
    if (currentChunk.length + trimmed.length < 200) {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = trimmed;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.length > 0 ? chunks : [text];
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
  
  const chunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPausedRef = useRef(false);
  const highlightTimeoutRef = useRef<number | null>(null);

  // Check browser support
  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);
    
    if (supported) {
      // Load voices (may need to wait for voiceschanged event)
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Try to find a Portuguese voice by default (only if not already set)
        setCurrentVoice(prev => {
          if (prev) return prev; // Don't change if already set
          
          if (availableVoices.length > 0) {
            const ptVoice = availableVoices.find(
              v => v.lang.startsWith('pt') || v.lang.startsWith('PT')
            ) || availableVoices.find(v => v.default) || availableVoices[0];
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
  }, []); // Empty deps - only run once on mount

  // Extract and prepare text when article changes
  useEffect(() => {
    if (!article) {
      chunksRef.current = [];
      return;
    }
    
    // Combine title, description, and content
    let fullText = '';
    
    if (article.title) {
      fullText += article.title + '. ';
    }
    
    if (article.description) {
      fullText += article.description + '. ';
    }
    
    if (article.content) {
      const cleanContent = extractTextFromHTML(article.content);
      fullText += cleanContent;
    }
    
    // Split into chunks
    chunksRef.current = splitTextIntoChunks(fullText.trim());
    currentChunkIndexRef.current = 0;
  }, [article]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Highlight current text being read
  const highlightCurrentText = useCallback((text: string) => {
    if (!contentRef.current || !text) return;
    
    // Clear previous highlight
    const previousHighlights = contentRef.current.querySelectorAll('.tts-highlight');
    previousHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    
    // Normalize text for comparison (remove extra whitespace)
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    const searchText = normalizedText.substring(0, Math.min(100, normalizedText.length));
    
    // Find and highlight the text using a more robust approach
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside script, style, or already highlighted elements
          let parent = node.parentElement;
          while (parent && parent !== contentRef.current) {
            if (
              parent.tagName === 'SCRIPT' ||
              parent.tagName === 'STYLE' ||
              parent.classList.contains('tts-highlight')
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node: Node | null;
    let found = false;
    
    while ((node = walker.nextNode()) && !found) {
      const textNode = node as Text;
      const nodeText = textNode.textContent || '';
      const normalizedNodeText = nodeText.replace(/\s+/g, ' ');
      
      // Try to find the text in this node (case-insensitive)
      const index = normalizedNodeText.toLowerCase().indexOf(searchText.toLowerCase());
      if (index !== -1) {
        try {
          // Calculate the actual offset in the original text node
          let actualOffset = 0;
          let normalizedOffset = 0;
          
          // Find the actual character offset that corresponds to the normalized index
          for (let i = 0; i < nodeText.length && normalizedOffset < index; i++) {
            if (nodeText[i].match(/\s/)) {
              // Skip whitespace in normalized text
              if (normalizedNodeText[normalizedOffset]?.match(/\s/)) {
                normalizedOffset++;
              }
            } else {
              actualOffset++;
              normalizedOffset++;
            }
          }
          
          const range = document.createRange();
          const startOffset = actualOffset;
          const endOffset = Math.min(actualOffset + searchText.length, nodeText.length);
          
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, endOffset);
          
          // Check if range is valid
          if (range.collapsed) {
            continue;
          }
          
          const span = document.createElement('span');
          span.className = 'tts-highlight';
          span.style.cssText = 'background-color: rgba(255, 200, 0, 0.5); padding: 2px 0; border-radius: 2px; transition: background-color 0.2s;';
          
          try {
            range.surroundContents(span);
            found = true;
            
            // Scroll to highlight with a slight delay for smooth animation
            setTimeout(() => {
              span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }, 100);
          } catch (e) {
            // If surroundContents fails, try extractContents approach
            try {
              const contents = range.extractContents();
              span.appendChild(contents);
              range.insertNode(span);
              found = true;
              
              setTimeout(() => {
                span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              }, 100);
            } catch (e2) {
              console.warn('Could not highlight text:', e2);
            }
          }
        } catch (e) {
          console.warn('Could not highlight text:', e);
        }
      }
    }
    
    // If we couldn't find the exact text, try a simpler approach: highlight first visible paragraph
    if (!found && contentRef.current) {
      const paragraphs = contentRef.current.querySelectorAll('p, div, span');
      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const pText = p.textContent || '';
        if (pText.toLowerCase().includes(searchText.toLowerCase().substring(0, 30))) {
          p.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }
  }, [contentRef]);

  // Speak next chunk
  const speakNextChunk = useCallback(() => {
    if (chunksRef.current.length === 0) {
      setState('stopped');
      setProgress(null);
      return;
    }
    
    if (currentChunkIndexRef.current >= chunksRef.current.length) {
      setState('stopped');
      setProgress(null);
      
      // Clear highlight
      if (contentRef.current) {
        const highlights = contentRef.current.querySelectorAll('.tts-highlight');
        highlights.forEach(el => {
          el.classList.remove('tts-highlight');
          el.removeAttribute('style');
        });
      }
      
      return;
    }
    
    const chunk = chunksRef.current[currentChunkIndexRef.current];
    if (!chunk) {
      speakNextChunk();
      return;
    }
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;
    utterance.lang = options.lang || 'pt-BR';
    
    if (currentVoice) {
      utterance.voice = currentVoice;
    }
    
    // Update progress
    setProgress({
      currentIndex: currentChunkIndexRef.current,
      totalChunks: chunksRef.current.length,
      currentText: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''),
      progress: (currentChunkIndexRef.current + 1) / chunksRef.current.length,
    });
    
    // Highlight current chunk
    highlightCurrentText(chunk);
    
    // Event handlers
    utterance.onend = () => {
      // Only process if not paused (paused utterances should not increment index)
      if (!isPausedRef.current) {
        currentChunkIndexRef.current++;
        speakNextChunk();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('TTS Error:', event);
      setState('stopped');
      setProgress(null);
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setState('playing');
  }, [options, currentVoice, highlightCurrentText]);

  const play = useCallback(() => {
    if (!isSupported || !article) return;
    
    // Clear the onend handler before canceling to prevent index increment
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
    }
    
    // Always cancel any existing utterance before starting/resuming
    window.speechSynthesis.cancel();
    
    // Check if we're resuming from pause using the ref (more reliable than state)
    const wasPaused = isPausedRef.current;
    isPausedRef.current = false;
    
    if (wasPaused) {
      // Resume from where we paused (currentChunkIndexRef already has the right position)
      setState('playing');
      speakNextChunk();
    } else {
      // Start from beginning
      currentChunkIndexRef.current = 0;
      speakNextChunk();
    }
  }, [isSupported, article, speakNextChunk]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    
    // Set paused flag FIRST to prevent onend from incrementing index
    isPausedRef.current = true;
    
    // Clear the onend handler before canceling to prevent index increment
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
    }
    
    // Cancel current utterance instead of pausing
    // speechSynthesis.pause() is unreliable across browsers
    window.speechSynthesis.cancel();
    setState('paused');
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    window.speechSynthesis.cancel();
    isPausedRef.current = false;
    currentChunkIndexRef.current = 0;
    setState('stopped');
    setProgress(null);
    
    // Clear highlight
    if (contentRef.current) {
      const highlights = contentRef.current.querySelectorAll('.tts-highlight');
      highlights.forEach(el => {
        el.classList.remove('tts-highlight');
        el.removeAttribute('style');
      });
    }
  }, [isSupported]);

  const setRateValue = useCallback((newRate: number) => {
    setRate(newRate);
    setOptionsState(prev => ({ ...prev, rate: newRate }));
    
    // Update current utterance if playing
    if (utteranceRef.current && state === 'playing') {
      utteranceRef.current.rate = newRate;
    }
  }, [state]);

  const setVoiceValue = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
    setOptionsState(prev => ({ ...prev, voiceURI: voice?.voiceURI }));
    
    // Update current utterance if playing
    if (utteranceRef.current && state === 'playing') {
      utteranceRef.current.voice = voice;
    }
  }, [state]);

  const setOptions = useCallback((newOptions: Partial<TTSOptions>) => {
    setOptionsState(prev => ({ ...prev, ...newOptions }));
    
    // Update current utterance if playing
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
      if (newOptions.voiceURI !== undefined && currentVoice) {
        utteranceRef.current.voice = currentVoice;
      }
    }
  }, [state, currentVoice]);

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

