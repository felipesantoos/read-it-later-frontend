import { api } from './client';
import type { ApiResponse } from './client';
import type { Theme } from '../utils/themeStyles';

export interface ThemeSettings {
  theme: Theme;
}

export const settingsApi = {
  getTheme: () => api.get<ApiResponse<ThemeSettings>>('/settings/theme'),
  updateTheme: (theme: Theme) => 
    api.put<ApiResponse<ThemeSettings>>('/settings/theme', { theme }),
};

