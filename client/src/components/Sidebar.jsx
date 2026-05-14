import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', icon: 'AN', label: 'Ana Sayfa', helper: 'Genel durum' },
  { path: '/books', icon: 'KY', label: 'Kitap Yönetimi', helper: 'Yükleme ve düzeltme' },
  { path: '/studio', icon: 'KS', label: 'Kayıt Stüdyosu', helper: 'Ses kaydı' },
  { path: '/statistics', icon: 'IS', label: 'İstatistikler', helper: 'Katkı etkisi' },
  { path: '/community', icon: 'TP', label: 'Topluluk', helper: 'Duyurular ve ekip' },
  { path: '/profile', icon: 'PR', label: 'Profil', helper: 'Hesap ve tercihler' },
];

const adminNavItems = [
  { path: '/admin/qc', icon: 'QC', label: 'Kalite Kontrol', helper: 'Admin paneli' },
  { path: '/admin/tts', icon: 'TS', label: 'TTS Ayarları', helper: 'Ses motoru' },
];

export default function Sidebar() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const initials = userProfile?.name
    ? userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'GV';
  const visibleNavItems = userProfile?.role === 'admin'
    ? [...navItems, ...adminNavItems]
    : navItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-profile">
        <div className="avatar">{initials}</div>
        <div>
          <h4>{userProfile?.name || 'Gönüllü'}</h4>
          <span className="badge">{getRoleLabel(userProfile?.role)} · {userProfile?.level || 'Başlangıç'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {visibleNavItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.helper}</small>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        <button className="btn-sage btn-full" onClick={() => navigate('/books')}>
          Yeni İçerik Yükle
        </button>
        <ul className="sidebar-links">
          <li onClick={() => navigate('/community')}>
            <span>Yardım</span>
          </li>
        </ul>
      </div>
    </aside>
  );
}

function getRoleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'blind_user') return 'Dinleyici';
  return 'Gönüllü';
}
