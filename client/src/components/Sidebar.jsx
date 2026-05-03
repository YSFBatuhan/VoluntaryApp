import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/studio', icon: '🎙️', label: 'Recording Studio' },
  { path: '/books', icon: '📚', label: 'Book Management' },
  { path: '/dashboard', icon: '📈', label: 'Impact Stats' },
  { path: '/community', icon: '👥', label: 'Community' },
];

export default function Sidebar() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = userProfile?.name
    ? userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VN';

  return (
    <aside className="sidebar">
      <div className="sidebar-profile">
        <div className="avatar">{initials}</div>
        <div>
          <h4>{userProfile?.name || 'Gönüllü'}</h4>
          <span className="badge">{userProfile?.level || 'Sage Level'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => isActive ? 'active' : ''}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <span>{item.icon}</span> {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        <button className="btn-sage btn-full" onClick={() => navigate('/studio')}>
          <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>+</span> Start Recording
        </button>
        <ul className="sidebar-links">
          <li onClick={() => navigate('/')}>
            <span>❓</span> Help Center
          </li>
          <li onClick={handleLogout}>
            <span>🚪</span> Logout
          </li>
        </ul>
      </div>
    </aside>
  );
}
