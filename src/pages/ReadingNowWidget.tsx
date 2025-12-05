import { useState, useEffect } from 'react';
import { articlesApi, type Article } from '../api/articles';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import { themeStyles, type Theme } from '../utils/themeStyles';
import '../App.css';

export default function ReadingNowWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [theme, setTheme] = useState<Theme>('light');

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
      setMessage({ text: 'Erro ao carregar artigos', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await loadArticles();
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('sepia');
    } else {
      setTheme('light');
    }
  };

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

      <div className="flex-between mb-1" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Lendo Agora</h2>
          <button
            onClick={handleRefresh}
            title="Atualizar"
            style={{ padding: '0.25rem', fontSize: '0.75rem', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: currentTheme.buttonBg, color: currentTheme.text }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
          <button
            onClick={cycleTheme}
            title="Alternar tema"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: currentTheme.buttonBg, color: currentTheme.text }}
          >
            {theme === 'light' ? '🌙' : theme === 'dark' ? '📜' : '☀️'}
          </button>
        </div>
        <div className="flex gap-1">
          <a
            href="/inbox"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: currentTheme.text }}
          >
            📥 Inbox
          </a>
          <a
            href="/favorites"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: currentTheme.text }}
          >
            ⭐ Favoritos
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Carregando...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center', backgroundColor: currentTheme.cardBg, border: `1px solid ${currentTheme.cardBorder}` }}>
          <p style={{ color: currentTheme.secondaryText, margin: 0 }}>Nenhum artigo em leitura no momento</p>
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

