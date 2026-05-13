import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMenuUtterance } from '../services/speechService';
import { normalizeText } from '../services/textUtils';

const recognitionConstructor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const INTRO_MESSAGE =
  'Duyum ana giriş ekranına hoş geldiniz. Dinleyici modu için dinleyici deyin veya bir tuşuna basın. Gönüllü girişi için gönüllü deyin veya iki tuşuna basın.';

export default function EntryChoice() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Dinleyici modu veya gönüllü paneli için seçim yapın.');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const recognitionSupported = Boolean(recognitionConstructor);

  const speechSupported = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    [],
  );

  function speak(message) {
    setStatus(message);
    if (!speechSupported) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(createMenuUtterance(message));
  }

  function goToBlind() {
    speak('Dinleyici modu açılıyor.');
    window.setTimeout(() => navigate('/blind'), 350);
  }

  function goToVolunteer() {
    speak('Gönüllü giriş ekranı açılıyor.');
    window.setTimeout(() => navigate('/login'), 350);
  }

  function handleCommand(rawCommand = '') {
    const command = normalizeText(rawCommand);

    if (hasAny(command, ['dinleyici', 'dinle', 'kör', 'kor', 'gorme engelli', 'görme engelli', 'blind', 'bir', '1'])) {
      goToBlind();
      return;
    }

    if (hasAny(command, ['gonullu', 'gönüllü', 'volunteer', 'giris', 'giriş', 'admin', 'iki', '2'])) {
      goToVolunteer();
      return;
    }

    if (hasAny(command, ['yardim', 'yardım', 'komut', 'ne diyebilirim'])) {
      speak(INTRO_MESSAGE);
      return;
    }

    speak('Komut anlaşılmadı. Dinleyici ya da gönüllü diyebilirsiniz.');
  }

  function startListening() {
    if (!recognitionSupported) {
      speak('Bu tarayıcı sesli komutları desteklemiyor. Dinleyici modu için bir, gönüllü girişi için iki tuşuna basabilirsiniz.');
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new recognitionConstructor();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setStatus('Dinliyorum. Dinleyici veya gönüllü deyin.');
    };

    recognition.onerror = () => {
      setListening(false);
      speak('Sesli komut alınamadı. Tekrar deneyebilir veya ekrandaki büyük düğmeleri kullanabilirsiniz.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      handleCommand(transcript);
    };

    recognition.start();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target.tagName === 'INPUT') return;

      if (event.key === '1') {
        event.preventDefault();
        goToBlind();
      }

      if (event.key === '2') {
        event.preventDefault();
        goToVolunteer();
      }

      if (event.key === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        startListening();
      }

      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        speak(INTRO_MESSAGE);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
    // Keyboard shortcuts should be bound once on the entry screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="entry-page" aria-labelledby="entry-title">
      <section className="entry-hero">
        <div className="entry-brand">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>
            <strong>Duyum</strong>
            <small>Erişilebilir sesli kütüphane</small>
          </span>
        </div>

        <p className="entry-kicker">Ana giriş</p>
        <h1 id="entry-title">Nasıl devam etmek istersiniz?</h1>
        <p className="entry-status" role="status" aria-live="polite">{status}</p>

        <div className="entry-voice-actions">
          <button className="entry-voice-button" type="button" onClick={startListening}>
            {listening ? 'Dinliyorum...' : 'Sesli Komut Ver'}
          </button>
          <button className="entry-help-button" type="button" onClick={() => speak(INTRO_MESSAGE)}>
            Sesli Yönlendirme
          </button>
        </div>
      </section>

      <section className="entry-choice-grid" aria-label="Giriş seçenekleri">
        <button className="entry-choice-card listener" type="button" onClick={goToBlind}>
          <span>1</span>
          <strong>Dinleyici Modu</strong>
          <small>Sesli komutlarla kitap ve duyuru dinleme ekranı</small>
        </button>

        <button className="entry-choice-card volunteer" type="button" onClick={goToVolunteer}>
          <span>2</span>
          <strong>Gönüllü Girişi</strong>
          <small>Kitap yükleme, kayıt ve yönetim paneli</small>
        </button>
      </section>
    </main>
  );
}

function hasAny(command, phrases) {
  return phrases.some((phrase) => command.includes(normalizeText(phrase)));
}
