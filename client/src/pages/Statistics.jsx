import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBooksByOwner } from '../services/libraryService';

export default function Statistics() {
  const { currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const words = books.reduce((sum, book) => sum + ((book.estimatedReadingMinutes || 0) * 150), 0);
    const minutes = books.reduce((sum, book) => sum + (book.estimatedReadingMinutes || Math.round((book.totalDurationSec || 0) / 60)), 0);

    return { pdfCount, audioCount, published, words, minutes };
  }, [books]);

  return (
    <div className="statistics-page">
      <div className="page-header">
        <h1>İstatistikler</h1>
        <p className="subtitle">Katkılarının dinleyiciye ne kazandırdığını sade bir şekilde takip et.</p>
      </div>

      <div className="metric-grid">
        <StatBox label="PDF İçerik" value={loading ? '...' : stats.pdfCount} />
        <StatBox label="Ses Beklemede" value={loading ? '...' : stats.audioCount} />
        <StatBox label="Yayındaki İçerik" value={loading ? '...' : stats.published} />
        <StatBox label="Tahmini Dinleme" value={loading ? '...' : `${stats.minutes} dk`} />
      </div>

      <div className="dashboard-grid refined">
        <section className="card">
          <div className="card-header">
            <h3>Katkı Özeti</h3>
            <span className="badge-light">MVP ölçümleri</span>
          </div>
          <div className="stats-summary-list">
            <div><strong>{Math.round(stats.words).toLocaleString('tr-TR')}</strong><span>Tahmini kelime</span></div>
            <div><strong>{books.length}</strong><span>Toplam yükleme</span></div>
            <div><strong>{stats.published}</strong><span>Dinleyiciye açılan içerik</span></div>
          </div>
        </section>

        <section className="card next-action-card">
          <h3>Nasıl yorumlamalı?</h3>
          <p>Bu ekran gerçek kullanım analitiği değil; şu an yükleme ve yayın durumlarından üretilen gönüllü katkı özetidir. Bugünkü ana katkı ölçümü PDF/TTS akışıdır; ses depolama kararı verilince ses metrikleri ayrıca açılacak.</p>
        </section>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <section className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>Güncel Firestore verisi</p>
    </section>
  );
}
