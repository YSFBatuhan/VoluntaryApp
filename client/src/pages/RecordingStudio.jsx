import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MAX_AUDIO_MB, uploadAudioFile, validateAudioFile } from '../services/audioService';
import { createAudioBook } from '../services/libraryService';

const CATEGORIES = ['Roman', 'Ders Notu', 'Şiir', 'Tarih', 'Bilim', 'GTÜ Duyurusu', 'Diğer'];

const EMPTY_RECORDING_FORM = {
  title: '',
  author: '',
  category: 'Ders Notu',
  chapterTitle: '',
  language: 'tr-TR',
  notes: '',
  sourceNote: '',
  permissionNote: '',
};

export default function RecordingStudio() {
  const { currentUser, userProfile } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [form, setForm] = useState(EMPTY_RECORDING_FORM);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  function startTimer() {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }

  function stopTimer() {
    clearInterval(timerRef.current);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      setRecordedBlob(null);
      setAudioURL(null);
      setError('');
      setSuccessMsg('');
      startTimer();
    } catch {
      setError('Mikrofon izni alınamadı. Tarayıcı ayarlarından mikrofon izni vermen gerekiyor.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  }

  function resetRecording() {
    if (audioURL) URL.revokeObjectURL(audioURL);
    setAudioURL(null);
    setRecordedBlob(null);
    setDuration(0);
    setUploadProgress(0);
    setSuccessMsg('');
    setError('');
  }

  async function submitRecording(event) {
    event.preventDefault();
    if (!recordedBlob) return setError('Önce bir kayıt oluşturmalısın.');
    if (!form.title.trim()) return setError('Kitap adı zorunlu.');
    if (!currentUser) return setError('Ses kaydı göndermek için giriş yapmalısın.');

    const recordingFile = new File(
      [recordedBlob],
      `${form.title.trim() || 'kayit'}-${Date.now()}.webm`,
      { type: recordedBlob.type || 'audio/webm' },
    );

    try {
      validateAudioFile(recordingFile);
    } catch (err) {
      return setError(err.message);
    }

    setUploading(true);
    setUploadProgress(0);
    setSuccessMsg('');
    setError('');

    try {
      const audioUpload = await uploadAudioFile({
        file: recordingFile,
        userId: currentUser.uid,
        onProgress: setUploadProgress,
      });
      await createAudioBook({
        form,
        audioUpload,
        currentUser,
        userProfile,
      });
      setSuccessMsg('Ses kaydı kalite kontrol kuyruğuna gönderildi.');
      resetRecording();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  return (
    <div className="studio-page">
      <div className="page-header">
        <h1>Kayıt Stüdyosu</h1>
        <p className="subtitle">Mikrofondan kayıt al, önizle ve kalite kontrol kuyruğuna gönder. Tek kayıt sınırı {MAX_AUDIO_MB} MB.</p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {successMsg && <div className="success-msg" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

      <div className="card currently-recording-card" style={{ marginBottom: '2rem' }}>
        <div className="studio-main-panel">
          <div>
            <div className="badge-light" style={{ display: 'inline-block', marginBottom: '1rem' }}>
              {isRecording ? 'Kayıt devam ediyor' : recordedBlob ? 'Kayıt hazır' : 'Mikrofon hazır'}
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>Yeni ses kaydı</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem 0' }}>
              Kaydı tamamladıktan sonra önizle. Uygunsa aşağıdaki bilgilerle admin kalite kontrolüne gönder.
            </p>

            <div className="studio-checklist">
              <span>Arka plan sessiz</span>
              <span>Mikrofon yakınlığı uygun</span>
              <span>Okuma hızı dengeli</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              {!isRecording ? (
                <button className="btn-sage" onClick={startRecording}>
                  Kaydı Başlat
                </button>
              ) : (
                <button className="btn-sage" onClick={stopRecording} style={{ background: '#b42318' }}>
                  Kaydı Durdur · {formatTime(duration)}
                </button>
              )}
              {recordedBlob && (
                <button className="btn-outline" type="button" onClick={resetRecording}>
                  Sil ve Tekrar Kaydet
                </button>
              )}
            </div>
          </div>

          <div className="waveform-box">
            {isRecording ? (
              <div className="live-wave">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }}></div>
                ))}
              </div>
            ) : audioURL ? (
              <div className="studio-preview">
                <strong>Kayıt önizlemesi</strong>
                <audio controls src={audioURL} style={{ width: '100%' }} />
                <span>{formatTime(duration)} kayıt</span>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                <strong>Beklemede</strong>
                <p>Kayda başlamak için mikrofon izni gerekir.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <form className="card studio-submit-card auth-form" onSubmit={submitRecording}>
        <div>
          <h3>Kitap ve bölüm bilgileri</h3>
          <p>Kayıtlar Firebase Storage'a yüklenir ve admin onayından sonra yayına alınır. Kısa kayıtlar ücretsiz kota için daha uygundur.</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Kitap Adı *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Kayıt / Bölüm Başlığı</label>
            <input
              value={form.chapterTitle}
              onChange={e => setForm({ ...form, chapterTitle: e.target.value })}
              placeholder="Boş kalırsa kitap adı kullanılır"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Yazar</label>
            <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Kategori</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(category => <option key={category}>{category}</option>)}
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

        {uploading && (
          <div className="upload-progress compact">
            <span>Kayıt yükleniyor</span>
            <strong>{uploadProgress}%</strong>
            <div className="progress-bar">
              <div className="fill" style={{ width: `${uploadProgress}%`, background: 'var(--color-primary)' }}></div>
            </div>
          </div>
        )}

        <button className="btn-sage btn-auth" type="submit" disabled={!recordedBlob || uploading}>
          {uploading ? `Yükleniyor %${uploadProgress}` : 'Kalite Kontrole Gönder'}
        </button>
      </form>
    </div>
  );
}
