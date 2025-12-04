import { useState, useEffect, useRef } from 'react';
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
  const [showPopover, setShowPopover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (showPopover) {
      const assignedIds = new Set(currentCollections.map(ac => ac.collection.id));
      setSelectedCollectionIds(assignedIds);
      setSearchQuery('');
      
      // Calculate popover position (fixed is relative to viewport)
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPopoverPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    } else {
      setPopoverPosition(null);
    }
  }, [showPopover, currentCollections]);


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

  async function handleApplyCollections() {
    const currentAssignedIds = new Set(currentCollections.map(ac => ac.collection.id));
    
    // Collections to add
    const toAdd = Array.from(selectedCollectionIds).filter(id => !currentAssignedIds.has(id));
    // Collections to remove
    const toRemove = Array.from(currentAssignedIds).filter(id => !selectedCollectionIds.has(id));

    try {
      // Add new collections
      for (const collectionId of toAdd) {
        await collectionsApi.addArticle(collectionId, articleId);
      }
      // Remove collections
      for (const collectionId of toRemove) {
        await collectionsApi.removeArticle(collectionId, articleId);
      }
      
      onUpdate?.();
      setShowPopover(false);
      setMessage({ text: 'Coleções atualizadas', type: 'success' });
    } catch (error) {
      console.error('Error applying collections:', error);
      setMessage({ text: 'Erro ao atualizar coleções', type: 'error' });
    }
  }

  function handleToggleSelection(collectionId: string) {
    const newSelected = new Set(selectedCollectionIds);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollectionIds(newSelected);
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

  const filteredCollections = allCollections.filter(collection => 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {message && (
        <Toast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
          duration={3000}
        />
      )}

      <div className="card" style={{ padding: '0.5rem', flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Assigned collections display */}
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, marginRight: '0.25rem' }}>Coleções:</span>
          {currentCollections.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>Nenhuma coleção atribuída</span>
          ) : (
            <>
              {currentCollections.map((ac) => {
                const collection = ac.collection;
                return (
                  <div
                    key={collection.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => handleToggleCollection(collection.id)}
                    title="Clique para remover"
                  >
                    <span>📁 {collection.name}</span>
                  </div>
                );
              })}
            </>
          )}
          <div style={{ position: 'relative' }} data-popover-container>
            <button
              ref={buttonRef}
              onClick={() => setShowPopover(!showPopover)}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                backgroundColor: '#e9ecef',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              title="Adicionar coleção"
            >
              +
            </button>

            {/* Popover */}
            {showPopover && popoverPosition && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                  }}
                  onClick={() => {
                    setShowPopover(false);
                    setSearchQuery('');
                    const assignedIds = new Set(currentCollections.map(ac => ac.collection.id));
                    setSelectedCollectionIds(assignedIds);
                  }}
                />
                <div
                  style={{
                    position: 'fixed',
                    top: `${popoverPosition.top}px`,
                    left: `${popoverPosition.left}px`,
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 10000,
                    minWidth: '250px',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                {/* Search input */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                  <input
                    type="text"
                    placeholder="Buscar coleções..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                    }}
                    autoFocus
                  />
                </div>

                {/* Create new collection */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '0.25rem' }}>
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
                    style={{
                      flex: 1,
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                    }}
                  />
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Criar
                  </button>
                </div>

                {/* Collections list */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.5rem',
                  maxHeight: '250px',
                }}>
                  {loading ? (
                    <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>Carregando...</p>
                  ) : filteredCollections.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
                      {searchQuery ? 'Nenhuma coleção encontrada' : 'Nenhuma coleção ainda'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {filteredCollections.map((collection) => {
                        const isSelected = selectedCollectionIds.has(collection.id);
                        return (
                          <div
                            key={collection.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              backgroundColor: isSelected ? '#e7f3ff' : 'transparent',
                            }}
                            onClick={() => handleToggleSelection(collection.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelection(collection.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: '0.75rem', flex: 1 }}>📁 {collection.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCollection(collection.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc3545',
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

                {/* Actions */}
                <div style={{
                  padding: '0.5rem',
                  borderTop: '1px solid #dee2e6',
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={() => {
                      setShowPopover(false);
                      setSearchQuery('');
                      const assignedIds = new Set(currentCollections.map(ac => ac.collection.id));
                      setSelectedCollectionIds(assignedIds);
                    }}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleApplyCollections}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Aplicar
                  </button>
                </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

