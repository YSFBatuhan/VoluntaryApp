import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBooksByOwner } from '../services/libraryService';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const ownBooks = await getBooksByOwner(currentUser.uid);
        if (alive) setBooks(ownBooks);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [currentUser]);

  const stats = useMemo(() => {
    const published = books.filter(book => book.status === 'published').length;
    const pending = books.filter(book => book.status === 'pending').length;
    const needsFix = books.filter(book => book.status === 'needs_fix').length;
    const rejected = books.filter(book => book.status === 'rejected').length;
    const minutes = books.reduce((sum, book) => sum + (book.estimatedReadingMinutes || Math.round((book.totalDurationSec || 0) / 60)), 0);

    return { published, pending, needsFix, rejected, minutes, total: books.length };
  }, [books]);

  const recentBooks = books.slice(0, 4);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero-panel">
        <div>
          <span className="dashboard-kicker">Ana sayfa</span>
          <h1>Merhaba, {userProfile?.name || currentUser?.displayName || 'gönüllü'}.</h1>
          <p>Bugünkü ana akış: seçilebilir metinli PDF ekle, admin onaylasın, doğal ses üretimi ve cache süreciyle yayına hazırlansın.</p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="btn-sage" type="button" onClick={() => navigate('/books')}>PDF Ekle</button>
          <button className="btn-outline" type="button" onClick={() => navigate('/studio')}>Kayıt Stüdyosu</button>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard label="Toplam İçerik" value={loading ? '...' : stats.total} hint="Yüklediğin PDF ve bekleyen içerikler" />
        <MetricCard label="Yayında" value={loading ? '...' : stats.published} hint="Dinleyici tarafında görünür" />
        <MetricCard label="Kontrol Bekliyor" value={loading ? '...' : stats.pending} hint="Admin inceleme kuyruğunda" />
        <MetricCard label="Düzeltme" value={loading ? '...' : stats.needsFix} hint="Senden işlem bekliyor" />
      </div>

      <div className="dashboard-grid refined">
        <section className="card contribution-card">
          <div className="card-header">
            <h3>İş Akışı</h3>
            <span className="badge-light">Güncel durum</span>
          </div>
          <div className="pipeline-list">
            <PipelineItem label="Düzeltme istendi" value={stats.needsFix} tone="needs-fix" />
            <PipelineItem label="Onay bekliyor" value={stats.pending} tone="pending" />
            <PipelineItem label="Yayında" value={stats.published} tone="published" />
            <PipelineItem label="Reddedildi" value={stats.rejected} tone="rejected" />
          </div>
        </section>

        <section className="card next-action-card">
          <h3>Sıradaki Adım</h3>
          <p>{getNextActionText(stats)}</p>
          <button className="btn-sage" type="button" onClick={() => navigate(stats.needsFix ? '/books' : '/books')}>
            {stats.needsFix ? 'Düzeltmeleri Aç' : 'Yeni İçerik Yükle'}
          </button>
        </section>
      </div>

      <section className="card recent-work-card">
        <div className="card-header">
          <h3>Son Yüklemeler</h3>
          <button className="btn-outline" type="button" onClick={() => navigate('/books')}>Kitap Yönetimi</button>
        </div>
        {loading ? (
          <p className="card-desc">Yüklemeler alınıyor...</p>
        ) : recentBooks.length ? (
          <div className="recent-work-list">
            {recentBooks.map(book => (
              <article key={book.id} className="recent-work-row">
                <div>
                  <strong>{book.title}</strong>
                  <span>{book.category || 'Kategori yok'} / {book.sourceType === 'pdf' ? 'PDF' : 'Ses kaydı'}</span>
                </div>
                <em className={`status-pill ${getStatusTone(book.status)}`}>{getStatusLabel(book.status)}</em>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-dashboard-state">
            <strong>Henüz içerik yüklemedin.</strong>
            <p>İlk adım için Kitap Yönetimi sayfasından seçilebilir metin içeren bir PDF ekle.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <section className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </section>
  );
}

function PipelineItem({ label, value, tone }) {
  return (
    <div className="pipeline-item">
      <span className={`pipeline-dot ${tone}`}></span>
      <strong>{label}</strong>
      <em>{value}</em>
    </div>
  );
}

function getNextActionText(stats) {
  if (stats.needsFix) return 'Önce adminin düzeltme istediği içerikleri toparla. Bu işler tekrar incelemeye gönderilmeden yayına çıkmaz.';
  if (stats.pending) return 'İçeriklerin kontrolde. Bu sırada yeni bir seçilebilir metinli PDF hazırlayabilirsin.';
  if (!stats.total) return 'Başlamak için en hızlı yol: seçilebilir metin içeren bir PDF yüklemek.';
  return 'Akış temiz. Yeni bir içerik ekleyerek kütüphaneyi büyütebilirsin.';
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Onay bekliyor',
    published: 'Yayında',
    needs_fix: 'Düzeltme istendi',
    rejected: 'Reddedildi',
  };
  return labels[status] || 'Durum bilinmiyor';
}

function getStatusTone(status) {
  const tones = {
    pending: 'pending',
    published: 'published',
    needs_fix: 'needs-fix',
    rejected: 'rejected',
  };
  return tones[status] || 'neutral';
}
