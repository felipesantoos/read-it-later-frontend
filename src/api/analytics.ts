import { api, type ApiResponse } from './client';

export interface Analytics {
  totalSaved: number;
  totalRead: number;
  totalFinished: number;
  totalArchived: number;
  totalFavorited: number;
  totalHighlights: number;
  totalCollections: number;
  totalTags: number;
  completionRate: number;
  readingTimeToday: number;
  articlesByStatus: Record<string, number>;
}

export const analyticsApi = {
  get: () => api.get<ApiResponse<Analytics>>('/analytics'),
};

