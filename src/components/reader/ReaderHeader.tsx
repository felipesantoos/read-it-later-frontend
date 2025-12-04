import { useNavigate } from 'react-router-dom';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import StatusDropdown from './StatusDropdown';

interface ReaderHeaderProps {
  article: Article;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  isTopBarVisible: boolean;
  onToggleTopBar: () => void;
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (height: number) => void;
  onStatusChange: (newStatus: Article['status']) => void;
  isUpdatingStatus: boolean;
  isStatusDropdownOpen: boolean;
  onStatusDropdownToggle: () => void;
  selectedText: string;
  onCreateHighlight: () => void;
}

export default function ReaderHeader({ 
  article, 
  theme, 
  onThemeChange, 
  isTopBarVisible, 
  onToggleTopBar,
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
  onStatusChange,
  isUpdatingStatus,
  isStatusDropdownOpen,
  onStatusDropdownToggle,
  selectedText,
  onCreateHighlight
}: ReaderHeaderProps) {
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
    <div className="flex-between mb-1" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
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
      <div className="flex gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Font Size Input */}
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: currentTheme.text }}>
          <span style={{ fontSize: '0.75rem' }}>Altura:</span>
          <input
            type="number"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 12 && value <= 24) {
                onFontSizeChange(value);
              }
            }}
            style={{
              width: '50px',
              padding: '0.2rem 0.3rem',
              fontSize: '0.75rem',
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              backgroundColor: currentTheme.cardBg,
              color: currentTheme.text
            }}
          />
        </label>
        
        {/* Line Height Input */}
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: currentTheme.text }}>
          <span style={{ fontSize: '0.75rem' }}>Linha:</span>
          <input
            type="number"
            min="1.2"
            max="2.4"
            step="0.1"
            value={lineHeight}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= 1.2 && value <= 2.4) {
                onLineHeightChange(value);
              }
            }}
            style={{
              width: '50px',
              padding: '0.2rem 0.3rem',
              fontSize: '0.75rem',
              border: `1px solid ${currentTheme.cardBorder}`,
              borderRadius: '4px',
              backgroundColor: currentTheme.cardBg,
              color: currentTheme.text
            }}
          />
        </label>

        {/* Status Dropdown */}
        <StatusDropdown
          article={article}
          isOpen={isStatusDropdownOpen}
          onToggle={onStatusDropdownToggle}
          onChange={onStatusChange}
          isUpdating={isUpdatingStatus}
          theme={theme}
        />

        {/* Highlight Button */}
        {selectedText && (
          <button
            className="primary"
            onClick={onCreateHighlight}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            ✨ Highlight
          </button>
        )}

        {/* Theme Button */}
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
        
        {/* Toggle Top Bar Button */}
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
        
        {/* Original Link */}
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

