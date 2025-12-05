import { api, type ApiResponse } from './client';

export interface Highlight {
  id: string;
  text: string;
  position: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  article: {
    id: string;
    title: string | null;
    url: string;
  };
  notes: Note[];
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  highlightId: string | null;
  articleId: string;
}

export interface CreateHighlightData {
  articleId: string;
  text: string;
  position?: string;
  color?: string;
}

export interface CreateNoteData {
  content: string;
  highlightId?: string;
  articleId?: string;
}

export const highlightsApi = {
  list: (params?: { articleId?: string }) => {
    const query = new URLSearchParams();
    if (params?.articleId) query.set('articleId', params.articleId);
    const queryString = query.toString();
    return api.get<ApiResponse<Highlight[]>>(
      `/highlights${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api.get<ApiResponse<Highlight>>(`/highlights/${id}`),
  create: (data: CreateHighlightData) =>
    api.post<ApiResponse<Highlight>>('/highlights', data),
  update: (id: string, data: { text?: string; color?: string }) =>
    api.patch<ApiResponse<Highlight>>(`/highlights/${id}`, data),
  delete: (id: string) => api.delete(`/highlights/${id}`),
  deleteAllByArticle: (articleId: string) =>
    api.delete(`/highlights/article/${articleId}`),
  createNote: (highlightId: string, content: string) =>
    api.post<ApiResponse<Note>>(`/highlights/${highlightId}/notes`, { content }),
  listNotes: (params?: { articleId?: string; highlightId?: string }) => {
    const query = new URLSearchParams();
    if (params?.articleId) query.set('articleId', params.articleId);
    if (params?.highlightId) query.set('highlightId', params.highlightId);
    const queryString = query.toString();
    return api.get<ApiResponse<Note[]>>(
      `/highlights/notes${queryString ? `?${queryString}` : ''}`
    );
  },
  createNoteDirect: (data: CreateNoteData) =>
    api.post<ApiResponse<Note>>('/highlights/notes', data),
  updateNote: (id: string, content: string) =>
    api.patch<ApiResponse<Note>>(`/highlights/notes/${id}`, { content }),
  deleteNote: (id: string) => api.delete(`/highlights/notes/${id}`),
};

