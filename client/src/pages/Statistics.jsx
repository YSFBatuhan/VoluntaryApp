import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBooksByOwner } from '../services/libraryService';

export default function Statistics() {
  const { currentUser, userProfile } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snapshotTime] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;

    async function loadStats() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const ownBooks = await getBooksByOwner(currentUser.uid);
        if (alive) setBooks(ownBooks);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadStats();
    return () => {
      alive = false;
    };
  }, [currentUser]);

  const stats = useMemo(() => {
    const pdfCount = books.filter(book => book.sourceType === 'pdf').length;
    const audioCount = books.filter(book => book.sourceType === 'audio_upload').length;
    const published = books.filter(book => book.status === 'published').length;
    const pending = books.filter(book => book.status === 'pending').length;
    const needsFix = books.filter(book => book.status === 'needs_fix').length;
    const rejected = books.filter(book => book.status === 'rejected').length;
    const pdfWords = books
      .filter(book => book.sourceType === 'pdf')
      .reduce((sum, book) => sum + ((book.estimatedReadingMinutes || 0) * 150), 0);
    const audioMinutes = books
      .filter(book => book.sourceType === 'audio_upload')
      .reduce((sum, book) => sum + Math.round((book.totalDurationSec || 0) / 60), 0);
    const pdfMinutes = books
      .filter(book => book.sourceType === 'pdf')
      .reduce((sum, book) => sum + (book.estimatedReadingMinutes || Math.round((book.totalDurationSec || 0) / 60)), 0);
    const minutes = pdfMinutes + audioMinutes;
    const publishedMinutes = books
      .filter(book => book.status === 'published')
      .reduce((sum, book) => sum + (book.estimatedReadingMinutes || Math.round((book.totalDurationSec || 0) / 60)), 0);
    const totalStorageMb = books.reduce((sum, book) => {
      const sourceBytes = book.sourceFile?.bytes || 0;
      const audioBytes = book.audio?.bytes || 0;
      return sum + sourceBytes + audioBytes;
    }, 0) / 1024 / 1024;
    const thisWeek = books.filter((book) => {
      const createdAt = getMillis(book.createdAt);
      if (!createdAt) return false;
      return snapshotTime - createdAt <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const approvalRate = books.length ? Math.round((published / books.length) * 100) : 0;

    return {
      audioCount,
      audioMinutes,
      approvalRate,
      minutes,
      needsFix,
      pdfCount,
      pdfMinutes,
      pdfWords,
      pending,
      published,
      publishedMinutes,
      rejected,
      thisWeek,
      total: books.length,
      totalStorageMb,
    };
  }, [books, snapshotTime]);

  const goalMinutes = Number(userProfile?.goalMinutes || 120);
  const goalProgress = Math.min(100, Math.round((stats.publishedMinutes / Math.max(goalMinutes, 1)) * 100));
  const latestBooks = books.slice(0, 5);

  return (
    <div className="statistics-page">
      <div className="page-header">
        <h1>İstatistikler</h1>
        <p className="subtitle">Yüklediğin içeriklerin Firestore durumunu, yayın etkisini ve katkı hedefini gerçek verilerle takip et.</p>
      </div>

      <div className="metric-grid">
        <StatBox label="Toplam Yükleme" value={loading ? '...' : stats.total} hint={`${stats.thisWeek} içerik son 7 günde`} />
        <StatBox label="Yayındaki İçerik" value={loading ? '...' : stats.published} hint={`${stats.approvalRate}% yayın oranı`} />
        <StatBox label="Dinleme Süresi" value={loading ? '...' : `${stats.minutes} dk`} hint={`${stats.publishedMinutes} dk yayında`} />
        <StatBox label="Kontrol Kuyruğu" value={loading ? '...' : stats.pending} hint={`${stats.needsFix} düzeltme bekliyor`} />
      </div>

      <div className="statistics-grid">
        <section className="card contribution-card">
          <div className="card-header">
            <h3>Katkı Özeti</h3>
            <span className="badge-light">Canlı Firestore</span>
          </div>
          <div className="stats-summary-list">
            <div><strong>{stats.pdfCount}</strong><span>PDF içerik</span></div>
            <div><strong>{stats.audioCount}</strong><span>Ses kaydı</span></div>
            <div><strong>{Math.round(stats.pdfWords).toLocaleString('tr-TR')}</strong><span>Tahmini PDF kelimesi</span></div>
            <div><strong>{stats.audioMinutes} dk</strong><span>Ses kaydı süresi</span></div>
            <div><strong>{stats.totalStorageMb.toFixed(1)} MB</strong><span>Yüklenen dosya hacmi</span></div>
            <div><strong>{stats.rejected}</strong><span>Reddedilen içerik</span></div>
          </div>
        </section>

        <section className="card goal-card">
          <div className="card-header">
            <h3>Aylık Hedef</h3>
            <span className="badge-light">{goalProgress}%</span>
          </div>
          <strong>{stats.publishedMinutes} / {goalMinutes} dk</strong>
          <div className="goal-progress" aria-label={`Aylık hedef ilerlemesi yüzde ${goalProgress}`}>
            <span style={{ width: `${goalProgress}%` }}></span>
          </div>
          <p>Hedef ilerlemesi sadece dinleyiciye açılmış içeriklerin tahmini süresinden hesaplanır.</p>
        </section>

        <section className="card pipeline-card">
          <div className="card-header">
            <h3>Yayın Akışı</h3>
            <span className="badge-light">{stats.total} kayıt</span>
          </div>
          <div className="pipeline-list">
            <PipelineItem label="Yayında" value={stats.published} tone="published" />
            <PipelineItem label="Onay bekliyor" value={stats.pending} tone="pending" />
            <PipelineItem label="Düzeltme istendi" value={stats.needsFix} tone="needs-fix" />
            <PipelineItem label="Reddedildi" value={stats.rejected} tone="rejected" />
          </div>
        </section>

        <section className="card next-action-card">
          <h3>Son Yüklemeler</h3>
          {loading ? (
            <p>Yüklemeler alınıyor...</p>
          ) : latestBooks.length ? (
            <div className="stats-recent-list">
              {latestBooks.map(book => (
                <article key={book.id}>
                  <div>
                    <strong>{book.title || 'İsimsiz içerik'}</strong>
                    <span>{book.sourceType === 'pdf' ? 'PDF' : 'Ses kaydı'} · {book.category || 'Kategori yok'}</span>
                  </div>
                  <em className={`status-pill ${getStatusTone(book.status)}`}>{getStatusLabel(book.status)}</em>
                </article>
              ))}
            </div>
          ) : (
            <p>Henüz yükleme yok. İlk katkı için Kitap Yönetimi ekranından PDF veya ses kaydı ekleyebilirsin.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value, hint }) {
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

function getMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
