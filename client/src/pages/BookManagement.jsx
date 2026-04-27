import React, { useState, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

// Ses dosyaları için Cloudinary kullanılacak (ücretsiz 25GB)
// uploadAudio fonksiyonu Cloudinary entegrasyonu tamamlandığında buraya eklenecek
async function uploadAudioToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'echovoices_audio');
  formData.append('resource_type', 'video'); // Cloudinary ses dosyaları için 'video' kullanır

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME';

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status === 200) resolve(data.secure_url);
      else reject(new Error(data.error?.message || 'Yükleme başarısız'));
    };
    xhr.onerror = () => reject(new Error('Ağ hatası'));
    xhr.send(formData);
  });
}

const CATEGORIES = ['Roman', 'Ders Notu', 'Şiir', 'Tarih', 'Bilim', 'GTÜ Duyurusu', 'Diğer'];

export default function BookManagement() {
  const { currentUser, userProfile } = useAuth();
  const [tab, setTab] = useState('upload'); // 'upload' | 'mybooks'
  const [form, setForm] = useState({
    title: '', author: '', category: 'Roman', chapterTitle: '', language: 'Türkçe', notes: ''
  });
  const [audioFile, setAudioFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef();

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
      setAudioFile(file);
      setError('');
    } else {
      setError('Lütfen geçerli bir ses dosyası seçin (.mp3, .wav)');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!audioFile) return setError('Lütfen bir ses dosyası seçin.');
    if (!form.title || !form.chapterTitle) return setError('Kitap adı ve bölüm adı zorunludur.');

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      // 1. Cloudinary'ye ses dosyasını yükle
      const audioUrl = await uploadAudioToCloudinary(audioFile, setUploadProgress);

      // 2. Firestore'a kitap + bölüm bilgilerini kaydet
      const bookRef = await addDoc(collection(db, 'books'), {
        title: form.title,
        author: form.author,
        category: form.category,
        language: form.language,
        notes: form.notes,
        uploadedBy: currentUser.uid,
        uploaderName: userProfile?.name || currentUser.displayName,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'chapters'), {
        bookId: bookRef.id,
        chapterTitle: form.chapterTitle,
        audioUrl,
        duration: 0,
        recordedBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      setSuccessMsg(`"${form.title}" başarıyla yüklendi! Admin onayından sonra yayınlanacak.`);
      setForm({ title: '', author: '', category: 'Roman', chapterTitle: '', language: 'Türkçe', notes: '' });
      setAudioFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError('Hata: ' + err.message);
    }
    setUploading(false);
  }

  return (
    <div className="bm-page">
      <div className="page-header">
        <h1>Book Management</h1>
        <p className="subtitle">Sesli kitaplarınızı yükleyin ve yönetin.</p>
      </div>

      {/* Sekmeler */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          📁 Yeni Yükle
        </button>
        <button className={`tab-btn ${tab === 'mybooks' ? 'active' : ''}`} onClick={() => setTab('mybooks')}>
          📚 Kitaplarım
        </button>
      </div>

      {tab === 'upload' && (
        <div className="upload-grid">
          {/* Sol Form */}
          <div className="card upload-form-card">
            <h3>Kitap / Bölüm Bilgileri</h3>

            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="success-msg">{successMsg}</div>}

            <form onSubmit={handleUpload} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Kitap Adı *</label>
                  <input type="text" placeholder="Ör: Nutuk" value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Yazar</label>
                  <input type="text" placeholder="Ör: Mustafa Kemal Atatürk" value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Bölüm Adı *</label>
                  <input type="text" placeholder="Ör: Bölüm 1 - Başlangıç" value={form.chapterTitle}
                    onChange={e => setForm({ ...form, chapterTitle: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Dil</label>
                <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                  <option>Türkçe</option>
                  <option>İngilizce</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notlar (Okuma Yönergeleri)</label>
                <textarea placeholder="Telaffuz ipuçları, karakter notları..." value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>

              {/* Dosya Yükleme */}
              <div
                className="dropzone"
                onClick={() => fileInputRef.current.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setAudioFile(e.dataTransfer.files[0]); }}
              >
                {audioFile ? (
                  <div className="dropzone-selected">
                    <span>🎵</span>
                    <div>
                      <strong>{audioFile.name}</strong>
                      <p>{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="dropzone-empty">
                    <span style={{ fontSize: '2.5rem' }}>☁️</span>
                    <p><strong>Ses dosyası seçin</strong></p>
                    <p className="dropzone-hint">MP3, WAV veya AAC • Maks 100MB</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} accept="audio/*" onChange={handleFileChange} hidden />
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span>Yükleniyor...</span>
                    <strong>{uploadProgress}%</strong>
                  </div>
                  <div className="progress-bar" style={{ height: '10px', borderRadius: '5px' }}>
                    <div className="fill" style={{ width: `${uploadProgress}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '5px', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-sage btn-auth" disabled={uploading} style={{ marginTop: '1.5rem' }}>
                {uploading ? `Yükleniyor %${uploadProgress}...` : '📤 Yükle ve Onaya Gönder'}
              </button>
            </form>
          </div>

          {/* Sağ Bilgi Kartı */}
          <div>
            <div className="card dark-card">
              <h3 style={{ color: '#fff' }}>♿ Erişilebilirlik Kontrolü</h3>
              <p style={{ color: '#b0c8a8', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                Yüklemeniz; ses kalitesi, netlik ve pacing açısından görme engelli dinleyicilerin standartlarını karşılamalıdır.
              </p>
              <ul style={{ color: '#c8ddc0', paddingLeft: '1.2rem', lineHeight: '2' }}>
                <li>Arka plan gürültüsü olmamalı</li>
                <li>Net ve yavaş konuşma temposu</li>
                <li>Minimum 128kbps ses kalitesi</li>
                <li>Bölüm başında ve sonunda 2 sn sessizlik</li>
              </ul>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h3>📋 Süreç</h3>
              <div className="timeline">
                <div className="timeline-item done"><span>✓</span><div><strong>Yükleme</strong><p>Dosyanızı platforma gönderin</p></div></div>
                <div className="timeline-item"><span>2</span><div><strong>Kalite Kontrol</strong><p>Admin ekibi inceliyor</p></div></div>
                <div className="timeline-item"><span>3</span><div><strong>Yayın</strong><p>Dinleyiciler erişebilir</p></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'mybooks' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</p>
          <h3 style={{ color: 'var(--color-text-muted)' }}>Henüz yükleme yapmadınız.</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>İlk kitabınızı yüklemek için "Yeni Yükle" sekmesine geçin.</p>
          <button className="btn-sage" style={{ marginTop: '1.5rem' }} onClick={() => setTab('upload')}>
            + İlk Kitabımı Yükle
          </button>
        </div>
      )}
    </div>
  );
}
