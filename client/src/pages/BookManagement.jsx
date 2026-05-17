import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  addAudioChapterToBook,
  createAudioBook,
  createPdfBook,
  getBooksByOwner,
  replaceBookAudioForReview,
  updateVolunteerBookMetadata,
} from '../services/libraryService';
import { formatBytes, MAX_AUDIO_MB, uploadAudioFile, validateAudioFile } from '../services/audioService';
import { extractPdfBook } from '../services/pdfService';

const CATEGORIES = ['Roman', 'Ders Notu', 'Şiir', 'Tarih', 'Bilim', 'GTÜ Duyurusu', 'Diğer'];
const EMPTY_FORM = {
  title: '',
  author: '',
  category: 'Roman',
  chapterTitle: '',
  language: 'tr-TR',
  notes: '',
  sourceNote: '',
  permissionNote: '',
};

export default function BookManagement() {
  const { currentUser, userProfile } = useAuth();
  const [tab, setTab] = useState('pdf');
  const [form, setForm] = useState(EMPTY_FORM);
  const [audioFile, setAudioFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [myBooks, setMyBooks] = useState([]);
  const [loadingMyBooks, setLoadingMyBooks] = useState(false);
  const [bookFilter, setBookFilter] = useState('all');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [replacementAudioFile, setReplacementAudioFile] = useState(null);
  const [newChapterForm, setNewChapterForm] = useState({ chapterTitle: '' });
  const [newChapterAudioFile, setNewChapterAudioFile] = useState(null);
  const [newChapterProgress, setNewChapterProgress] = useState(0);
  const [addingChapter, setAddingChapter] = useState(false);
  const [replacementProgress, setReplacementProgress] = useState(0);
  const [replacingAudio, setReplacingAudio] = useState(false);
  const [savingBook, setSavingBook] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef();
  const pdfInputRef = useRef();

  const selectedBook = useMemo(
    () => myBooks.find(book => book.id === selectedBookId),
    [myBooks, selectedBookId],
  );

  const filteredBooks = useMemo(() => {
    if (bookFilter === 'all') return myBooks;
    return myBooks.filter(book => book.status === bookFilter);
  }, [myBooks, bookFilter]);

  const bookCounts = useMemo(() => ({
    all: myBooks.length,
    pending: myBooks.filter(book => book.status === 'pending').length,
    needs_fix: myBooks.filter(book => book.status === 'needs_fix').length,
    published: myBooks.filter(book => book.status === 'published').length,
    rejected: myBooks.filter(book => book.status === 'rejected').length,
  }), [myBooks]);

  const loadMyBooks = useCallback(async () => {
    if (!currentUser) return;

    setLoadingMyBooks(true);
    setError('');
    try {
      const books = await getBooksByOwner(currentUser.uid);
      setMyBooks(books);

      const nextSelected = books.find(book => book.id === selectedBookId) || books[0];
      if (nextSelected) {
        setSelectedBookId(nextSelected.id);
        setEditForm(toEditForm(nextSelected));
      } else {
        setSelectedBookId('');
        setEditForm(null);
      }
    } catch (err) {
      setError('Kitaplarınız alınamadı: ' + err.message);
    } finally {
      setLoadingMyBooks(false);
    }
  }, [currentUser, selectedBookId]);

  function openMyBooks() {
    setTab('mybooks');
    loadMyBooks();
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setAudioFile(null);
    setPdfFile(null);
    setPdfInfo(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  }

  function selectBookForEdit(book) {
    setSelectedBookId(book.id);
    setEditForm(toEditForm(book));
    setReplacementAudioFile(null);
    setNewChapterForm({ chapterTitle: '' });
    setNewChapterAudioFile(null);
    setNewChapterProgress(0);
    setReplacementProgress(0);
    setSuccessMsg('');
    setError('');
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    try {
      validateAudioFile(file);
      setAudioFile(file);
      setError('');
    } catch (err) {
      setAudioFile(null);
      setError(err.message);
    }
  }

  function handleReplacementAudioChange(file) {
    try {
      validateAudioFile(file);
      setReplacementAudioFile(file);
      setError('');
      return;
    } catch (err) {
      setReplacementAudioFile(null);
      setError(err.message);
    }
  }

  function handleNewChapterAudioChange(file) {
    try {
      validateAudioFile(file);
      setNewChapterAudioFile(file);
      setError('');
      return;
    } catch (err) {
      setNewChapterAudioFile(null);
      setError(err.message);
    }
  }

  async function handlePdfFile(file) {
    if (!file) return;

    setError('');
    setSuccessMsg('');
    setPdfInfo(null);

    try {
      setProcessingPdf(true);
      const extracted = await extractPdfBook(file);
      setPdfFile(file);
      setPdfInfo(extracted);
    } catch (err) {
      setPdfFile(null);
      setError('PDF işlenemedi: ' + err.message);
    } finally {
      setProcessingPdf(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!audioFile) return setError('Lütfen önce ses dosyası seçin.');
    if (!form.title.trim()) return setError('Kitap adı zorunludur.');
    if (!currentUser) return setError('Ses yüklemek için giriş yapmalısınız.');

    setUploading(true);
    setUploadProgress(0);
    setSuccessMsg('');
    setError('');

    try {
      const audioUpload = await uploadAudioFile({
        file: audioFile,
        userId: currentUser.uid,
        onProgress: setUploadProgress,
      });
      await createAudioBook({
        form,
        audioUpload,
        currentUser,
        userProfile,
      });
      setSuccessMsg(`"${form.title}" ses dosyasıyla eklendi ve kalite kontrol kuyruğuna gönderildi.`);
      resetForm();
      loadMyBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handlePdfUpload(e) {
    e.preventDefault();
    if (!pdfFile || !pdfInfo) return setError('Lütfen önce seçilebilir metin içeren bir PDF seçin.');
    if (!form.title) return setError('Kitap adı zorunludur.');

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      await createPdfBook({
        form: { ...form, chapterTitle: form.chapterTitle || 'Tam Metin' },
        pdfInfo,
        currentUser,
        userProfile,
        publishImmediately: false,
      });
      setSuccessMsg(`"${form.title}" PDF metniyle eklendi ve kalite kontrol kuyruğuna gönderildi.`);
      resetForm();
      loadMyBooks();
    } catch (err) {
      setError('PDF kaydedilemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleMetadataSave({ resubmit = false } = {}) {
    if (!selectedBook || !editForm) return;
    if (!editForm.title.trim()) return setError('Kitap adı boş olamaz.');

    setSavingBook(true);
    setError('');
    setSuccessMsg('');

    try {
      await updateVolunteerBookMetadata({
        bookId: selectedBook.id,
        ownerId: currentUser.uid,
        form: {
          ...editForm,
          status: selectedBook.status,
          resubmit,
        },
      });
      setSuccessMsg(resubmit ? 'Düzeltmeler kaydedildi ve tekrar incelemeye gönderildi.' : 'Kitap bilgileri kaydedildi.');
      await loadMyBooks();
    } catch (err) {
      setError('Kitap güncellenemedi: ' + err.message);
    } finally {
      setSavingBook(false);
    }
  }

  async function handleAudioReplacementSubmit() {
    if (!selectedBook) return;
    if (!replacementAudioFile) return setError('Lütfen yeni ses dosyasını seçin.');

    setReplacingAudio(true);
    setReplacementProgress(0);
    setSuccessMsg('');
    setError('');

    try {
      const audioUpload = await uploadAudioFile({
        file: replacementAudioFile,
        userId: currentUser.uid,
        onProgress: setReplacementProgress,
      });
      await replaceBookAudioForReview({
        bookId: selectedBook.id,
        ownerId: currentUser.uid,
        audioUpload,
      });
      setReplacementAudioFile(null);
      setSuccessMsg('Yeni ses dosyası yüklendi ve kitap tekrar kalite kontrol kuyruğuna gönderildi.');
      await loadMyBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacingAudio(false);
    }
  }

  async function handleAddChapterSubmit() {
    if (!selectedBook) return;
    if (!newChapterAudioFile) return setError('Lütfen eklenecek bölüm ses dosyasını seçin.');
    if (selectedBook.sourceType !== 'audio_upload') return setError('Bölüm ekleme sadece sesli kitaplarda kullanılabilir.');

    setAddingChapter(true);
    setNewChapterProgress(0);
    setSuccessMsg('');
    setError('');

    try {
      const audioUpload = await uploadAudioFile({
        file: newChapterAudioFile,
        userId: currentUser.uid,
        onProgress: setNewChapterProgress,
      });
      await addAudioChapterToBook({
        book: selectedBook,
        form: newChapterForm,
        audioUpload,
        currentUser,
        userProfile,
      });
      setNewChapterAudioFile(null);
      setNewChapterForm({ chapterTitle: '' });
      setSuccessMsg('Yeni bölüm eklendi ve kitap kalite kontrol kuyruğuna gönderildi.');
      await loadMyBooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingChapter(false);
    }
  }

  return (
    <div className="bm-page">
      <div className="page-header">
        <h1>Kitap Yönetimi</h1>
        <p className="subtitle">Yüklemeleri, kalite kontrol geri bildirimlerini ve düzeltme akışlarını yönetin.</p>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>
          PDF Ekle
        </button>
        <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          Ses Yükle
        </button>
        <button className={`tab-btn ${tab === 'mybooks' ? 'active' : ''}`} onClick={openMyBooks}>
          Kitaplarım
        </button>
      </div>

      {tab === 'upload' && (
        <UploadForm
          audioFile={audioFile}
          error={error}
          fileInputRef={fileInputRef}
          form={form}
          handleFileChange={handleFileChange}
          handleUpload={handleUpload}
          setForm={setForm}
          setTab={setTab}
          successMsg={successMsg}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      )}

      {tab === 'pdf' && (
        <PdfForm
          error={error}
          form={form}
          handlePdfFile={handlePdfFile}
          handlePdfUpload={handlePdfUpload}
          pdfFile={pdfFile}
          pdfInfo={pdfInfo}
          pdfInputRef={pdfInputRef}
          processingPdf={processingPdf}
          setForm={setForm}
          successMsg={successMsg}
          uploading={uploading}
        />
      )}

      {tab === 'mybooks' && (
        <MyBooksPanel
          bookCounts={bookCounts}
          bookFilter={bookFilter}
          editForm={editForm}
          error={error}
          filteredBooks={filteredBooks}
          handleMetadataSave={handleMetadataSave}
          handleAudioReplacementSubmit={handleAudioReplacementSubmit}
          handleAddChapterSubmit={handleAddChapterSubmit}
          handleNewChapterAudioChange={handleNewChapterAudioChange}
          handleReplacementAudioChange={handleReplacementAudioChange}
          addingChapter={addingChapter}
          loadMyBooks={loadMyBooks}
          loadingMyBooks={loadingMyBooks}
          myBooks={myBooks}
          newChapterAudioFile={newChapterAudioFile}
          newChapterForm={newChapterForm}
          newChapterProgress={newChapterProgress}
          replacementAudioFile={replacementAudioFile}
          replacementProgress={replacementProgress}
          replacingAudio={replacingAudio}
          savingBook={savingBook}
          selectBookForEdit={selectBookForEdit}
          selectedBook={selectedBook}
          selectedBookId={selectedBookId}
          setBookFilter={setBookFilter}
          setEditForm={setEditForm}
          setNewChapterForm={setNewChapterForm}
          setTab={setTab}
          successMsg={successMsg}
        />
      )}
    </div>
  );
}

function UploadForm({
  audioFile,
  error,
  fileInputRef,
  form,
  handleFileChange,
  handleUpload,
  setForm,
  setTab,
  successMsg,
  uploading,
  uploadProgress,
}) {
  return (
    <div className="upload-grid">
      <div className="card upload-form-card">
        <h3>Ses Yükleme</h3>
        <div className="storage-waiting-box">
          <strong>Ses yükleme kontrollü aktif</strong>
          <p>Ücretsiz kotayı korumak için tek dosya sınırı {MAX_AUDIO_MB} MB. Kısa, sıkıştırılmış MP3/M4A/WebM dosyaları tercih edin; kalite kontrol onayından sonra yayına alınır.</p>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="success-msg">{successMsg}</div>}

        <form onSubmit={handleUpload} className="auth-form">
          <BookFields form={form} setForm={setForm} />
          <div
            className="dropzone"
            onClick={() => fileInputRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handleFileChange({ target: { files: e.dataTransfer.files } });
            }}
          >
            {audioFile ? (
              <div className="dropzone-selected">
                <span>AUD</span>
                <div>
                  <strong>{audioFile.name}</strong>
                  <p>{formatBytes(audioFile.size)} / {MAX_AUDIO_MB} MB sınır</p>
                </div>
              </div>
            ) : (
              <div className="dropzone-empty">
                <p><strong>Ses dosyası seçin</strong></p>
                <p className="dropzone-hint">MP3, M4A, AAC, WebM, OGG veya WAV - en fazla {MAX_AUDIO_MB} MB</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} accept="audio/*,.mp3,.m4a,.aac,.webm,.ogg,.wav" onChange={handleFileChange} hidden />
          </div>

          {uploading && (
            <div className="upload-progress">
              <span>Yükleniyor</span>
              <strong>{uploadProgress}%</strong>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${uploadProgress}%`, background: 'var(--color-primary)' }}></div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-sage btn-auth" disabled={uploading}>
            {uploading ? `Yükleniyor %${uploadProgress}` : 'Kalite Kontrole Gönder'}
          </button>
          <button type="button" className="btn-outline btn-auth" onClick={() => setTab('pdf')}>
            PDF Akışına Geç
          </button>
        </form>
      </div>

      <ProcessHelpCard type="audio" />
    </div>
  );
}

function PdfForm({
  error,
  form,
  handlePdfFile,
  handlePdfUpload,
  pdfFile,
  pdfInfo,
  pdfInputRef,
  processingPdf,
  setForm,
  successMsg,
  uploading,
}) {
  return (
    <div className="upload-grid">
      <div className="card upload-form-card">
        <h3>PDF ile Kitap Ekle</h3>
        <p className="form-intro">Bugünkü ana akış budur: seçilebilir metinli PDF yüklenir, sistem metni parçalara ayırır ve admin onayından sonra doğal ses üretimi için kuyruğa alınır.</p>
        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="success-msg">{successMsg}</div>}

        <form onSubmit={handlePdfUpload} className="auth-form">
          <BookFields form={form} setForm={setForm} />
          <div
            className="dropzone"
            onClick={() => pdfInputRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              handlePdfFile(e.dataTransfer.files[0]);
            }}
          >
            {processingPdf ? (
              <div className="dropzone-empty">
                <p><strong>PDF metni çıkarılıyor...</strong></p>
              </div>
            ) : pdfInfo ? (
              <div className="dropzone-selected">
                <span>PDF</span>
                <div>
                  <strong>{pdfFile.name}</strong>
                  <p>{pdfInfo.pageCount} sayfa / {pdfInfo.chunks.length} parça / {pdfInfo.wordCount} kelime</p>
                </div>
              </div>
            ) : (
              <div className="dropzone-empty">
                <p><strong>Seçilebilir metinli PDF seçin</strong></p>
                <p className="dropzone-hint">Taranmış PDF için OCR yok</p>
              </div>
            )}
            <input type="file" ref={pdfInputRef} accept="application/pdf,.pdf" onChange={e => handlePdfFile(e.target.files[0])} hidden />
          </div>

          {pdfInfo && (
            <div className="pdf-preview">
              <strong>İlk metin önizlemesi</strong>
              <p>{pdfInfo.chunks[0]?.text.slice(0, 420)}...</p>
            </div>
          )}

          <button type="submit" className="btn-sage btn-auth" disabled={uploading || processingPdf}>
            {uploading ? 'PDF kaydediliyor...' : 'PDF Metnini Sisteme Ekle'}
          </button>
        </form>
      </div>

      <ProcessHelpCard type="pdf" />
    </div>
  );
}

function BookFields({ form, setForm }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Kitap Adı *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Yazar</label>
          <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Kayıt / Bölüm Başlığı</label>
          <input
            value={form.chapterTitle}
            onChange={e => setForm({ ...form, chapterTitle: e.target.value })}
            placeholder="Boş kalırsa kitap adı kullanılır"
          />
        </div>
        <div className="form-group">
          <label>Kategori</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>İçerik dili</label>
          <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
            <option value="tr-TR">Türkçe</option>
            <option value="en-US">İngilizce</option>
          </select>
        </div>
        <div className="form-group">
          <label>Kaynak</label>
          <input value={form.sourceNote} onChange={e => setForm({ ...form, sourceNote: e.target.value })} />
        </div>
      </div>

      <div className="form-group">
        <label>Telif / İzin Notu</label>
        <input value={form.permissionNote} onChange={e => setForm({ ...form, permissionNote: e.target.value })} />
      </div>

      <div className="form-group">
        <label>Gönüllü Notu</label>
        <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
    </>
  );
}

function ProcessHelpCard({ type }) {
  return (
    <div>
      <div className="card dark-card">
        <h3 style={{ color: '#fff' }}>{type === 'pdf' ? 'PDF Akışı' : 'Erişilebilirlik Kontrolü'}</h3>
        <p style={{ color: '#b0c8a8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          {type === 'pdf'
            ? 'PDF metni parçalara ayrılır ve admin onayından sonra dinleme modunda okunur.'
            : 'Ses yüklemesi admin kalite kontrolünden sonra dinleyici kütüphanesine girer.'}
        </p>
        <ul style={{ color: '#c8ddc0', paddingLeft: '1.2rem', lineHeight: '2' }}>
          <li>Kaynak ve izin notu net olmalı</li>
          <li>Admin notları Kitaplarım ekranına düşer</li>
          <li>Düzeltme sonrası tekrar incelemeye gönderilebilir</li>
        </ul>
      </div>
    </div>
  );
}

function MyBooksPanel({
  addingChapter,
  bookCounts,
  bookFilter,
  editForm,
  error,
  filteredBooks,
  handleAddChapterSubmit,
  handleMetadataSave,
  handleAudioReplacementSubmit,
  handleNewChapterAudioChange,
  handleReplacementAudioChange,
  loadMyBooks,
  loadingMyBooks,
  myBooks,
  newChapterAudioFile,
  newChapterForm,
  newChapterProgress,
  replacementAudioFile,
  replacementProgress,
  replacingAudio,
  savingBook,
  selectBookForEdit,
  selectedBook,
  selectedBookId,
  setBookFilter,
  setEditForm,
  setNewChapterForm,
  setTab,
  successMsg,
}) {
  return (
    <div className="card my-books-panel">
      <div className="my-books-header">
        <div>
          <h3>Kitaplarım</h3>
          <p>Yüklemeleri takip edin, admin notlarını yanıtlayın ve düzeltmeleri tekrar incelemeye gönderin.</p>
        </div>
        <button className="btn-outline" type="button" onClick={loadMyBooks} disabled={loadingMyBooks}>
          Yenile
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {successMsg && <div className="success-msg">{successMsg}</div>}

      {loadingMyBooks ? (
        <p className="my-books-empty">Kitaplarınız yükleniyor...</p>
      ) : myBooks.length === 0 ? (
        <div className="my-books-empty-state">
          <p className="my-books-empty-icon">BK</p>
          <h3>Henüz yükleme yapmadınız.</h3>
          <p>İlk katkı için seçilebilir metin içeren bir PDF ekleyin. Sistem metni çıkarıp admin onayına gönderecek.</p>
          <button className="btn-sage" type="button" onClick={() => setTab('pdf')}>
            İlk PDF'imi Ekle
          </button>
        </div>
      ) : (
        <div className="my-books-workspace">
          <div className="my-books-toolbar">
            {[
              ['all', 'Tümü'],
              ['needs_fix', 'Düzeltme'],
              ['pending', 'Onayda'],
              ['published', 'Yayında'],
              ['rejected', 'Red'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={bookFilter === value ? 'filter-chip active' : 'filter-chip'}
                type="button"
                onClick={() => setBookFilter(value)}
              >
                {label} <span>{bookCounts[value] || 0}</span>
              </button>
            ))}
          </div>

          <div className="my-books-split">
            <div className="my-books-list">
              {filteredBooks.map(book => (
                <button
                  className={book.id === selectedBookId ? 'my-book-card active' : 'my-book-card'}
                  key={book.id}
                  type="button"
                  onClick={() => selectBookForEdit(book)}
                >
                  <div className="my-book-main">
                    <div>
                      <span className={`status-pill ${getStatusTone(book.status)}`}>{getStatusLabel(book.status)}</span>
                      <h3>{book.title || 'İsimsiz kitap'}</h3>
                      <p>{book.author || 'Yazar belirtilmedi'} / {book.category || 'Kategori yok'}</p>
                    </div>
                    <span className="source-pill">{formatSource(book)}</span>
                  </div>
                  <div className="my-book-mini-meta">
                    <span>{formatLanguage(book.language)}</span>
                    <span>{formatDuration(book)}</span>
                    {book.reviewNote && <strong>Admin notu var</strong>}
                  </div>
                </button>
              ))}
            </div>

            <BookCorrectionPanel
              editForm={editForm}
              handleMetadataSave={handleMetadataSave}
              handleAddChapterSubmit={handleAddChapterSubmit}
              handleAudioReplacementSubmit={handleAudioReplacementSubmit}
              handleNewChapterAudioChange={handleNewChapterAudioChange}
              handleReplacementAudioChange={handleReplacementAudioChange}
              addingChapter={addingChapter}
              newChapterAudioFile={newChapterAudioFile}
              newChapterForm={newChapterForm}
              newChapterProgress={newChapterProgress}
              replacementAudioFile={replacementAudioFile}
              replacementProgress={replacementProgress}
              replacingAudio={replacingAudio}
              savingBook={savingBook}
              selectedBook={selectedBook}
              setEditForm={setEditForm}
              setNewChapterForm={setNewChapterForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BookCorrectionPanel({
  addingChapter,
  editForm,
  handleAddChapterSubmit,
  handleAudioReplacementSubmit,
  handleNewChapterAudioChange,
  handleMetadataSave,
  handleReplacementAudioChange,
  newChapterAudioFile,
  newChapterForm,
  newChapterProgress,
  replacementAudioFile,
  replacementProgress,
  replacingAudio,
  savingBook,
  selectedBook,
  setEditForm,
  setNewChapterForm,
}) {
  if (!selectedBook || !editForm) {
    return (
      <aside className="book-correction-panel">
        <p className="my-books-empty">Detay görmek için bir kitap seçin.</p>
      </aside>
    );
  }

  const canResubmit = ['needs_fix', 'rejected'].includes(selectedBook.status);
  const canAddChapter = selectedBook.sourceType === 'audio_upload';

  return (
    <aside className="book-correction-panel">
      <div className="correction-header">
        <div>
          <span className={`status-pill ${getStatusTone(selectedBook.status)}`}>{getStatusLabel(selectedBook.status)}</span>
          <h3>{selectedBook.title}</h3>
        </div>
        <span className="source-pill">{formatSource(selectedBook)}</span>
      </div>

      {selectedBook.reviewNote && (
        <div className="admin-note-box">
          <strong>Admin düzeltme notu</strong>
          <p>{selectedBook.reviewNote}</p>
        </div>
      )}

      <div className="correction-guidance">
        <strong>Bu aşamada ne yapılır?</strong>
        <p>{getVolunteerActionText(selectedBook)}</p>
      </div>

      <div className="correction-form">
        <div className="form-row">
          <div className="form-group">
            <label>Kitap Adı</label>
            <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Yazar</label>
            <input value={editForm.author} onChange={e => setEditForm({ ...editForm, author: e.target.value })} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Kategori</label>
            <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>İçerik dili</label>
            <select value={editForm.language} onChange={e => setEditForm({ ...editForm, language: e.target.value })}>
              <option value="tr-TR">Türkçe</option>
              <option value="en-US">İngilizce</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Gönüllü Notu</label>
          <textarea rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Kaynak</label>
            <input value={editForm.sourceNote} onChange={e => setEditForm({ ...editForm, sourceNote: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Telif / İzin Notu</label>
            <input value={editForm.permissionNote} onChange={e => setEditForm({ ...editForm, permissionNote: e.target.value })} />
          </div>
        </div>
      </div>

      {canAddChapter && (
        <div className="audio-replacement-box">
          <strong>Yeni bölüm ekle</strong>
          <p>Uzun hikaye veya kitapları 25 MB altı parçalara bölün. Yeni bölüm eklenince kitap tekrar kalite kontrol kuyruğuna düşer.</p>
          <div className="form-group">
            <label>Bölüm başlığı</label>
            <input
              value={newChapterForm.chapterTitle}
              onChange={e => setNewChapterForm({ ...newChapterForm, chapterTitle: e.target.value })}
              placeholder={`Bölüm ${(selectedBook.chapterCount || 0) + 1}`}
            />
          </div>
          <label className="replacement-file-picker">
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.webm,.ogg,.wav"
              onChange={e => handleNewChapterAudioChange(e.target.files[0])}
            />
            <span>{newChapterAudioFile ? `${newChapterAudioFile.name} (${formatBytes(newChapterAudioFile.size)})` : 'Bölüm ses dosyası seç'}</span>
          </label>
          {addingChapter && (
            <div className="upload-progress compact">
              <span>Bölüm yükleniyor</span>
              <strong>{newChapterProgress}%</strong>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${newChapterProgress}%`, background: 'var(--color-primary)' }}></div>
              </div>
            </div>
          )}
          <button
            className="btn-sage"
            type="button"
            onClick={handleAddChapterSubmit}
            disabled={addingChapter || !newChapterAudioFile}
          >
            {addingChapter ? 'Yükleniyor...' : 'Bölümü Ekle'}
          </button>
        </div>
      )}

      {selectedBook.sourceType === 'audio_upload' && canResubmit && (
        <div className="audio-replacement-box">
          <strong>İlk bölüm sesini değiştir</strong>
          <p>Yeni dosya en fazla {MAX_AUDIO_MB} MB olabilir. Çok bölümlü kitaplarda bu işlem ilk bölümü değiştirir; yeni parça eklemek için yukarıdaki bölüm ekleme alanını kullanın.</p>
          <label className="replacement-file-picker">
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.webm,.ogg,.wav"
              onChange={e => handleReplacementAudioChange(e.target.files[0])}
            />
            <span>{replacementAudioFile ? `${replacementAudioFile.name} (${formatBytes(replacementAudioFile.size)})` : 'Yeni ses dosyası seç'}</span>
          </label>
          {replacingAudio && (
            <div className="upload-progress compact">
              <span>Yeni ses yükleniyor</span>
              <strong>{replacementProgress}%</strong>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${replacementProgress}%`, background: 'var(--color-primary)' }}></div>
              </div>
            </div>
          )}
          <button
            className="btn-sage"
            type="button"
            onClick={handleAudioReplacementSubmit}
            disabled={replacingAudio}
          >
            {replacingAudio ? 'Yükleniyor...' : 'Yeni Sesi Gönder'}
          </button>
        </div>
      )}

      <div className="correction-actions">
        <button className="btn-outline" type="button" onClick={() => handleMetadataSave()} disabled={savingBook}>
          Bilgileri Kaydet
        </button>
        <button className="btn-sage" type="button" onClick={() => handleMetadataSave({ resubmit: true })} disabled={savingBook || !canResubmit}>
          {savingBook ? 'Kaydediliyor...' : 'Tekrar İncelemeye Gönder'}
        </button>
      </div>
    </aside>
  );
}

function toEditForm(book) {
  return {
    title: book.title || '',
    author: book.author || '',
    category: book.category || 'Roman',
    language: book.language || 'tr-TR',
    notes: book.description || '',
    sourceNote: book.sourceNote || '',
    permissionNote: book.permissionNote || '',
  };
}

function getVolunteerActionText(book) {
  if (book.status === 'needs_fix') return 'Admin notunu okuyup eksik metadata veya kaynak/izin bilgisini düzeltin, sonra tekrar incelemeye gönderin.';
  if (book.status === 'rejected') return 'İçerik reddedildi. Not uygunsa bilgileri düzeltip tekrar incelemeye gönderebilir veya yeni yükleme yapabilirsiniz.';
  if (book.status === 'pending') return 'İçerik kalite kontrol kuyruğunda. Admin kararı geldikten sonra buradan takip edebilirsiniz.';
  if (book.status === 'published') return 'İçerik yayında. Metadata düzeltmesi yapabilirsiniz, ancak yayındaki içeriği değiştirmek için admin akışı gerekebilir.';
  return 'Bu kitap için güncel durumu ve notları buradan takip edin.';
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

function formatSource(book) {
  if (book.sourceType === 'pdf') return 'PDF';
  if (book.sourceType === 'audio_upload') return 'Ses';
  return book.sourceType || 'Kaynak';
}

function formatLanguage(language) {
  if (language === 'tr-TR' || language === 'Türkçe') return 'Türkçe';
  if (language === 'en-US' || language === 'İngilizce') return 'İngilizce';
  return language || '-';
}

function formatDuration(book) {
  if (book.estimatedReadingMinutes) return `${book.estimatedReadingMinutes} dk`;
  if (book.totalDurationSec) return `${Math.max(1, Math.round(book.totalDurationSec / 60))} dk`;
  return '-';
}
