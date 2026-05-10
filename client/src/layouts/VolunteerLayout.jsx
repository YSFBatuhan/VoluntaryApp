import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function VolunteerLayout({ children }) {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const initials = userProfile?.name
    ? userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'GV';

  return (
    <div className="volunteer-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="brand">GTÜ EchoVoices</div>
            <p className="topbar-context">Gönüllü içerik üretim paneli</p>
          </div>

          <div className="topbar-right">
            <input type="text" placeholder="Kitap, kategori veya yükleme ara..." className="search-bar" />
            <div className="topbar-actions">
              <button className="topbar-icon-button" type="button" title="Kitap yönetimi" onClick={() => navigate('/books')}>
                +
              </button>
              <button className="topbar-profile" type="button" onClick={() => navigate('/profile')}>
                <span className="avatar-small">{initials}</span>
                <span>
                  <strong>{userProfile?.name || currentUser?.displayName || 'Gönüllü'}</strong>
                  <small>{userProfile?.email || currentUser?.email || 'Profil'}</small>
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
