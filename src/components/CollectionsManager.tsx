import { useState, useEffect } from 'react';
import { collectionsApi, type Collection } from '../api/collections';
import Toast from './Toast';
import '../App.css';

interface CollectionsManagerProps {
  articleId: string;
  currentCollections?: Array<{ collection: Collection | { id: string; name: string } }>;
  onUpdate?: () => void;
}

export default function CollectionsManager({ articleId, currentCollections = [], onUpdate }: CollectionsManagerProps) {
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setLoading(true);
    try {
      const response = await collectionsApi.list();
      setAllCollections(response.data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCollection() {
    if (!newCollectionName.trim()) return;

    try {
      await collectionsApi.create({ name: newCollectionName.trim() });
      setNewCollectionName('');
      await loadCollections();
      setMessage({ text: 'Coleção criada!', type: 'success' });
    } catch (error) {
      console.error('Error creating collection:', error);
      setMessage({ text: 'Erro ao criar coleção', type: 'error' });
    }
  }

  async function handleToggleCollection(collectionId: string) {
    const isAssigned = currentCollections.some(ac => {
      const collection = ac.collection;
      const id = 'id' in collection ? collection.id : (collection as Collection).id;
      return id === collectionId;
    });
    
    try {
      if (isAssigned) {
        await collectionsApi.removeArticle(collectionId, articleId);
      } else {
        await collectionsApi.addArticle(collectionId, articleId);
      }
      onUpdate?.();
      setMessage({ text: isAssigned ? 'Removido da coleção' : 'Adicionado à coleção', type: 'success' });
    } catch (error) {
      console.error('Error toggling collection:', error);
      setMessage({ text: 'Erro ao atualizar coleção', type: 'error' });
    }
  }

  async function handleDeleteCollection(collectionId: string) {
    if (!confirm('Tem certeza que deseja deletar esta coleção?')) return;

    try {
      await collectionsApi.delete(collectionId);
      await loadCollections();
      setMessage({ text: 'Coleção deletada', type: 'success' });
    } catch (error) {
      console.error('Error deleting collection:', error);
      setMessage({ text: 'Erro ao deletar coleção', type: 'error' });
    }
  }

  const assignedCollectionIds = new Set(currentCollections.map(ac => ac.collection.id));

  return (
    <div>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="card mb-1" style={{ padding: '0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Coleções</h4>
        
        {/* Create new collection */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="text"
            placeholder="Nova coleção..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateCollection();
              }
            }}
            style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          />
          <button
            onClick={handleCreateCollection}
            disabled={!newCollectionName.trim()}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            +
          </button>
        </div>

        {/* Collections list */}
        {loading ? (
          <p style={{ fontSize: '0.75rem', color: '#666' }}>Carregando...</p>
        ) : allCollections.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: '#666' }}>Nenhuma coleção ainda</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {allCollections.map((collection) => {
              const isAssigned = assignedCollectionIds.has(collection.id);
              return (
                <div
                  key={collection.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: isAssigned ? '#28a745' : '#f8f9fa',
                    color: isAssigned ? 'white' : '#333',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleToggleCollection(collection.id)}
                  title={isAssigned ? 'Clique para remover' : 'Clique para adicionar'}
                >
                  <span>📁 {collection.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      padding: '0 0.25rem',
                    }}
                    title="Deletar coleção"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

