import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getBookReviewPreview,
  getPendingReviewBooks,
  updateBookReviewStatus,
} from '../services/libraryService';

const reviewActions = [
  { status: 'published', label: 'Yayınla', tone: 'success' },
  { status: 'needs_fix', label: 'Düzeltme İste', tone: 'warning' },
  { status: 'rejected', label: 'Reddet', tone: 'danger' },
];

export default function AdminQcPanel() {
  const { currentUser } = useAuth();
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [preview, setPreview] = useState({ chapters: [], chunks: [] });
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedBook = useMemo(
    () => books.find(book => book.id === selectedBookId),
    [books, selectedBookId],
  );

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (!selectedBookId) return;

    async function loadPreview() {
      setPreviewLoading(true);
      setError('');
      try {
        const nextPreview = await getBookReviewPreview(selectedBookId);
        setPreview(nextPreview);
      } catch (err) {
        setError('İnceleme önizlemesi alınamadı: ' + err.message);
      } finally {
        setPreviewLoading(false);
      }
    }

    loadPreview();
  }, [selectedBookId]);

  async function loadBooks() {
    setLoading(true);
    setError('');
    try {
      const pendingBooks = await getPendingReviewBooks();
      setBooks(pendingBooks);
      setSelectedBookId(current => current || pendingBooks[0]?.id || '');
    } catch (err) {
      setError('Onay bekleyen kitaplar alınamadı: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status) {
    if (!selectedBook) return;
    if (status !== 'published' && !reviewNote.trim()) {
      setError('Düzeltme veya ret kararında gönüllüye gidecek kısa bir not yazın.');
      return;
    }

    setSavingStatus(status);
    setError('');
    setSuccessMsg('');

    try {
      await updateBookReviewStatus({
        bookId: selectedBook.id,
        status,
        reviewNote,
        reviewerId: currentUser.uid,
      });

      setSuccessMsg(`"${selectedBook.title}" için karar kaydedildi.`);
      setReviewNote('');
      const nextBooks = books.filter(book => book.id !== selectedBook.id);
      setBooks(nextBooks);
      setSelectedBookId(nextBooks[0]?.id || '');
      if (!nextBooks.length) setPreview({ chapters: [], chunks: [] });
    } catch (err) {
      setError('Karar kaydedilemedi: ' + err.message);
    } finally {
      setSavingStatus('');
    }
  }

  return (
    <div className="qc-page">
      <div className="page-header">
        <h1>Kalite Kontrol Paneli</h1>
        <p className="subtitle">Onay bekleyen içerikleri inceleyin, yayınlayın veya gönüllüye net bir düzeltme notu gönderin.</p>
      </div>

      {error && <div className="auth-error qc-alert">{error}</div>}
      {successMsg && <div className="success-msg qc-alert">{successMsg}</div>}

      <div className="qc-grid">
        <section className="card qc-list-panel">
          <div className="qc-panel-heading">
            <div>
              <h3>İnceleme Kuyruğu</h3>
              <p>{loading ? 'Yükleniyor...' : `${books.length} içerik bekliyor`}</p>
            </div>
            <button className="btn-outline" type="button" onClick={loadBooks} disabled={loading}>
              Yenile
            </button>
          </div>

          {loading ? (
            <p className="qc-empty">Kuyruk yükleniyor...</p>
          ) : books.length === 0 ? (
            <p className="qc-empty">Onay bekleyen kitap yok.</p>
          ) : (
            <div className="qc-book-list">
              {books.map(book => (
                <button
                  key={book.id}
                  className={book.id === selectedBookId ? 'qc-book-row active' : 'qc-book-row'}
                  type="button"
                  onClick={() => setSelectedBookId(book.id)}
                >
                  <strong>{book.title || 'İsimsiz kitap'}</strong>
                  <span>{book.author || 'Yazar belirtilmedi'} / {book.category || 'Kategori yok'}</span>
                  <small>{formatSource(book)} / {book.uploaderName || 'Gönüllü'}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card qc-detail-panel">
          {!selectedBook ? (
            <p className="qc-empty">İncelemek için kuyruktan bir içerik seçin.</p>
          ) : (
            <>
              <div className="qc-detail-header">
                <div>
                  <span className="badge-light">{formatSource(selectedBook)}</span>
                  <h2>{selectedBook.title}</h2>
                  <p>{selectedBook.author || 'Yazar belirtilmedi'}</p>
                </div>
                <span className="qc-status">Onay bekliyor</span>
              </div>

              <div className="qc-meta-grid">
                <div><strong>Kategori</strong><span>{selectedBook.category || '-'}</span></div>
                <div><strong>Yükleyen</strong><span>{selectedBook.uploaderName || '-'}</span></div>
                <div><strong>Parça</strong><span>{selectedBook.textChunkCount || selectedBook.chapterCount || 0}</span></div>
                <div><strong>Tahmini süre</strong><span>{formatDuration(selectedBook)}</span></div>
              </div>

              <div className="qc-section premium-tts-panel">
                <div>
                  <h3>Premium TTS</h3>
                  <p>{getPremiumTtsText(selectedBook)}</p>
                </div>
                <span className={`status-pill ${getPremiumTtsTone(selectedBook)}`}>
                  {getPremiumTtsLabel(selectedBook)}
                </span>
              </div>

              <div className="qc-section">
                <h3>Bölümler</h3>
                {previewLoading ? (
                  <p className="qc-muted">Bölümler yükleniyor...</p>
                ) : preview.chapters.length ? (
                  <ul className="qc-chapter-list">
                    {preview.chapters.map(chapter => (
                      <li key={chapter.id}>
                        <div>
                          <strong>{chapter.order}. {chapter.chapterTitle || 'Bölüm'}</strong>
                          <span>{chapter.readingMode || selectedBook.readingMode}</span>
                        </div>
                        {chapter.audio?.url && (
                          <audio controls preload="metadata" src={chapter.audio.url}>
                            Tarayıcınız ses önizlemesini desteklemiyor.
                          </audio>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qc-muted">Bölüm kaydı bulunamadı.</p>
                )}
              </div>

              <div className="qc-section">
                <h3>Metin Önizlemesi</h3>
                {previewLoading ? (
                  <p className="qc-muted">Metin önizlemesi yükleniyor...</p>
                ) : preview.chunks.length ? (
                  <div className="qc-text-preview">
                    {preview.chunks.map(chunk => (
                      <article key={chunk.id}>
                        <strong>Parça {chunk.order} / Sayfa {chunk.pageStart || '-'}</strong>
                        <p>{chunk.text?.slice(0, 520)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="qc-muted">PDF/metin parçası yok. Ses yüklemeleri, depolama kararı verilene kadar beklemede tutuluyor.</p>
                )}
              </div>

              <div className="form-group">
                <label>Gönüllüye gidecek inceleme notu</label>
                <textarea
                  rows={4}
                  placeholder="Düzeltme veya ret kararında gönüllünün neyi değiştirmesi gerektiğini kısa ve net yazın..."
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                />
              </div>

              <div className="qc-actions">
                {reviewActions.map(action => (
                  <button
                    key={action.status}
                    className={`qc-action ${action.tone}`}
                    type="button"
                    disabled={Boolean(savingStatus)}
                    onClick={() => handleReview(action.status)}
                  >
                    {savingStatus === action.status ? 'Kaydediliyor...' : action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function formatSource(book) {
  if (book.sourceType === 'pdf') return 'PDF';
  if (book.sourceType === 'audio_upload') return 'Ses';
  return book.sourceType || 'Kaynak';
}

function formatDuration(book) {
  const seconds = book.totalDurationSec || 0;
  if (!seconds) return book.estimatedReadingMinutes ? `${book.estimatedReadingMinutes} dk` : '-';
  return `${Math.max(1, Math.round(seconds / 60))} dk`;
}

function getPremiumTtsLabel(book) {
  const status = book.premiumTts?.status || 'not_requested';
  const labels = {
    not_requested: 'Planlanmadı',
    planned: 'Planlandı',
    blocked_storage: 'Storage bekliyor',
    ready: 'Hazır',
    failed: 'Hata',
  };
  return labels[status] || 'Planlanmadı';
}

function getPremiumTtsTone(book) {
  const status = book.premiumTts?.status || 'not_requested';
  const tones = {
    not_requested: 'neutral',
    planned: 'pending',
    blocked_storage: 'needs-fix',
    ready: 'published',
    failed: 'rejected',
  };
  return tones[status] || 'neutral';
}

function getPremiumTtsText(book) {
  if (book.sourceType !== 'pdf') {
    return 'Premium TTS önceliği PDF metinlerinden üretilecek kitaplarda kullanılacak.';
  }

  if (book.premiumTts?.status === 'ready') {
    return 'Bu kitap için premium ses hazır görünüyor. Dinleyici tarafında ses oynatma aktif edilebilir.';
  }

  return 'ElevenLabs premium ses üretimi için backend/proxy ve Storage cache hazır olmalı. Şimdilik Web Speech fallback kullanılacak.';
}
