import CollectionsManager from '../CollectionsManager';
import type { Article } from '../../api/articles';
import type { Highlight } from '../../api/highlights';
import type { Theme } from '../../utils/themeStyles';
import { themeStyles } from '../../utils/themeStyles';

interface ArticleTagsAndCollectionsProps {
  article: Article;
  onTagsUpdate: () => void;
  onCollectionsUpdate: () => void;
  theme?: Theme;
}

interface ArticleHighlightsProps {
  highlights: Highlight[];
  theme?: Theme;
}

export function ArticleTagsAndCollections({ article, onTagsUpdate, onCollectionsUpdate, theme = 'light' }: ArticleTagsAndCollectionsProps) {
  const currentTheme = themeStyles[theme];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', height: '100%', alignItems: 'stretch' }}>
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CollectionsManager
          articleId={article.id}
          currentCollections={article.articleCollections}
          onUpdate={onCollectionsUpdate}
          theme={theme}
        />
      </div>
    </div>
  );
}

export function ArticleHighlights({ highlights, theme = 'light' }: ArticleHighlightsProps) {
  if (highlights.length === 0) return null;

  const currentTheme = themeStyles[theme];

  return (
    <div 
      className="card mt-1" 
      style={{ 
        padding: '0.5rem',
        backgroundColor: currentTheme.cardBg,
        borderColor: currentTheme.cardBorder
      }}
    >
      <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: currentTheme.text }}>
        Highlights ({highlights.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {highlights.map((highlight) => (
          <div 
            key={highlight.id} 
            style={{ 
              padding: '0.4rem', 
              backgroundColor: currentTheme.buttonBg, 
              borderRadius: '4px' 
            }}
          >
            <p style={{ fontSize: '0.8rem', margin: 0, fontStyle: 'italic', color: currentTheme.text }}>
              "{highlight.text}"
            </p>
            {highlight.notes && highlight.notes.length > 0 && (
              <div style={{ marginTop: '0.2rem', paddingLeft: '0.4rem', borderLeft: '2px solid #007bff' }}>
                {highlight.notes.map((note) => (
                  <p key={note.id} style={{ fontSize: '0.75rem', margin: '0.2rem 0', color: currentTheme.secondaryText }}>
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


