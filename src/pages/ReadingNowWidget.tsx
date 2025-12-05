import { useState, useEffect } from 'react';
import { articlesApi, type Article } from '../api/articles';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import { themeStyles } from '../utils/themeStyles';
import { useTheme } from '../contexts/ThemeContext';
import Button from '../components/Button';
import { BookOpen, RefreshCw, Moon, ScrollText, Sun, Inbox, Star } from 'lucide-react';
import '../App.css';

export default function ReadingNowWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { theme, cycleTheme } = useTheme();

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    try {
      const response = await articlesApi.list({
        status: 'READING',
        limit: 100,
      });
      setArticles(response.data || []);
    } catch (error) {
      console.error('Error loading articles:', error);
      setMessage({ text: 'Error loading articles', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadArticles();
  }

  const currentTheme = themeStyles[theme];

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
          <BookOpen size={20} /> Reading Now
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
          icon={<Star size={14} />}
          onClick={() => window.location.href = '/favorites'}
          style={{ color: currentTheme.text, textDecoration: 'none' }}
        >
          Favorites
        </Button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <p style={{ color: currentTheme.secondaryText, margin: 0 }}>No articles being read at the moment</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} onUpdate={loadArticles} />
          ))}
        </div>
      )}
    </div>
  );
}

