import { MutableRefObject, useEffect, useMemo } from 'react';
import type { Article } from '../../api/articles';
import type { Highlight } from '../../api/highlights';
import { themeStyles } from '../../utils/themeStyles';
import type { Theme } from '../../utils/themeStyles';

interface ArticleContentProps {
  article: Article;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  theme: Theme;
  fontSize: number;
  lineHeight: number;
  highlights?: Highlight[];
}

/**
 * Check if content is HTML (contains HTML tags)
 */
function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtube.com/v/VIDEO_ID
 * - youtube.com/watch?v=VIDEO_ID&other=params
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  // Pattern 1: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([^&\s]+)/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  // Pattern 2: youtu.be/VIDEO_ID
  const shortMatch = url.match(/(?:youtu\.be\/)([^?&\s]+)/);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // Pattern 3: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/(?:youtube\.com\/embed\/)([^?&\s]+)/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  // Pattern 4: youtube.com/v/VIDEO_ID
  const vMatch = url.match(/(?:youtube\.com\/v\/)([^?&\s]+)/);
  if (vMatch && vMatch[1]) {
    return vMatch[1];
  }

  return null;
}

export default function ArticleContent({ article, contentRef, theme, fontSize, lineHeight, highlights = [] }: ArticleContentProps) {
  const currentTheme = themeStyles[theme];

  // Handle image errors after HTML is rendered
  useEffect(() => {
    if (!contentRef.current || !article.content) return;

    const images = contentRef.current.querySelectorAll('img');
    const errorHandlers: Array<{ img: HTMLImageElement; handler: () => void }> = [];

    images.forEach((img) => {
      const handler = () => {
        // Hide broken image
        img.style.display = 'none';
        
        // Show image link as fallback
        const imgSrc = img.src || img.getAttribute('src') || '';
        if (imgSrc && !imgSrc.startsWith('data:')) {
          const linkWrapper = document.createElement('div');
          linkWrapper.style.cssText = 'margin: 1rem 0; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; border-left: 3px solid #007bff;';
          
          const linkText = document.createElement('a');
          linkText.href = imgSrc;
          linkText.target = '_blank';
          linkText.rel = 'noopener noreferrer';
          linkText.textContent = `Imagem: ${imgSrc.length > 60 ? imgSrc.substring(0, 60) + '...' : imgSrc}`;
          linkText.style.cssText = 'color: #007bff; text-decoration: underline; word-break: break-all;';
          
          linkWrapper.appendChild(linkText);
          img.parentNode?.insertBefore(linkWrapper, img.nextSibling);
        }
      };

      img.addEventListener('error', handler);
      errorHandlers.push({ img, handler });
    });

    return () => {
      errorHandlers.forEach(({ img, handler }) => {
        img.removeEventListener('error', handler);
      });
    };
  }, [article.content, contentRef]);

  // Determine if content is HTML or plain text
  const isContentHtml = article.content ? isHtml(article.content) : false;

  // Helper to escape regex special chars
  const escapeRegExp = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Process content to highlight text
  const processContentWithHighlights = (content: string, isHtmlContent: boolean, highlightsToProcess: Highlight[]): string => {
    if (!content || highlightsToProcess.length === 0) {
      return content;
    }

    // Sort highlights by text length (longest first) to avoid partial matches
    const sortedHighlights = [...highlightsToProcess].sort(
      (a, b) => b.text.length - a.text.length
    );

    if (isHtmlContent) {
      // --- HTML CONTENT BRANCH (simplified, no heavy loops) ---
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      const walker = document.createTreeWalker(
        tempDiv,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const textNode = node as Text;
        const parentEl = textNode.parentElement;

        if (!parentEl) continue;

        // Skip text already inside a <mark> / highlighted element
        let p: HTMLElement | null = parentEl;
        let insideMark = false;
        while (p && p !== tempDiv) {
          if (p.tagName === 'MARK' || p.getAttribute('data-highlight-id')) {
            insideMark = true;
            break;
          }
          p = p.parentElement;
        }
        if (insideMark) continue;

        const originalText = textNode.textContent || '';
        if (!originalText.trim()) continue;

        // Collect all highlight matches with their positions
        interface HighlightMatch {
          start: number;
          end: number;
          highlight: Highlight;
          text: string;
        }

        const matches: HighlightMatch[] = [];

        // Find all matches for all highlights in the original text
        for (const highlight of sortedHighlights) {
          const rawText = (highlight.text || '').trim();
          if (!rawText) continue;

          // ⚠️ CRITICAL FIX: Normalize highlight text pattern for flexible whitespace matching
          // This allows the highlight to match even if the article text has varying spaces
          // or non-breaking spaces that were lost in the content extraction/serialization.
          // First escape regex special characters, then normalize whitespace patterns
          const normalizedPattern = escapeRegExp(rawText).replace(/\s+/g, '\\s+');
          
          if (!normalizedPattern) continue;

          // Find all occurrences using matchAll (more reliable than exec in loop)
          const regex = new RegExp(normalizedPattern, 'gi');
          const allMatches = Array.from(originalText.matchAll(regex));
          
          // Add all matches
          for (const match of allMatches) {
            if (match.index !== undefined) {
              matches.push({
                start: match.index,
                end: match.index + match[0].length,
                highlight: highlight,
                text: match[0]
              });
            }
          }
        }

        // If no matches, skip this node
        if (matches.length === 0) continue;

        // Sort matches by start position, then by length (longest first for overlapping ones)
        matches.sort((a, b) => {
          if (a.start !== b.start) return a.start - b.start;
          return b.end - a.end; // Longer matches first
        });

        // Remove overlapping matches - keep the first (which will be longest if same start)
        const nonOverlappingMatches: HighlightMatch[] = [];
        for (const current of matches) {
          let overlaps = false;

          // Check if this match overlaps with any already added
          for (const added of nonOverlappingMatches) {
            // Check for any overlap
            if (
              (current.start < added.end && current.end > added.start)
            ) {
              overlaps = true;
              break;
            }
          }

          if (!overlaps) {
            nonOverlappingMatches.push(current);
          }
        }

        // Build the replaced string from original text
        let replaced = '';
        let lastIndex = 0;

        for (const match of nonOverlappingMatches) {
          // Add text before this match
          if (match.start > lastIndex) {
            replaced += originalText.substring(lastIndex, match.start);
          }

          // Add the highlighted text
          const hasNotes = match.highlight.notes && match.highlight.notes.length > 0;
          const highlightColor =
            theme === 'dark'
              ? '#664d00'
              : theme === 'sepia'
              ? '#f0e68c'
              : '#fff3cd';
          const borderCss = hasNotes
            ? `border-bottom: 2px solid ${
                theme === 'dark' ? '#ffc107' : '#ff9800'
              };`
            : '';

          replaced += `<mark data-highlight-id="${match.highlight.id}"
                          data-has-notes="${hasNotes ? 'true' : 'false'}"
                          style="background-color:${highlightColor};padding:0.1em 0;border-radius:2px;cursor:pointer;${borderCss}">
                  ${match.text}
                </mark>`;

          lastIndex = match.end;
        }

        // Add remaining text after last match
        if (lastIndex < originalText.length) {
          replaced += originalText.substring(lastIndex);
        }

        // If nothing changed (shouldn't happen, but safety check)
        if (replaced === originalText) continue;

        // Replace this text node with a span containing the new HTML
        const span = document.createElement('span');
        span.innerHTML = replaced;

        parentEl.replaceChild(span, textNode);
        
        // 🟢 FIX: Reset the TreeWalker's current node to the newly inserted span.
        // The TreeWalker will now search for the next text node starting *after* this span.
        walker.currentNode = span;
      }

      return tempDiv.innerHTML;
    } else {
      // ✅ --- REFACTORED PLAIN TEXT BRANCH (multi-occurrence and multi-highlight fix) ---
      
      const originalText = content;

      // Collect all highlight matches with their positions (same logic as HTML branch)
      interface HighlightMatch {
        start: number;
        end: number;
        highlight: Highlight;
        text: string;
      }

      const matches: HighlightMatch[] = [];

      // Find all matches for all highlights in the original text
      for (const highlight of sortedHighlights) {
        const rawText = (highlight.text || '').trim();
        if (!rawText) continue;

        // ⚠️ CRITICAL FIX: Normalize highlight text pattern for flexible whitespace matching
        // This allows the highlight to match even if the text has varying spaces
        // First escape regex special characters, then normalize whitespace patterns
        const normalizedPattern = escapeRegExp(rawText).replace(/\s+/g, '\\s+');
        
        if (!normalizedPattern) continue;

        // Use global and case-insensitive matching
        const regex = new RegExp(normalizedPattern, 'gi'); 
        const allMatches = Array.from(originalText.matchAll(regex));
        
        // Add all matches
        for (const match of allMatches) {
          if (match.index !== undefined) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              highlight: highlight,
              text: match[0] // Preserve matched text case
            });
          }
        }
      }

      if (matches.length === 0) {
        return content; // No matches found
      }

      // Sort matches by start position, then by length (longest first for overlapping ones)
      matches.sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return b.end - a.end; 
      });

      // Remove overlapping matches - keep the first (which will be longest if same start)
      const nonOverlappingMatches: HighlightMatch[] = [];
      for (const current of matches) {
        let overlaps = false;

        // Check if this match overlaps with any already added
        for (const added of nonOverlappingMatches) {
          // Check for any overlap
          if (
            (current.start < added.end && current.end > added.start)
          ) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          nonOverlappingMatches.push(current);
        }
      }

      // Build the final highlighted string
      let replaced = '';
      let lastIndex = 0;

      for (const match of nonOverlappingMatches) {
        // Add text before this match
        if (match.start > lastIndex) {
          replaced += originalText.substring(lastIndex, match.start);
        }

        // Add the highlighted text (HTML string)
        const hasNotes = match.highlight.notes && match.highlight.notes.length > 0;
        const highlightColor =
          theme === 'dark'
            ? '#664d00'
            : theme === 'sepia'
            ? '#f0e68c'
            : '#fff3cd';
        const borderCss = hasNotes
          ? `border-bottom: 2px solid ${
              theme === 'dark' ? '#ffc107' : '#ff9800'
            };`
          : '';

        replaced += `<mark data-highlight-id="${match.highlight.id}"
                        data-has-notes="${hasNotes ? 'true' : 'false'}"
                        style="background-color:${highlightColor};padding:0.1em 0;border-radius:2px;cursor:pointer;${borderCss}">
                ${match.text}
              </mark>`;

        lastIndex = match.end;
      }

      // Add remaining text after last match
      if (lastIndex < originalText.length) {
        replaced += originalText.substring(lastIndex);
      }

      return replaced;
    }
  };

  // Get processed content - recalculate when highlights or content changes
  // Use a key that changes when highlights change to force recalculation
  const highlightsKey = useMemo(() => {
    return highlights.length > 0 
      ? highlights.map(h => `${h.id}-${h.text.substring(0, 20)}-${(h.notes?.length || 0)}-${h.updatedAt || h.createdAt}`).join('|')
      : 'no-highlights';
  }, [highlights]);
  
  const processedContent = useMemo(() => {
    if (!article.content) return null;
    // Always process from original content to avoid double-processing
    // Force recalculation when highlights change
    const result = processContentWithHighlights(article.content, isContentHtml, highlights);
    return result;
  }, [article.content, highlightsKey, theme, isContentHtml, highlights]);

  // Extract YouTube video ID if this is a YouTube article
  const youtubeVideoId = useMemo(() => {
    if (article.contentType === 'YOUTUBE') {
      return extractYouTubeVideoId(article.url);
    }
    return null;
  }, [article.contentType, article.url]);

  return (
    <div
      ref={contentRef}
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
        padding: '1.5rem',
        borderRadius: '6px',
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        height: '100%',
        overflowY: 'auto',
        fontFamily: 'Georgia, serif',
      }}
      className="article-content"
    >
      {/* Article Title and Description */}
      <div style={{ 
        marginBottom: '2rem'
      }}>
        <h1 style={{ 
          fontSize: `${fontSize * 1.5}px`, 
          fontWeight: 600, 
          marginBottom: '0.75rem', 
          lineHeight: 1.3, 
          color: currentTheme.text 
        }}>
          {article.title || article.url}
        </h1>
        {article.description && (
          <p style={{ 
            fontSize: `${fontSize * 0.9}px`, 
            color: currentTheme.secondaryText, 
            marginBottom: 0,
            lineHeight: lineHeight
          }}>
            {article.description}
          </p>
        )}
      </div>

      {/* YouTube Video Embed */}
      {article.contentType === 'YOUTUBE' && youtubeVideoId ? (
        <div style={{
          marginBottom: '2rem',
          width: '100%',
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%', // 16:9 aspect ratio
            height: 0,
            overflow: 'hidden',
            borderRadius: '8px',
            boxShadow: `0 4px 12px ${currentTheme.separator}`,
          }}>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?modestbranding=1&rel=0`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={article.title || 'YouTube Video'}
            />
          </div>
        </div>
      ) : article.contentType === 'YOUTUBE' && !youtubeVideoId ? (
        <div>
          <p>Não foi possível extrair o ID do vídeo. <a href={article.url} target="_blank" rel="noopener noreferrer">Abrir original</a></p>
        </div>
      ) : processedContent ? (
        isContentHtml ? (
          <div
            key={highlightsKey}
            dangerouslySetInnerHTML={{ 
              __html: processedContent
            }}
            style={{
              maxWidth: '100%',
            }}
          />
        ) : (
          <div 
            key={highlightsKey}
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ 
              __html: processedContent
            }}
          />
        )
      ) : (
        <div>
          <p>Conteúdo não disponível. <a href={article.url} target="_blank" rel="noopener noreferrer">Abrir original</a></p>
        </div>
      )}

      {/* Show images from attributes if available and not already in content */}
      {article.attributes?.images && Array.isArray(article.attributes.images) && article.attributes.images.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: `1px solid ${currentTheme.separator}` }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
            Imagens do Artigo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {article.attributes.images.map((imageUrl: string, index: number) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={imageUrl}
                  alt={`Imagem ${index + 1} do artigo`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = 'none';
                    // Show link as fallback
                    const linkWrapper = document.createElement('div');
                    linkWrapper.style.cssText = 'padding: 0.5rem; background: #f5f5f5; border-radius: 4px;';
                    const link = document.createElement('a');
                    link.href = imageUrl;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = 'Ver imagem';
                    link.style.cssText = 'color: #007bff; text-decoration: underline; word-break: break-all; font-size: 0.875rem;';
                    linkWrapper.appendChild(link);
                    img.parentNode?.insertBefore(linkWrapper, img);
                  }}
                  onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

