import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Giriş yapılmamışsa /login'e yönlendir
export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>Yükleniyor...</p>
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" replace />;
}
