import React, { useState, useRef, useEffect } from 'react';

export default function RecordingStudio() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentBook, setCurrentBook] = useState('The Secret Garden');
  const [currentChapter, setCurrentChapter] = useState('Chapter 12: Might it be a Garden?');

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
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      setAudioURL(null);
      startTimer();
    } catch {
      alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  }

  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div className="studio-page">
      <div className="page-header">
        <h1>Recording Studio</h1>
        <p className="subtitle">Sesinizi kaydedin ve dinleyicilere ulaştırın.</p>
      </div>

      {/* Şu Anki Proje */}
      <div className="card currently-recording-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div className="badge-light" style={{ display: 'inline-block', marginBottom: '1rem' }}>
              {isRecording ? '🔴 Kayıt Devam Ediyor' : 'Aktif Proje'}
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>{currentBook}</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem 0' }}>
              Sıradaki: <strong>{currentChapter}</strong>
            </p>

            {/* Progress */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--color-text-muted)' }}>
                <span>65% Tamamlandı</span>
              </div>
              <div className="progress-bar" style={{ height: '8px', borderRadius: '4px' }}>
                <div className="fill" style={{ width: '65%', background: 'var(--color-primary)', height: '100%', borderRadius: '4px' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {!isRecording ? (
                <button className="btn-sage" onClick={startRecording}>
                  ▶ Kaydı Başlat
                </button>
              ) : (
                <button className="btn-sage" onClick={stopRecording} style={{ background: '#c0392b' }}>
                  ⏹ Kaydı Durdur — {formatTime(duration)}
                </button>
              )}
              <button className="btn-outline">📄 Script'i Görüntüle</button>
            </div>
          </div>

          {/* Dalga animasyonu */}
          <div className="waveform-box">
            {isRecording ? (
              <div className="live-wave">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }}></div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                <span style={{ fontSize: '3rem' }}>🎙️</span>
                <p>Kayıt bekleniyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kaydedilen ses varsa dinle */}
      {audioURL && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>✅ Kayıt Tamamlandı — Önizleme</h3>
          <audio controls src={audioURL} style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn-sage">📤 Onaya Gönder</button>
            <button className="btn-outline" onClick={() => { setAudioURL(null); setDuration(0); }}>🗑 Sil ve Tekrarla</button>
          </div>
        </div>
      )}

      {/* İpuçları */}
      <div className="card dark-card">
        <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>💧 Narrator Wellness</h3>
        <p style={{ color: '#b0c8a8', margin: 0 }}>
          Her 20 dakikada bir su için, vokal netliğinizi koruyun. Kayıt öncesi birkaç derin nefes alın.
        </p>
      </div>
    </div>
  );
}
