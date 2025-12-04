import { useNavigate } from 'react-router-dom';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';

interface ReaderHeaderProps {
  article: Article;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  isTopBarVisible: boolean;
  onToggleTopBar: () => void;
}

export default function ReaderHeader({ article, theme, onThemeChange, isTopBarVisible, onToggleTopBar }: ReaderHeaderProps) {
  const navigate = useNavigate();
  const currentTheme = themeStyles[theme];

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
      <button 
        onClick={() => navigate('/inbox')} 
        style={{ 
          padding: '0.25rem 0.5rem', 
          fontSize: '0.75rem',
          backgroundColor: currentTheme.buttonBg,
          color: currentTheme.text
        }}
      >
        ← Voltar
      </button>
      <div className="flex gap-1">
        <button
          onClick={cycleTheme}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.75rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
          title="Alternar tema"
        >
          {theme === 'light' ? '🌙' : theme === 'dark' ? '📜' : '☀️'}
        </button>
        <button
          onClick={onToggleTopBar}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.75rem',
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.text
          }}
          title={isTopBarVisible ? 'Ocultar barra' : 'Mostrar barra'}
        >
          {isTopBarVisible ? '↑' : '↓'}
        </button>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.75rem', 
            textDecoration: 'none', 
            color: currentTheme.text 
          }}
          title="Abrir artigo original"
        >
          🔗 Original
        </a>
      </div>
    </div>
  );
}

