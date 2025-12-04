import { useEffect, useRef, MutableRefObject } from 'react';
import { articlesApi, type Article } from '../api/articles';

interface UseScrollProgressOptions {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  article: Article | null;
  onArticleUpdate: (updates: Partial<Article>) => void;
}

export function useScrollProgress({ contentRef, article, onArticleUpdate }: UseScrollProgressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const articleRef = useRef(article);
  const onUpdateRef = useRef(onArticleUpdate);

  // Keep refs updated
  useEffect(() => {
    articleRef.current = article;
    onUpdateRef.current = onArticleUpdate;
  }, [article, onArticleUpdate]);

  useEffect(() => {
    if (!contentRef.current || !article) return;

    const handleScroll = () => {
      const element = contentRef.current;
      const currentArticle = articleRef.current;
      if (!element || !currentArticle) return;

      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update reading progress (throttle to avoid too many requests)
      timeoutRef.current = setTimeout(async () => {
        try {
          let updatedArticle: Article | null = null;
          const currentArticle = articleRef.current;
          if (!currentArticle) return;

          // If article has totalPages, update by page instead
          if (currentArticle.totalPages && currentArticle.totalPages > 0) {
            const newCurrentPage = Math.round(progress * currentArticle.totalPages);
            if (newCurrentPage !== currentArticle.currentPage) {
              const response = await articlesApi.updateReadingProgressByPage(currentArticle.id, newCurrentPage);
              updatedArticle = response.data;
            }
          } else {
            const response = await articlesApi.updateReadingProgress(currentArticle.id, progress);
            updatedArticle = response.data;
          }

          // Update status if needed
          let newStatus: Article['status'] | undefined;
          if (progress > 0 && currentArticle.status === 'UNREAD') {
            newStatus = 'READING';
          } else if (progress >= 0.95) {
            newStatus = 'FINISHED';
          }

          if (newStatus && newStatus !== currentArticle.status) {
            const response = await articlesApi.update(currentArticle.id, { status: newStatus });
            updatedArticle = response.data;
          }

          // Update local state if we got an updated article
          if (updatedArticle) {
            onUpdateRef.current(updatedArticle);
          } else if (newStatus) {
            // Just update status if no full article response
            onUpdateRef.current({ status: newStatus });
          }
        } catch (error) {
          console.error('Error updating progress:', error);
          // Não mostrar toast para atualizações automáticas de scroll
        }
      }, 1000);
    };

    const element = contentRef.current;
    element.addEventListener('scroll', handleScroll);
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [contentRef, article]);
}

