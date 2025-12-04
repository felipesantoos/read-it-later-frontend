import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Article } from '../../api/articles';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';
import { validatePages } from '../../utils/validation';
import StatusDropdown from './StatusDropdown';
import TagsManager from '../TagsManager';

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
  readingProgress: number;
  onPageChange: (newPage: number) => Promise<void>;
  onPagesUpdate: (totalPages: number | null, currentPage: number | null) => Promise<void>;
  onResetProgress: () => Promise<void>;
  onTagsUpdate?: () => void;
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
  onCreateHighlight,
  readingProgress,
  onPageChange,
  onPagesUpdate,
  onResetProgress,
  onTagsUpdate
}: ReaderHeaderProps) {
  const navigate = useNavigate();
  const currentTheme = themeStyles[theme];
  const [isEditingPages, setIsEditingPages] = useState(false);
  const [editingTotalPages, setEditingTotalPages] = useState<string>('');
  const [editingCurrentPage, setEditingCurrentPage] = useState<string>('');

  const cycleTheme = () => {
    if (theme === 'light') {
      onThemeChange('dark');
    } else if (theme === 'dark') {
      onThemeChange('sepia');
    } else {
      onThemeChange('light');
    }
  };

  const handleStartEditingPages = () => {
    setEditingTotalPages(article.totalPages?.toString() || '');
    setEditingCurrentPage(article.currentPage?.toString() || '1');
    setIsEditingPages(true);
  };

  const handleSavePages = async () => {
    const totalPagesValue = editingTotalPages.trim();
    const currentPageValue = editingCurrentPage.trim();
    
    let totalPages: number | null = null;
    if (totalPagesValue) {
      const parsed = parseInt(totalPagesValue, 10);
      totalPages = isNaN(parsed) ? null : parsed;
    }
    
    let currentPage: number | null = null;
    if (currentPageValue) {
      const parsed = parseInt(currentPageValue, 10);
      currentPage = isNaN(parsed) ? null : parsed;
    }
    
    const validation = validatePages(totalPages, currentPage);
    if (!validation.isValid) {
      // Silently fail - validation errors would be shown by parent component if needed
      return;
    }
    
    try {
      await onPagesUpdate(totalPages, currentPage);
      setIsEditingPages(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCancelEditingPages = () => {
    setIsEditingPages(false);
    setEditingTotalPages('');
    setEditingCurrentPage('');
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
        {/* Page Tracker - Compact */}
        {isEditingPages ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="0"
              max={editingTotalPages ? parseInt(editingTotalPages) : undefined}
              value={editingCurrentPage}
              onChange={(e) => setEditingCurrentPage(e.target.value)}
              placeholder="Atual"
              style={{
                width: '50px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText }}>/</span>
            <input
              type="number"
              value={editingTotalPages}
              onChange={(e) => setEditingTotalPages(e.target.value)}
              placeholder="Total"
              style={{
                width: '50px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <button
              onClick={handleSavePages}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ✓
            </button>
            <button
              onClick={handleCancelEditingPages}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        ) : article.totalPages && article.totalPages > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              onClick={() => {
                const currentPage = article.currentPage ?? 0;
                if (currentPage > 0) {
                  onPageChange(currentPage - 1);
                }
              }}
              disabled={(article.currentPage ?? 0) === 0}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                opacity: (article.currentPage ?? 0) === 0 ? 0.5 : 1,
                cursor: (article.currentPage ?? 0) === 0 ? 'not-allowed' : 'pointer',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '3px'
              }}
              title="Página anterior"
            >
              ←
            </button>
            <input
              type="number"
              min="0"
              max={article.totalPages}
              value={article.currentPage || 0}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 0 && page <= article.totalPages!) {
                  onPageChange(page);
                }
              }}
              style={{
                width: '45px',
                padding: '0.15rem 0.2rem',
                fontSize: '0.7rem',
                textAlign: 'center',
                backgroundColor: currentTheme.cardBg,
                border: `1px solid ${currentTheme.cardBorder}`,
                color: currentTheme.text,
                borderRadius: '3px'
              }}
            />
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText }}>
              / {article.totalPages}
            </span>
            <button
              onClick={() => {
                const currentPage = article.currentPage ?? 0;
                if (currentPage < article.totalPages!) {
                  onPageChange(currentPage + 1);
                }
              }}
              disabled={(article.currentPage ?? 0) >= article.totalPages!}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                opacity: (article.currentPage ?? 0) >= article.totalPages! ? 0.5 : 1,
                cursor: (article.currentPage ?? 0) >= article.totalPages! ? 'not-allowed' : 'pointer',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '3px'
              }}
              title="Próxima página"
            >
              →
            </button>
            <button
              onClick={handleStartEditingPages}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Editar páginas"
            >
              ✏️
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartEditingPages}
            style={{ 
              padding: '0.15rem 0.3rem', 
              fontSize: '0.7rem',
              backgroundColor: currentTheme.buttonBg,
              color: currentTheme.text,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
            title="Adicionar rastreamento de páginas"
          >
            ➕ Páginas
          </button>
        )}

        {/* Progress Bar - Compact */}
        {readingProgress > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ 
              width: '60px', 
              height: '3px', 
              backgroundColor: currentTheme.buttonBg || '#e9ecef', 
              borderRadius: '2px', 
              overflow: 'hidden' 
            }}>
              <div
                style={{
                  height: '100%',
                  width: `${readingProgress * 100}%`,
                  backgroundColor: '#007bff',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ fontSize: '0.7rem', color: currentTheme.secondaryText, minWidth: '35px' }}>
              {Math.round(readingProgress * 100)}%
            </span>
            <button
              onClick={onResetProgress}
              style={{
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                backgroundColor: currentTheme.buttonBg,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
              title="Resetar progresso"
            >
              🔄
            </button>
          </div>
        )}

        {/* Font Size Input */}
        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: currentTheme.text }}>
          <span style={{ fontSize: '0.75rem' }}>Altura:</span>
          <input
            type="number"
            step="1"
            value={fontSize}
            onChange={(e) => {
              const inputValue = e.target.value.trim();
              // Allow empty input during editing
              if (inputValue === '' || inputValue === '-') {
                return;
              }
              const value = parseInt(inputValue, 10);
              // Update if value is a valid positive integer
              if (!isNaN(value) && value > 0) {
                onFontSizeChange(value);
              }
            }}
            onBlur={(e) => {
              // Validate and reset to last valid value if invalid
              const value = parseInt(e.target.value, 10);
              if (isNaN(value) || value <= 0) {
                e.target.value = fontSize.toString();
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
            step="0.1"
            value={lineHeight}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value > 0) {
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

        {/* Tags Button */}
        <TagsManager
          articleId={article.id}
          currentTags={article.articleTags}
          onUpdate={onTagsUpdate}
          theme={theme}
          compact={true}
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

