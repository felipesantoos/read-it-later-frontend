import { MutableRefObject, useEffect } from 'react';
import type { Article } from '../../api/articles';
import { themeStyles } from '../../utils/themeStyles';
import type { Theme } from '../../utils/themeStyles';

interface ArticleContentProps {
  article: Article;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  theme: Theme;
  fontSize: number;
  lineHeight: number;
}

/**
 * Check if content is HTML (contains HTML tags)
 */
function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export default function ArticleContent({ article, contentRef, theme, fontSize, lineHeight }: ArticleContentProps) {
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

      {article.content ? (
        isContentHtml ? (
          <div
            dangerouslySetInnerHTML={{ __html: article.content }}
            style={{
              maxWidth: '100%',
            }}
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>{article.content}</div>
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

