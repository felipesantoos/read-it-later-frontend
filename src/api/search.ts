import { api, type ApiResponse } from './client';
import type { Article } from './articles';
import type { Highlight } from './highlights';

export interface SearchResults {
  articles: Article[];
  highlights: Highlight[];
}

export const searchApi = {
  search: (query: string, type?: 'articles' | 'highlights' | 'all') => {
    const params = new URLSearchParams();
    params.set('q', query);
    if (type) params.set('type', type);
    return api.get<ApiResponse<SearchResults>>(`/search?${params.toString()}`);
  },
};

