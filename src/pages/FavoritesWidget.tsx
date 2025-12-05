import { useState, useEffect } from 'react';
import { articlesApi, type Article } from '../api/articles';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import '../App.css';

export default function FavoritesWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    try {
      const response = await articlesApi.list({
        isFavorited: true,
        limit: 200,
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

  return (
    <div className="widget-container">
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
          <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>⭐ Favoritos</h2>
          <button
            onClick={handleRefresh}
            title="Atualizar"
            style={{ padding: '0.25rem', fontSize: '0.75rem', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
        </div>
        <div className="flex gap-1">
          <a
            href="/inbox"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📥 Inbox
          </a>
          <a
            href="/reading-now"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📖 Lendo
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Carregando...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>Nenhum artigo favoritado ainda</p>
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

