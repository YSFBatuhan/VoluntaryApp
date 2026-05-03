import { useEffect, useMemo, useRef, useState } from 'react';
import { getBookTextChunks, getPublishedBooks } from '../services/libraryService';
import { normalizeText } from '../services/textUtils';
import { GTU_DEPARTMENTS, SAMPLE_GTU_ANNOUNCEMENTS } from '../data/gtuAnnouncements';

const MOCK_BOOKS = [
  {
    id: 'nutuk',
    title: 'Nutuk',
    author: 'Mustafa Kemal Ataturk',
    category: 'Tarih',
    chapterTitle: 'Birinci Bolum',
    duration: '18 dakika',
    readingMode: 'audio_file',
  },
  {
    id: 'matematik-notlari',
    title: 'Matematik Ders Notlari',
    author: 'GTU Gonulluleri',
    category: 'Ders Notu',
    chapterTitle: 'Limit ve Sureklilik',
    duration: '12 dakika',
    readingMode: 'audio_file',
  },
  {
    id: 'gtu-duyuru',
    title: 'GTU Haftalik Duyurular',
    author: 'Ogrenci Isleri',
    category: 'GTU Duyurusu',
    chapterTitle: 'Bu Haftanin Duyurulari',
    duration: '5 dakika',
    readingMode: 'audio_file',
  },
];

const WELCOME_MESSAGE =
  'GTU EchoVoices dinleme moduna hos geldiniz. Arama yapmak icin komut ver dugmesine basin.';

const recognitionConstructor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const RECOGNITION_ERROR_MESSAGES = {
  'not-allowed': 'Mikrofon izni verilmedi. Tarayici adres cubugundaki mikrofon iznini kontrol edin.',
  'service-not-allowed': 'Tarayicinin ses tanima servisi bu ortamda calismiyor. Yazili aramayi kullanabilirsiniz.',
  'audio-capture': 'Mikrofon bulunamadi veya tarayici mikrofona erisemedi.',
  network: 'Ses tanima servisine baglanilamadi. Bu ozellik internet veya tarayici servisi gerektirebilir.',
  'no-speech': 'Ses algilanamadi. Mikrofona biraz daha yakin konusup tekrar deneyin.',
  aborted: 'Sesli komut iptal edildi.',
  language: 'Turkce ses tanima bu tarayicida kullanilamiyor olabilir.',
};

export default function BlindMode() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(WELCOME_MESSAGE);
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [librarySource, setLibrarySource] = useState('Ornek kutuphane');
  const [mode, setMode] = useState('library');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedBook, setSelectedBook] = useState(MOCK_BOOKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() => 'speechSynthesis' in window);
  const [recognitionSupported] = useState(Boolean(recognitionConstructor));
  const recognitionRef = useRef(null);
  const playbackTokenRef = useRef(0);

  const visibleBooks = useMemo(() => {
    if (!query.trim()) return books;

    const normalizedQuery = normalizeText(query);
    return books.filter((book) => {
      const searchableText = normalizeText(
        `${book.title} ${book.author || ''} ${book.category || ''} ${book.chapterTitle || ''}`,
      );
      return searchableText.includes(normalizedQuery);
    });
  }, [books, query]);

  const visibleDepartments = useMemo(() => {
    if (!query.trim() || mode !== 'announcements') return GTU_DEPARTMENTS;

    const normalizedQuery = normalizeText(query);
    return GTU_DEPARTMENTS.filter((department) => {
      const searchableText = normalizeText(`${department.name} ${department.keywords.join(' ')}`);
      return searchableText.includes(normalizedQuery);
    });
  }, [mode, query]);

  const departmentAnnouncements = useMemo(() => {
    if (!selectedDepartment) return [];
    return SAMPLE_GTU_ANNOUNCEMENTS.filter(
      (announcement) => announcement.departmentId === selectedDepartment.id,
    );
  }, [selectedDepartment]);

  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function playTone(type = 'focus') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const toneMap = {
      focus: { frequency: 420, duration: 0.07, volume: 0.04 },
      success: { frequency: 660, duration: 0.16, volume: 0.05 },
      error: { frequency: 180, duration: 0.22, volume: 0.06 },
    };
    const tone = toneMap[type] || toneMap.focus;

    oscillator.type = 'sine';
    oscillator.frequency.value = tone.frequency;
    gain.gain.value = tone.volume;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + tone.duration);
    oscillator.onended = () => context.close();
  }

  function speak(message) {
    setStatus(message);

    if (!speechSupported) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function getBookDuration(book) {
    if (book.duration) return book.duration;
    if (book.estimatedReadingMinutes) return `${book.estimatedReadingMinutes} dakika`;
    if (book.totalDurationSec) return `${Math.max(1, Math.round(book.totalDurationSec / 60))} dakika`;
    return 'sure bilgisi yok';
  }

  async function speakTextBook(book) {
    if (!speechSupported) {
      giveFeedback('error');
      speak('Bu tarayici metin seslendirmeyi desteklemiyor.');
      return;
    }

    try {
      const chunks = await getBookTextChunks(book.id, 8);
      if (!chunks.length) {
        giveFeedback('error');
        speak('Bu PDF kitabi icin okunacak metin bulunamadi.');
        return;
      }

      const token = playbackTokenRef.current + 1;
      playbackTokenRef.current = token;
      setIsPlaying(true);
      speakChunk(chunks, 0, token, book.language || 'tr-TR');
    } catch {
      giveFeedback('error');
      speak('PDF metni okunurken Firestore hatasi olustu. Daha sonra tekrar deneyin.');
    }
  }

  function speakChunk(chunks, index, token, language) {
    if (token !== playbackTokenRef.current) return;

    if (index >= chunks.length) {
      setIsPlaying(false);
      speak('Kitap onizleme metni tamamlandi.');
      return;
    }

    const chunk = chunks[index];
    setStatus(`${selectedBook.title} okunuyor. Parca ${index + 1}. Sayfa ${chunk.pageStart}.`);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.onend = () => speakChunk(chunks, index + 1, token, language);
    utterance.onerror = () => {
      setIsPlaying(false);
      giveFeedback('error');
      setStatus('Metin seslendirme sirasinda hata olustu.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function showStatus(message) {
    setStatus(message);
  }

  function giveFeedback(type) {
    if (type === 'success') {
      vibrate([100, 50, 100]);
      playTone('success');
      return;
    }

    if (type === 'error') {
      vibrate([220, 80, 220, 80, 220]);
      playTone('error');
      return;
    }

    vibrate(50);
    playTone('focus');
  }

  function selectBook(book) {
    setMode('library');
    setSelectedBook(book);
    setIsPlaying(false);
    playbackTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speak(`${book.title} bulundu. ${book.chapterTitle || 'Tam metin'} secildi.`);
  }

  function openAnnouncementsMode() {
    setMode('announcements');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    setIsPlaying(false);
    playbackTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speak('GTU duyurulari modu acildi. Bolum secmek icin bolum adini soyleyin veya listeden dokunun.');
  }

  function openLibraryMode() {
    setMode('library');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    giveFeedback('success');
    speak('Kitap dinleme moduna donuldu.');
  }

  function selectDepartment(department) {
    setSelectedDepartment(department);
    setSelectedAnnouncement(null);
    giveFeedback('success');
    const count = SAMPLE_GTU_ANNOUNCEMENTS.filter(
      (announcement) => announcement.departmentId === department.id,
    ).length;
    speak(`${department.name} duyurulari acildi. ${count || 'Henuz'} duyuru bulundu.`);
  }

  function selectAnnouncement(announcement) {
    setSelectedAnnouncement(announcement);
    giveFeedback('success');
    speak(`${announcement.title}. ${announcement.summary}`);
  }

  function findDepartmentByCommand(command) {
    const normalizedCommand = normalizeText(command);
    return GTU_DEPARTMENTS.find((department) => {
      const searchableText = normalizeText(`${department.name} ${department.keywords.join(' ')}`);
      return searchableText.includes(normalizedCommand) || normalizedCommand.includes(normalizeText(department.name));
    });
  }

  function handleSearch(nextQuery = query) {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      giveFeedback('error');
      speak('Arama yapmak icin kitap adi veya kategori soyleyin.');
      return;
    }

    const normalizedQuery = normalizeText(trimmedQuery);

    if (normalizedQuery.includes('duyuru')) {
      openAnnouncementsMode();
      return;
    }

    const requestedDepartment = findDepartmentByCommand(trimmedQuery);
    if (requestedDepartment) {
      setMode('announcements');
      selectDepartment(requestedDepartment);
      return;
    }

    if (normalizedQuery.includes('kitap')) {
      openLibraryMode();
      return;
    }

    if (mode === 'announcements') {
      giveFeedback('error');
      speak(`${trimmedQuery} icin bolum veya duyuru bulunamadi.`);
      return;
    }

    const foundBook = books.find((book) => {
      const searchableText = normalizeText(
        `${book.title} ${book.author || ''} ${book.category || ''} ${book.chapterTitle || ''}`,
      );
      return searchableText.includes(normalizedQuery);
    });

    if (!foundBook) {
      giveFeedback('error');
      speak(`${trimmedQuery} icin sonuc bulunamadi.`);
      return;
    }

    selectBook(foundBook);
  }

  function togglePlayback() {
    const nextPlaying = !isPlaying;
    giveFeedback('success');

    if (!nextPlaying) {
      playbackTokenRef.current += 1;
      setIsPlaying(false);
      window.speechSynthesis?.cancel();
      speak('Oynatma duraklatildi.');
      return;
    }

    if (selectedBook.readingMode === 'tts_text') {
      speakTextBook(selectedBook);
      return;
    }

    setIsPlaying(true);
    speak(`${selectedBook.title} oynatiliyor. ${getBookDuration(selectedBook)}.`);
  }

  function startListening() {
    if (!recognitionSupported) {
      giveFeedback('error');
      speak('Bu tarayici sesli komutu desteklemiyor. Arama kutusunu kullanabilirsiniz.');
      return;
    }

    const recognition = new recognitionConstructor();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      giveFeedback('focus');
      showStatus('Dinliyorum. Kitap adi veya kategori soyleyin.');
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const errorMessage =
        RECOGNITION_ERROR_MESSAGES[event.error] ||
        `Sesli komut calismadi. Hata kodu: ${event.error || 'bilinmiyor'}. Yazili aramayi kullanabilirsiniz.`;
      giveFeedback('error');
      speak(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };

    recognition.start();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        const publishedBooks = await getPublishedBooks();
        if (cancelled || !publishedBooks.length) return;

        setBooks(publishedBooks);
        setSelectedBook(publishedBooks[0]);
        setLibrarySource('Firestore kutuphanesi');
      } catch {
        if (!cancelled) {
          setLibrarySource('Ornek kutuphane');
        }
      }
    }

    loadLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (speechSupported) {
      const utterance = new SpeechSynthesisUtterance(WELCOME_MESSAGE);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      playbackTokenRef.current += 1;
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, [speechSupported]);

  useEffect(() => {
    function handleKeyboard(event) {
      if (event.target.tagName === 'INPUT') return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        startListening();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        giveFeedback('focus');
        speak('On saniye ileri sarildi.');
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        giveFeedback('focus');
        speak('On saniye geri sarildi.');
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (mode === 'announcements') openLibraryMode();
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  });

  return (
    <main className="blind-page">
      <section className="blind-hero" aria-live="polite">
        <p className="blind-kicker">GTU EchoVoices</p>
        <h1>Dinleme Modu</h1>
        <p className="blind-status">{status}</p>
      </section>

      <section className="blind-controls" aria-label="Ana dinleme kontrolleri">
        <button
          type="button"
          className="blind-primary-action"
          onClick={mode === 'announcements' ? openLibraryMode : startListening}
          onFocus={() => giveFeedback('focus')}
        >
          {mode === 'announcements' ? 'Kitaplara Don' : (isListening ? 'Dinleniyor' : 'Komut Ver')}
        </button>
        <button
          type="button"
          className="blind-secondary-action"
          onClick={mode === 'announcements' ? startListening : togglePlayback}
          onFocus={() => giveFeedback('focus')}
        >
          {mode === 'announcements' ? 'Bolum Soyle' : (isPlaying ? 'Duraklat' : 'Dinle')}
        </button>
      </section>

      <section className="blind-mode-switch" aria-label="Mod secimi">
        <button
          type="button"
          className={mode === 'announcements' ? 'blind-mode-button active' : 'blind-mode-button'}
          onClick={openAnnouncementsMode}
          onFocus={() => giveFeedback('focus')}
        >
          GTU Duyurulari
        </button>
        <button
          type="button"
          className={mode === 'library' ? 'blind-mode-button active' : 'blind-mode-button'}
          onClick={openLibraryMode}
          onFocus={() => giveFeedback('focus')}
        >
          Kitaplik
        </button>
      </section>

      <section className="blind-search" aria-label="Yazili arama">
        <label htmlFor="blind-search-input">Kitap veya kategori ara</label>
        <div className="blind-search-row">
          <input
            id="blind-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSearch();
            }}
            placeholder="Ornek: Nutuk, Ders Notu, GTU Duyurusu"
          />
          <button type="button" onClick={() => handleSearch()}>
            Ara
          </button>
        </div>
      </section>

      {mode === 'library' && (
        <>
          <section className="blind-now-playing" aria-label="Secili icerik">
            <span>Secili icerik</span>
            <h2>{selectedBook.title}</h2>
            <p>{selectedBook.chapterTitle || (selectedBook.readingMode === 'tts_text' ? 'PDF metni' : 'Tam Metin')}</p>
            <p>{selectedBook.author || 'Bilinmeyen yazar'} - {getBookDuration(selectedBook)}</p>
            <p>{selectedBook.readingMode === 'tts_text' ? 'PDF metni Web Speech API ile okunacak' : 'Ses dosyası modu'}</p>
          </section>

          <section className="blind-library-header" aria-label="Kutuphane kaynagi">
            <span>{librarySource}</span>
          </section>

          <section className="blind-library" aria-label="Kutuphane">
            {visibleBooks.map((book) => (
              <button
                type="button"
                className={book.id === selectedBook.id ? 'blind-book active' : 'blind-book'}
                key={book.id}
                onClick={() => selectBook(book)}
                onFocus={() => giveFeedback('focus')}
              >
                <strong>{book.title}</strong>
                <span>{book.category || 'Kategori yok'} - {book.readingMode === 'tts_text' ? 'PDF/TTS' : (book.chapterTitle || 'Ses')}</span>
              </button>
            ))}
          </section>
        </>
      )}

      {mode === 'announcements' && (
        <>
          <section className="blind-now-playing" aria-label="GTU duyuru durumu">
            <span>GTU Duyurulari</span>
            <h2>{selectedDepartment ? selectedDepartment.name : 'Bolum Secimi'}</h2>
            <p>{selectedAnnouncement ? selectedAnnouncement.title : 'Bolum adini soyleyin veya listeden secin.'}</p>
            <p>{selectedAnnouncement ? selectedAnnouncement.summary : 'Ornek: Bilgisayar duyurulari, Matematik duyurulari.'}</p>
          </section>

          {!selectedDepartment && (
            <section className="blind-library" aria-label="GTU bolumleri">
              {visibleDepartments.map((department) => (
                <button
                  type="button"
                  className="blind-book"
                  key={department.id}
                  onClick={() => selectDepartment(department)}
                  onFocus={() => giveFeedback('focus')}
                >
                  <strong>{department.name}</strong>
                  <span>Duyurulari ac</span>
                </button>
              ))}
            </section>
          )}

          {selectedDepartment && (
            <section className="blind-library" aria-label="Bolum duyurulari">
              <button
                type="button"
                className="blind-book"
                onClick={() => setSelectedDepartment(null)}
                onFocus={() => giveFeedback('focus')}
              >
                <strong>Bolumlere Don</strong>
                <span>GTU bolum listesine geri don</span>
              </button>
              {departmentAnnouncements.map((announcement) => (
                <button
                  type="button"
                  className={selectedAnnouncement?.id === announcement.id ? 'blind-book active' : 'blind-book'}
                  key={announcement.id}
                  onClick={() => selectAnnouncement(announcement)}
                  onFocus={() => giveFeedback('focus')}
                >
                  <strong>{announcement.title}</strong>
                  <span>{announcement.dateText}</span>
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
