import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import VolunteerLayout from './layouts/VolunteerLayout';

// Sayfalar
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookManagement from './pages/BookManagement';
import RecordingStudio from './pages/RecordingStudio';
import BlindMode from './pages/BlindMode';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public rotalar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/blind" element={<BlindMode />} />

          {/* Korumalı rotalar — giriş gerekmez */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <VolunteerLayout>
                <Dashboard />
              </VolunteerLayout>
            </ProtectedRoute>
          } />

          <Route path="/books" element={
            <ProtectedRoute>
              <VolunteerLayout>
                <BookManagement />
              </VolunteerLayout>
            </ProtectedRoute>
          } />

          <Route path="/studio" element={
            <ProtectedRoute>
              <VolunteerLayout>
                <RecordingStudio />
              </VolunteerLayout>
            </ProtectedRoute>
          } />

          {/* Varsayılan yönlendirme */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
