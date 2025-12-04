import { useNavigate } from 'react-router-dom';
import type { Article } from '../../api/articles';

interface ReaderHeaderProps {
  article: Article;
  theme: 'light' | 'dark' | 'sepia';
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
}

export default function ReaderHeader({ article, theme, onThemeChange }: ReaderHeaderProps) {
  const navigate = useNavigate();

  const cycleTheme = () => {
    if (theme === 'light') {
      onThemeChange('dark');
    } else if (theme === 'dark') {
      onThemeChange('sepia');
    } else {
      onThemeChange('light');
    }
  };

  return (
    <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
      <button onClick={() => navigate('/inbox')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
        ← Voltar
      </button>
      <div className="flex gap-1">
        <button
          onClick={cycleTheme}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          title="Alternar tema"
        >
          {theme === 'light' ? '🌙' : theme === 'dark' ? '📜' : '☀️'}
        </button>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          title="Abrir artigo original"
        >
          🔗 Original
        </a>
      </div>
    </div>
  );
}

