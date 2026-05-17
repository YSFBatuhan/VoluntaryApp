import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteBookCascade,
  getAllBooksForAdmin,
  getBookReviewPreview,
  getPendingReviewBooks,
  getPublishedPdfBooksForNaturalAudio,
  requestNaturalAudioGeneration,
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
  const [allBooks, setAllBooks] = useState([]);
  const [naturalAudioBooks, setNaturalAudioBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [preview, setPreview] = useState({ chapters: [], chunks: [] });
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [allBooksLoading, setAllBooksLoading] = useState(true);
  const [naturalAudioLoading, setNaturalAudioLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [deletingBookId, setDeletingBookId] = useState('');
  const [savingNaturalAudioId, setSavingNaturalAudioId] = useState('');
  const [requestNaturalAudio, setRequestNaturalAudio] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedBook = useMemo(
    () => books.find(book => book.id === selectedBookId),
    [books, selectedBookId],
  );

  useEffect(() => {
    loadBooks();
    // Queue should be loaded once when the panel opens; manual refresh handles later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setAllBooksLoading(true);
    setNaturalAudioLoading(true);
    setError('');
    try {
      const [pendingBooks, publishedPdfBooks, adminBooks] = await Promise.all([
        getPendingReviewBooks(),
        getPublishedPdfBooksForNaturalAudio(),
        getAllBooksForAdmin(),
      ]);
      setBooks(pendingBooks);
      setNaturalAudioBooks(publishedPdfBooks);
      setAllBooks(adminBooks);
      const nextSelectedBook = pendingBooks.find(book => book.id === selectedBookId) || pendingBooks[0];
      setSelectedBookId(nextSelectedBook?.id || '');
      setRequestNaturalAudio(nextSelectedBook?.sourceType === 'pdf');
    } catch (err) {
      setError('Onay bekleyen kitaplar alınamadı: ' + err.message);
    } finally {
      setLoading(false);
      setAllBooksLoading(false);
      setNaturalAudioLoading(false);
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
        requestNaturalAudio: status === 'published' && selectedBook.sourceType === 'pdf' && requestNaturalAudio,
      });

      setSuccessMsg(`"${selectedBook.title}" için karar kaydedildi.`);
      setReviewNote('');
      const nextBooks = books.filter(book => book.id !== selectedBook.id);
      setBooks(nextBooks);
      setSelectedBookId(nextBooks[0]?.id || '');
      setRequestNaturalAudio(nextBooks[0]?.sourceType === 'pdf');
      if (!nextBooks.length) setPreview({ chapters: [], chunks: [] });
    } catch (err) {
      setError('Karar kaydedilemedi: ' + err.message);
    } finally {
      setSavingStatus('');
    }
  }

  function selectReviewBook(book) {
    setSelectedBookId(book.id);
    setRequestNaturalAudio(book.sourceType === 'pdf');
  }

  async function queueNaturalAudio(book) {
    setSavingNaturalAudioId(book.id);
    setError('');
    setSuccessMsg('');

    try {
      await requestNaturalAudioGeneration({
        bookId: book.id,
        requesterId: currentUser.uid,
        provider: 'piper_tr_TR_dfki_medium',
        voiceId: 'tr_TR-dfki-medium',
      });
      setSuccessMsg(`"${book.title}" doğal ses üretim kuyruğuna alındı.`);
      await loadBooks();
    } catch (err) {
      setError('Doğal ses kuyruğuna alınamadı: ' + err.message);
    } finally {
      setSavingNaturalAudioId('');
    }
  }

  async function handleDeleteBook(book) {
    const confirmed = window.confirm(
      `"${book.title || 'İsimsiz kitap'}" silinsin mi?\n\nBu işlem kitap kaydını, bölümlerini, PDF metin parçalarını, favori ve dinleme ilerleme kayıtlarını kaldırır.`,
    );
    if (!confirmed) return;

    setDeletingBookId(book.id);
    setError('');
    setSuccessMsg('');

    try {
      await deleteBookCascade(book.id);
      setSuccessMsg(`"${book.title || 'İsimsiz kitap'}" silindi.`);
      await loadBooks();
    } catch (err) {
      setError('Kitap silinemedi: ' + err.message);
    } finally {
      setDeletingBookId('');
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
                  onClick={() => selectReviewBook(book)}
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
                  <h3>DoÄŸal Ses</h3>
                  <p>{getNaturalAudioText(selectedBook)}</p>
                </div>
                <span className={`status-pill ${getNaturalAudioTone(selectedBook)}`}>
                  {getNaturalAudioLabel(selectedBook)}
                </span>
              </div>

              {selectedBook.sourceType === 'pdf' && (
                <label className="qc-natural-audio-toggle">
                  <input
                    type="checkbox"
                    checked={requestNaturalAudio}
                    onChange={event => setRequestNaturalAudio(event.target.checked)}
                  />
                  <span>YayÄ±nlayÄ±nca doÄŸal ses Ã¼retim kuyruÄŸuna al</span>
                </label>
              )}

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

      <section className="card natural-audio-admin-panel">
        <div className="qc-panel-heading">
          <div>
            <h3>Yayınlanmış PDF Doğal Ses</h3>
            <p>{naturalAudioLoading ? 'Yükleniyor...' : `${naturalAudioBooks.length} PDF kitap`}</p>
          </div>
          <button className="btn-outline" type="button" onClick={loadBooks} disabled={loading || naturalAudioLoading}>
            Yenile
          </button>
        </div>

        {naturalAudioLoading ? (
          <p className="qc-empty">Yayınlanmış PDF kitaplar yükleniyor...</p>
        ) : naturalAudioBooks.length === 0 ? (
          <p className="qc-empty">Yayınlanmış PDF kitap yok.</p>
        ) : (
          <div className="natural-audio-book-list">
            {naturalAudioBooks.map(book => {
              const naturalStatus = book.naturalAudio?.status || 'not_requested';
              const isReady = naturalStatus === 'ready';
              const isQueued = naturalStatus === 'queued' || naturalStatus === 'processing';
              return (
                <article key={book.id} className="natural-audio-book-row">
                  <div>
                    <strong>{book.title || 'İsimsiz kitap'}</strong>
                    <span>{book.author || 'Yazar belirtilmedi'} / {book.category || 'Kategori yok'}</span>
                  </div>
                  <span className={`status-pill ${getNaturalAudioTone(book)}`}>
                    {getNaturalAudioLabel(book)}
                  </span>
                  <button
                    className="btn-sage"
                    type="button"
                    onClick={() => queueNaturalAudio(book)}
                    disabled={isReady || isQueued || savingNaturalAudioId === book.id}
                  >
                    {savingNaturalAudioId === book.id ? 'Kuyruğa alınıyor...' : 'Doğal Ses Kuyruğuna Al'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card admin-library-panel">
        <div className="qc-panel-heading">
          <div>
            <h3>Sistemdeki Tüm Kitaplar</h3>
            <p>{allBooksLoading ? 'Yükleniyor...' : `${allBooks.length} kitap`}</p>
          </div>
          <button className="btn-outline" type="button" onClick={loadBooks} disabled={loading || allBooksLoading}>
            Yenile
          </button>
        </div>

        {allBooksLoading ? (
          <p className="qc-empty">Kitaplar yükleniyor...</p>
        ) : allBooks.length === 0 ? (
          <p className="qc-empty">Sistemde kitap yok.</p>
        ) : (
          <div className="admin-library-list">
            {allBooks.map(book => (
              <article key={book.id} className="admin-library-row">
                <div>
                  <strong>{book.title || 'İsimsiz kitap'}</strong>
                  <span>{book.author || 'Yazar belirtilmedi'} / {book.category || 'Kategori yok'}</span>
                  <small>{formatSource(book)} / {book.uploaderName || 'Yükleyen yok'}</small>
                </div>
                <span className={`status-pill ${getStatusTone(book.status)}`}>
                  {getStatusLabel(book.status)}
                </span>
                <span className={`status-pill ${getNaturalAudioTone(book)}`}>
                  {book.sourceType === 'pdf' ? getNaturalAudioLabel(book) : 'Ses'}
                </span>
                <button
                  className="qc-action danger"
                  type="button"
                  onClick={() => handleDeleteBook(book)}
                  disabled={deletingBookId === book.id}
                >
                  {deletingBookId === book.id ? 'Siliniyor...' : 'Sil'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Onay bekliyor',
    published: 'Yayında',
    needs_fix: 'Düzeltme istendi',
    rejected: 'Reddedildi',
    draft: 'Taslak',
    archived: 'Arşivlendi',
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

function getNaturalAudioLabel(book) {
  const status = book.naturalAudio?.status || 'not_requested';
  const labels = {
    not_requested: 'Planlanmadı',
    queued: 'Kuyrukta',
    processing: 'Üretiliyor',
    ready: 'Hazır',
    failed: 'Hata',
  };
  return labels[status] || 'Planlanmadı';
}

function getNaturalAudioTone(book) {
  const status = book.naturalAudio?.status || 'not_requested';
  const tones = {
    not_requested: 'neutral',
    queued: 'pending',
    processing: 'pending',
    ready: 'published',
    failed: 'rejected',
  };
  return tones[status] || 'neutral';
}

function getNaturalAudioText(book) {
  if (book.sourceType !== 'pdf') {
    return 'Doğal ses önceliği PDF metinlerinden üretilecek kitaplarda kullanılacak.';
  }

  if (book.naturalAudio?.status === 'ready') {
    return 'Bu kitap için doğal ses hazır. Yayında hazır ses dosyaları oynatılır.';
  }

  if (book.naturalAudio?.status === 'queued') {
    return 'Kitap yerel doğal ses worker kuyruğunda. Worker çalıştığında ses dosyaları üretilip Storage’a yüklenecek.';
  }

  return 'PDF yayınlanırken doğal ses kuyruğuna alınabilir. Ses hazır olana kadar içerik beklemede tutulur.';
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

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
function getPremiumTtsText(book) {
  if (book.sourceType !== 'pdf') {
    return 'Doğal ses üretimi önceliği PDF metinlerinden üretilecek kitaplarda kullanılacak.';
  }

  if (book.premiumTts?.status === 'ready') {
    return 'Bu kitap için hazır ses görünüyor. Yayında ses oynatma aktif edilebilir.';
  }

  return 'Ses üretimi için backend/proxy ve Storage cache hazır olmalı. Hazır ses oluşmadan yayın akışı tamamlanmaz.';
}
