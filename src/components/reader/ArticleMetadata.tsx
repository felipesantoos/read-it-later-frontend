import TagsManager from '../TagsManager';
import CollectionsManager from '../CollectionsManager';
import type { Article } from '../../api/articles';
import type { Highlight } from '../../api/highlights';

interface ArticleTagsAndCollectionsProps {
  article: Article;
  onTagsUpdate: () => void;
  onCollectionsUpdate: () => void;
}

interface ArticleHighlightsProps {
  highlights: Highlight[];
}

export function ArticleTagsAndCollections({ article, onTagsUpdate, onCollectionsUpdate }: ArticleTagsAndCollectionsProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', height: '100%', alignItems: 'stretch' }}>
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TagsManager
          articleId={article.id}
          currentTags={article.articleTags}
          onUpdate={onTagsUpdate}
        />
      </div>
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CollectionsManager
          articleId={article.id}
          currentCollections={article.articleCollections}
          onUpdate={onCollectionsUpdate}
        />
      </div>
    </div>
  );
}

export function ArticleHighlights({ highlights }: ArticleHighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <div className="card mt-1" style={{ padding: '0.5rem' }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Highlights ({highlights.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {highlights.map((highlight) => (
          <div key={highlight.id} style={{ padding: '0.4rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p style={{ fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>"{highlight.text}"</p>
            {highlight.notes && highlight.notes.length > 0 && (
              <div style={{ marginTop: '0.2rem', paddingLeft: '0.4rem', borderLeft: '2px solid #007bff' }}>
                {highlight.notes.map((note) => (
                  <p key={note.id} style={{ fontSize: '0.75rem', margin: '0.2rem 0', color: '#666' }}>
                    {note.content}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


