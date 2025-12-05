import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsApi } from '../api/settings';
import { useAuth } from './AuthContext';
import type { Theme } from '../utils/themeStyles';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Carregar tema do banco quando autenticado
  useEffect(() => {
    async function loadTheme() {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await settingsApi.getTheme();
        if (response.data?.theme) {
          setThemeState(response.data.theme);
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
        // Mantém o padrão 'light' em caso de erro
      } finally {
        setIsLoading(false);
      }
    }

    loadTheme();
  }, [isAuthenticated]);

  // Função para atualizar tema e salvar no banco
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (isAuthenticated) {
      try {
        await settingsApi.updateTheme(newTheme);
      } catch (error) {
        console.error('Erro ao salvar tema:', error);
        // Não reverte o tema em caso de erro, apenas loga
      }
    }
  };

  // Função para ciclar entre os temas
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('sepia');
    } else {
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}

