import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import InboxWidget from './pages/InboxWidget';
import ReadingNowWidget from './pages/ReadingNowWidget';
import FavoritesWidget from './pages/FavoritesWidget';
import ReaderWidget from './pages/ReaderWidget';
import HighlightsWidget from './pages/HighlightsWidget';
import AnalyticsWidget from './pages/AnalyticsWidget';
import HomePage from './pages/HomePage';
import './App.css';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Token inválido ou ausente</h2>
        <p>{error || 'Por favor, verifique o token na URL (?token=...)'}</p>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/inbox"
            element={
              <AuthGuard>
                <InboxWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/reading-now"
            element={
              <AuthGuard>
                <ReadingNowWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/favorites"
            element={
              <AuthGuard>
                <FavoritesWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/reader/:id"
            element={
              <AuthGuard>
                <ReaderWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/highlights"
            element={
              <AuthGuard>
                <HighlightsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/analytics"
            element={
              <AuthGuard>
                <AnalyticsWidget />
              </AuthGuard>
            }
          />
          <Route
            path="/"
            element={<HomePage />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

