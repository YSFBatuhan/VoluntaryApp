import Sidebar from '../components/Sidebar';

export default function VolunteerLayout({ children }) {
  return (
    <div className="volunteer-layout">
      {/* Sol Menü */}
      <Sidebar />
      
      {/* Sağ Ana İçerik Alanı */}
      <div className="main-content">
        <header className="topbar">
          <div className="brand">EchoVoices</div>
          
          <div className="topbar-right">
            <input type="text" placeholder="Search narrations..." className="search-bar" />
            <div className="topbar-actions">
              <span>🔔</span>
              <span>⚙️</span>
              <div className="avatar-small">👤</div>
            </div>
          </div>
        </header>

        {/* Dinamik Sayfa İçeriği Buraya Gelecek */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
