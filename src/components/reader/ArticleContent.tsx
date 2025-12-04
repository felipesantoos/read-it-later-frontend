import { MutableRefObject } from 'react';
import type { Article } from '../../api/articles';

interface ArticleContentProps {
  article: Article;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
}

const themeStyles = {
  light: { bg: '#fff', text: '#333' },
  dark: { bg: '#1a1a1a', text: '#e0e0e0' },
  sepia: { bg: '#f4ecd8', text: '#5c4b37' },
};

export default function ArticleContent({ article, contentRef, theme, fontSize, lineHeight }: ArticleContentProps) {
  const currentTheme = themeStyles[theme];

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
    >
      {article.content ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>{article.content}</div>
      ) : (
        <div>
          <p>Conteúdo não disponível. <a href={article.url} target="_blank" rel="noopener noreferrer">Abrir original</a></p>
        </div>
      )}
    </div>
  );
}

