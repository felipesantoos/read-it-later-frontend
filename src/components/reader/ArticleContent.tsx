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
          linkText.textContent = `🔗 Imagem: ${imgSrc.length > 60 ? imgSrc.substring(0, 60) + '...' : imgSrc}`;
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

  // Process content to highlight text
  const processContentWithHighlights = (content: string, isHtmlContent: boolean, highlightsToProcess: Highlight[]): string => {
    if (!content || highlightsToProcess.length === 0) {
      return content;
    }

    // Sort highlights by text length (longest first) to avoid partial matches
    const sortedHighlights = [...highlightsToProcess].sort((a, b) => b.text.length - a.text.length);

    if (isHtmlContent) {
      // For HTML content, use DOM manipulation to avoid breaking HTML structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;

      // Process each highlight one by one, highlighting ALL occurrences of each
      for (const highlight of sortedHighlights) {
        const text = highlight.text.trim();
        if (!text) continue;

        const hasNotes = highlight.notes && highlight.notes.length > 0;
        const highlightColor = theme === 'dark' ? '#664d00' : theme === 'sepia' ? '#f0e68c' : '#fff3cd';
        const borderStyle = hasNotes ? `border-bottom: 2px solid ${theme === 'dark' ? '#ffc107' : '#ff9800'};` : '';

        // Find all text nodes (re-collect each time to account for DOM changes)
        const walker = document.createTreeWalker(
          tempDiv,
          NodeFilter.SHOW_TEXT,
          null
        );

        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          // Skip if already inside a mark element
          let parent = node.parentElement;
          let isInsideMark = false;
          while (parent && parent !== tempDiv) {
            if (parent.tagName === 'MARK' || parent.getAttribute('data-highlight-id')) {
              isInsideMark = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (!isInsideMark) {
            textNodes.push(node as Text);
          }
        }

        // Search for text across multiple text nodes (handles text split by HTML tags like links)
        let found = false;
        for (let i = 0; i < textNodes.length && !found; i++) {
            // Try to find text starting from this node, potentially spanning multiple nodes
            let accumulatedText = '';
            let startNodeIndex = i;
            let startOffset = -1;
            let endNodeIndex = -1;
            let endOffset = -1;

          // Build accumulated text from current node and following nodes
          for (let j = i; j < textNodes.length && !found; j++) {
            const currentNode = textNodes[j];
            const currentText = currentNode.textContent || '';
            accumulatedText += currentText;

            // Try exact match
            let searchIndex = accumulatedText.indexOf(text);
            
            // If not found, try case-insensitive
            if (searchIndex === -1) {
              const lowerText = text.toLowerCase();
              const lowerAccumulated = accumulatedText.toLowerCase();
              searchIndex = lowerAccumulated.indexOf(lowerText);
            }

            // If still not found, try normalized whitespace
            if (searchIndex === -1) {
              const normalizedText = text.replace(/\s+/g, ' ').trim();
              const normalizedAccumulated = accumulatedText.replace(/\s+/g, ' ');
              const normalizedIndex = normalizedAccumulated.indexOf(normalizedText);
              if (normalizedIndex !== -1) {
                // Map back to original position
                let actualPos = 0;
                let normalizedPos = 0;
                while (normalizedPos < normalizedIndex && actualPos < accumulatedText.length) {
                  if (/\s/.test(accumulatedText[actualPos])) {
                    while (actualPos < accumulatedText.length && /\s/.test(accumulatedText[actualPos])) {
                      actualPos++;
                    }
                    normalizedPos++;
                  } else {
                    actualPos++;
                    normalizedPos++;
                  }
                }
                searchIndex = actualPos;
              }
            }

            if (searchIndex !== -1) {
              // Found the text! Now determine which nodes it spans
              const endPos = searchIndex + text.length;
              
              // Find start node and offset
              let charCount = 0;
              for (let k = startNodeIndex; k <= j; k++) {
                const nodeText = textNodes[k].textContent || '';
                if (charCount + nodeText.length > searchIndex) {
                  startNodeIndex = k;
                  startOffset = searchIndex - charCount;
                  break;
                }
                charCount += nodeText.length;
              }

              // Find end node and offset
              charCount = 0;
              for (let k = startNodeIndex; k <= j; k++) {
                const nodeText = textNodes[k].textContent || '';
                if (charCount + nodeText.length >= endPos) {
                  endNodeIndex = k;
                  endOffset = endPos - charCount;
                  break;
                }
                charCount += nodeText.length;
              }

              // Get first node and parent for insertion
              const firstNode = textNodes[startNodeIndex];

              // Now wrap the text with mark element
              const mark = document.createElement('mark');
              mark.setAttribute('data-highlight-id', highlight.id);
              mark.setAttribute('data-has-notes', hasNotes ? 'true' : 'false');
              mark.style.backgroundColor = highlightColor;
              mark.style.padding = '0.1em 0';
              mark.style.borderRadius = '2px';
              mark.style.cursor = 'pointer';
              if (borderStyle) {
                mark.style.borderBottom = borderStyle;
              }

              const firstParent = firstNode.parentElement;
              
              // Build mark content first (in correct order)
              const markTextNodes: Text[] = [];
              for (let k = startNodeIndex; k <= endNodeIndex; k++) {
                const node = textNodes[k];
                const nodeText = node.textContent || '';
                
                if (k === startNodeIndex && k === endNodeIndex) {
                  const highlightText = nodeText.substring(startOffset, endOffset);
                  if (highlightText) {
                    markTextNodes.push(document.createTextNode(highlightText));
                  }
                } else if (k === startNodeIndex) {
                  const highlightText = nodeText.substring(startOffset);
                  if (highlightText) {
                    markTextNodes.push(document.createTextNode(highlightText));
                  }
                } else if (k === endNodeIndex) {
                  const highlightText = nodeText.substring(0, endOffset);
                  if (highlightText) {
                    markTextNodes.push(document.createTextNode(highlightText));
                  }
                } else {
                  if (nodeText) {
                    markTextNodes.push(document.createTextNode(nodeText));
                  }
                }
              }
              
              // Add all text nodes to mark
              markTextNodes.forEach(tn => mark.appendChild(tn));
              
              // Process nodes in reverse order (end to start) to safely remove and insert
              for (let k = endNodeIndex; k >= startNodeIndex; k--) {
                const node = textNodes[k];
                const nodeText = node.textContent || '';
                
                if (k === startNodeIndex && k === endNodeIndex) {
                  // Single node case
                  const beforeText = nodeText.substring(0, startOffset);
                  const afterText = nodeText.substring(endOffset);

                  if (afterText) {
                    firstParent?.insertBefore(document.createTextNode(afterText), node.nextSibling);
                  }

                  if (beforeText) {
                    firstParent?.insertBefore(document.createTextNode(beforeText), node);
                  }

                  firstParent?.insertBefore(mark, node);
                  node.remove();
                } else if (k === endNodeIndex) {
                  // Last node - add after text
                  const afterText = nodeText.substring(endOffset);
                  if (afterText) {
                    firstParent?.insertBefore(document.createTextNode(afterText), node.nextSibling);
                  }
                  node.remove();
                } else if (k === startNodeIndex) {
                  // First node - add before text and insert mark
                  const beforeText = nodeText.substring(0, startOffset);
                  if (beforeText) {
                    firstParent?.insertBefore(document.createTextNode(beforeText), node);
                  }
                  firstParent?.insertBefore(mark, node);
                  node.remove();
                } else {
                  // Middle node - just remove
                  node.remove();
                }
              }

              found = true;
              // Only highlight first occurrence to avoid infinite loops
              break;
            }

            // Stop if accumulated text is too long (performance optimization)
            if (accumulatedText.length > text.length * 10) {
              break;
            }
          }
        }
      }

      return tempDiv.innerHTML;
    } else {
      // For plain text, use DOM manipulation for consistency
      const tempDiv = document.createElement('div');
      tempDiv.textContent = content;

      sortedHighlights.forEach((highlight) => {
        const text = highlight.text.trim();
        if (!text) return;

        const hasNotes = highlight.notes && highlight.notes.length > 0;
        const highlightColor = theme === 'dark' ? '#664d00' : theme === 'sepia' ? '#f0e68c' : '#fff3cd';
        const borderStyle = hasNotes ? `border-bottom: 2px solid ${theme === 'dark' ? '#ffc107' : '#ff9800'};` : '';

        // Find text node and highlight ALL occurrences
        const textNode = tempDiv.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          const nodeText = textNode.textContent || '';
          let remainingText = nodeText;
          const fragments: Node[] = [];

          // Find all occurrences
          while (true) {
            const index = remainingText.indexOf(text);
            if (index === -1) break;

            // Add text before this occurrence
            if (index > 0) {
              fragments.push(document.createTextNode(remainingText.substring(0, index)));
            }

            // Create highlight mark for this occurrence
            const highlightSpan = document.createElement('mark');
            highlightSpan.setAttribute('data-highlight-id', highlight.id);
            highlightSpan.setAttribute('data-has-notes', hasNotes ? 'true' : 'false');
            highlightSpan.textContent = text;
            highlightSpan.style.backgroundColor = highlightColor;
            highlightSpan.style.padding = '0.1em 0';
            highlightSpan.style.borderRadius = '2px';
            highlightSpan.style.cursor = 'pointer';
            if (borderStyle) {
              highlightSpan.style.borderBottom = borderStyle;
            }
            fragments.push(highlightSpan);

            // Continue searching after this occurrence
            remainingText = remainingText.substring(index + text.length);
          }

          // Add remaining text after last occurrence
          if (remainingText) {
            fragments.push(document.createTextNode(remainingText));
          }

          // Replace the original text node with all fragments
          const parent = textNode.parentNode;
          if (parent && fragments.length > 0) {
            fragments.forEach(fragment => parent.insertBefore(fragment, textNode));
            textNode.remove();
          }
        }
      });

      return tempDiv.innerHTML;
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

      {processedContent ? (
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
                    link.textContent = '🔗 Ver imagem';
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

