import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function VolunteerLayout({ children }) {
  const { userProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const initials = userProfile?.name
    ? userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'GV';

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="volunteer-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="brand">
              <span className="brand-mark brand-mark-small" aria-hidden="true">D</span>
              <span>Duyum</span>
            </div>
            <p className="topbar-context">Erişilebilir sesli kütüphane gönüllü paneli</p>
          </div>

          <div className="topbar-right">
            <input type="text" placeholder="Kitap, kategori veya yükleme ara..." className="search-bar" />
            <div className="topbar-actions">
              <button className="topbar-icon-button" type="button" title="Kitap yönetimi" onClick={() => navigate('/books')}>
                +
              </button>
              <div className="topbar-profile-menu" ref={profileMenuRef}>
                <button
                  className="topbar-profile"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <span className="avatar-small">{initials}</span>
                  <span>
                    <strong>{userProfile?.name || currentUser?.displayName || 'Gönüllü'}</strong>
                    <small>{userProfile?.role === 'admin' ? 'Admin hesabı' : 'Gönüllü hesabı'}</small>
                  </span>
                  <span className="profile-chevron" aria-hidden="true">⌄</span>
                </button>

                {profileOpen && (
                  <div className="profile-dropdown" role="menu">
                    <div className="profile-dropdown-header">
                      <strong>{userProfile?.name || currentUser?.displayName || 'Gönüllü'}</strong>
                      <span>{userProfile?.email || currentUser?.email || 'Profil'}</span>
                    </div>
                    <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('/profile'); }}>
                      Profil ayarları
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('/statistics'); }}>
                      Katkı istatistikleri
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); navigate('/community'); }}>
                      Yardım ve topluluk
                    </button>
                    <div className="profile-dropdown-divider"></div>
                    <button className="danger" type="button" role="menuitem" onClick={handleLogout}>
                      Çıkış yap
                    </button>
                  </div>
                )}
              </div>
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
