import { useState, useEffect } from 'react';
import { articlesApi, type Article } from '../api/articles';
import ArticleCard from '../components/ArticleCard';
import Toast from '../components/Toast';
import '../App.css';

export default function ReadingNowWidget() {
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
        <h2 className="widget-title" style={{ fontSize: '1rem', marginBottom: 0 }}>Lendo Agora</h2>
        <div className="flex gap-1">
          <a
            href="/inbox"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
          >
            📥 Inbox
          </a>
          <a
            href="/favorites"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none', color: 'inherit' }}
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
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>Nenhum artigo em leitura no momento</p>
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

