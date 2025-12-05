import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { highlightsApi, type Highlight } from '../api/highlights';
import Toast from '../components/Toast';
import { themeStyles } from '../utils/themeStyles';
import { useTheme } from '../contexts/ThemeContext';
import { extractTextFromHtml } from '../utils/textUtils';
import Button from '../components/Button';
import { Sparkles, RefreshCw, Moon, ScrollText, Sun, Inbox, BookOpen, BarChart, MessageSquare } from 'lucide-react';
import '../App.css';

export default function HighlightsWidget() {
  const navigate = useNavigate();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, cycleTheme } = useTheme();

  useEffect(() => {
    loadHighlights();
  }, []);

  async function loadHighlights() {
    setLoading(true);
    try {
      const response = await highlightsApi.list();
      setHighlights(response.data || []);
    } catch (error) {
      console.error('Error loading highlights:', error);
      setMessage({ text: 'Error loading highlights', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadHighlights();
  }

  const currentTheme = themeStyles[theme];

  const filteredHighlights = highlights.filter((highlight) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const articleTitle = extractTextFromHtml(highlight.article.title);
    return (
      highlight.text.toLowerCase().includes(query) ||
      articleTitle.toLowerCase().includes(query) ||
      highlight.notes.some(note => note.content.toLowerCase().includes(query))
    );
  });

  return (
    <div className="widget-container" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="flex mb-1" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} /> Highlights
        </h2>
        <Button
          variant="icon"
          size="sm"
          icon={<RefreshCw size={14} />}
          onClick={handleRefresh}
          title="Refresh"
          style={{ color: currentTheme.text }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={theme === 'light' ? <Moon size={14} /> : theme === 'dark' ? <ScrollText size={14} /> : <Sun size={14} />}
          onClick={cycleTheme}
          title="Toggle theme"
          style={{ color: currentTheme.text }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Inbox size={14} />}
          onClick={() => window.location.href = '/inbox'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Inbox
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<BarChart size={14} />}
          onClick={() => window.location.href = '/analytics'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Stats
        </Button>
      </div>

      {/* Search */}
      <div className="card mb-1" style={{ padding: '0.5rem', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
        <input
          type="text"
          placeholder="Search highlights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '0.875rem' }}
        />
      </div>

      {/* Highlights list */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      ) : filteredHighlights.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <p style={{ color: currentTheme.secondaryText, margin: 0 }}>
            {searchQuery ? 'No highlights found' : 'No highlights yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className="card"
              style={{ padding: '0.75rem', cursor: 'pointer', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}
              onClick={() => navigate(`/reader/${highlight.article.id}`)}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: currentTheme.secondaryText, margin: 0 }}>
                  {extractTextFromHtml(highlight.article.title) || highlight.article.url || highlight.article.fileName || 'Untitled'}
                </p>
              </div>
              <p style={{ fontSize: '0.9rem', margin: '0.5rem 0', fontStyle: 'italic', color: currentTheme.text }}>
                "{highlight.text}"
              </p>
              {highlight.notes && highlight.notes.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem', borderLeft: `2px solid ${currentTheme.cardBorder}` }}>
                  {highlight.notes.map((note) => (
                    <p key={note.id} style={{ fontSize: '0.85rem', margin: '0.25rem 0', color: currentTheme.secondaryText, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MessageSquare size={12} /> {note.content}
                    </p>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '0.7rem', color: currentTheme.secondaryText, marginTop: '0.5rem', margin: 0 }}>
                {new Date(highlight.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

