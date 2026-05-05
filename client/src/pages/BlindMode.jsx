import { useEffect, useMemo, useRef, useState } from 'react';
import { getBookTextChunks, getPublishedBooks } from '../services/libraryService';
import { normalizeText } from '../services/textUtils';
import { GTU_ANNOUNCEMENTS, GTU_DEPARTMENTS } from '../data/gtuAnnouncements';

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

const COMMAND_HELP_TEXT =
  'Kullanabileceginiz komutlar: Dinle, duraklat, sonraki, onceki, sonraki sayfa, onceki sayfa, besinci sayfaya git, kaldigim yeri isaretle, kaldigim yerden devam et, kitaplari listele, duyurular, geri don, yardim.';

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
  const [textChunks, setTextChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [bookmark, setBookmark] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
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
    return GTU_ANNOUNCEMENTS.filter(
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

  function getBookmarkKey(bookId = selectedBook.id) {
    return `echovoices:bookmark:${bookId}`;
  }

  function readBookmark(bookId = selectedBook.id) {
    try {
      const rawBookmark = localStorage.getItem(getBookmarkKey(bookId));
      return rawBookmark ? JSON.parse(rawBookmark) : null;
    } catch {
      return null;
    }
  }

  function saveBookmark(chunkIndex = currentChunkIndex) {
    if (selectedBook.readingMode !== 'tts_text') {
      giveFeedback('error');
      speak('Kaldigin yeri isaretleme su an PDF metin kitaplari icin kullanilir.');
      return;
    }

    const chunk = textChunks[chunkIndex];
    if (!chunk) {
      giveFeedback('error');
      speak('Isaretlenecek sayfa bulunamadi.');
      return;
    }

    const nextBookmark = {
      bookId: selectedBook.id,
      title: selectedBook.title,
      chunkIndex,
      pageStart: chunk.pageStart,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(getBookmarkKey(selectedBook.id), JSON.stringify(nextBookmark));
    setBookmark(nextBookmark);
    giveFeedback('success');
    speak(`${selectedBook.title} icin kaldiginiz yer sayfa ${chunk.pageStart} olarak isaretlendi.`);
  }

  async function ensureTextChunks(book = selectedBook) {
    if (book.readingMode !== 'tts_text') return [];
    if (book.id === selectedBook.id && textChunks.length) return textChunks;

    const chunks = await getBookTextChunks(book.id, 40);
    setTextChunks(chunks);
    return chunks;
  }

  async function speakTextBook(book, startIndex = 0) {
    if (!speechSupported) {
      giveFeedback('error');
      speak('Bu tarayici metin seslendirmeyi desteklemiyor.');
      return;
    }

    try {
      const chunks = await ensureTextChunks(book);
      if (!chunks.length) {
        giveFeedback('error');
        speak('Bu PDF kitabi icin okunacak metin bulunamadi.');
        return;
      }

      const token = playbackTokenRef.current + 1;
      playbackTokenRef.current = token;
      setIsPlaying(true);
      setCurrentChunkIndex(startIndex);
      speakChunk(chunks, startIndex, token, book.language || 'tr-TR');
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
    setCurrentChunkIndex(index);
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
    setTextChunks([]);
    setCurrentChunkIndex(0);
    setBookmark(readBookmark(book.id));
    playbackTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speak(`${book.title} bulundu. ${book.chapterTitle || 'Tam metin'} secildi.`);
  }

  async function goToTextChunk(targetIndex, autoPlay = false) {
    if (selectedBook.readingMode !== 'tts_text') {
      giveFeedback('error');
      speak('Sayfa gezinme sadece PDF metin kitaplari icin kullanilir.');
      return;
    }

    try {
      const chunks = await ensureTextChunks(selectedBook);
      if (!chunks.length) {
        giveFeedback('error');
        speak('Bu kitapta metin parcasi bulunamadi.');
        return;
      }

      const clampedIndex = Math.max(0, Math.min(targetIndex, chunks.length - 1));
      const chunk = chunks[clampedIndex];
      playbackTokenRef.current += 1;
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      setCurrentChunkIndex(clampedIndex);
      giveFeedback('success');

      if (autoPlay) {
        speakTextBook(selectedBook, clampedIndex);
      } else {
        speak(`Sayfa ${chunk.pageStart}. Okumak icin dinle komutunu verin.`);
      }
    } catch {
      giveFeedback('error');
      speak('Sayfa bilgisi alinamadi.');
    }
  }

  async function goToPage(pageNumber, autoPlay = false) {
    if (selectedBook.readingMode !== 'tts_text') {
      giveFeedback('error');
      speak('Sayfa numarasi komutu sadece PDF metin kitaplari icin kullanilir.');
      return;
    }

    try {
      const chunks = await ensureTextChunks(selectedBook);
      const targetIndex = chunks.findIndex(
        (chunk) => pageNumber >= chunk.pageStart && pageNumber <= chunk.pageEnd,
      );

      if (targetIndex === -1) {
        giveFeedback('error');
        speak(`${pageNumber}. sayfa bu kitapta bulunamadi.`);
        return;
      }

      goToTextChunk(targetIndex, autoPlay);
    } catch {
      giveFeedback('error');
      speak('Sayfa bilgisi alinamadi.');
    }
  }

  function resumeFromBookmark() {
    const savedBookmark = readBookmark(selectedBook.id);
    if (!savedBookmark) {
      giveFeedback('error');
      speak('Bu kitap icin kayitli kaldiginiz yer yok.');
      return;
    }

    setBookmark(savedBookmark);
    goToTextChunk(savedBookmark.chunkIndex, true);
  }

  function selectBookByIndex(nextIndex) {
    if (!books.length) {
      giveFeedback('error');
      speak('Listelenecek kitap bulunamadi.');
      return;
    }

    const normalizedIndex = (nextIndex + books.length) % books.length;
    selectBook(books[normalizedIndex]);
  }

  function getSelectedBookIndex() {
    return Math.max(0, books.findIndex((book) => book.id === selectedBook.id));
  }

  function openAnnouncementsMode() {
    setMode('announcements');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    setIsPlaying(false);
    playbackTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speak(`GTU duyurulari modu acildi. ${formatDepartmentTitles(GTU_DEPARTMENTS)} Bolum secmek icin 1, 2 gibi sirasini; ya da Bilgisayar, Matematik gibi bolum adini soyleyin.`);
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
    const announcements = GTU_ANNOUNCEMENTS.filter(
      (announcement) => announcement.departmentId === department.id,
    );

    if (!announcements.length) {
      speak(`${department.name} duyurulari acildi. Henuz duyuru bulunamadi.`);
      return;
    }

    speak(`${department.name} duyurulari acildi. ${announcements.length} duyuru bulundu. ${formatAnnouncementTitles(announcements)} Bir duyuruya girmek icin birinciyi ac, ikinciyi ac veya duyuru basligindan bir kelime soyleyin.`);
  }

  function selectDepartmentByIndex(nextIndex) {
    const normalizedIndex = (nextIndex + GTU_DEPARTMENTS.length) % GTU_DEPARTMENTS.length;
    selectDepartment(GTU_DEPARTMENTS[normalizedIndex]);
  }

  function getSelectedDepartmentIndex() {
    if (!selectedDepartment) return 0;
    return Math.max(0, GTU_DEPARTMENTS.findIndex((department) => department.id === selectedDepartment.id));
  }

  function selectAnnouncement(announcement, readFullDetail = false) {
    setSelectedAnnouncement(announcement);
    giveFeedback('success');
    const detailText = readFullDetail
      ? announcement.bodyText || announcement.summary
      : announcement.summary;
    speak(`${announcement.title}. ${detailText}`);
  }

  function formatAnnouncementTitles(announcements, maxCount = 6) {
    return announcements
      .slice(0, maxCount)
      .map((announcement, index) => `${index + 1}. ${announcement.title}`)
      .join('. ');
  }

  function findAnnouncementByCommand(command) {
    if (!selectedDepartment) return null;

    const normalizedCommand = normalizeText(command);
    return departmentAnnouncements.find((announcement) => {
      const searchableText = normalizeText(`${announcement.title} ${announcement.summary || ''}`);
      return searchableText.includes(normalizedCommand) || normalizedCommand.includes(normalizeText(announcement.title));
    });
  }

  function selectAnnouncementByIndex(nextIndex) {
    if (!departmentAnnouncements.length) {
      giveFeedback('error');
      speak('Bu bolum icin duyuru bulunamadi.');
      return;
    }

    const normalizedIndex = (nextIndex + departmentAnnouncements.length) % departmentAnnouncements.length;
    selectAnnouncement(departmentAnnouncements[normalizedIndex]);
  }

  function getSelectedAnnouncementIndex() {
    if (!selectedAnnouncement) return 0;
    return Math.max(
      0,
      departmentAnnouncements.findIndex((announcement) => announcement.id === selectedAnnouncement.id),
    );
  }

  function findDepartmentByCommand(command) {
    const normalizedCommand = normalizeText(command);
    return GTU_DEPARTMENTS.find((department) => {
      const searchableText = normalizeText(`${department.name} ${department.keywords.join(' ')}`);
      return searchableText.includes(normalizedCommand) || normalizedCommand.includes(normalizeText(department.name));
    });
  }

  function listBooks() {
    const firstBooks = visibleBooks.slice(0, 5);
    if (!firstBooks.length) {
      giveFeedback('error');
      speak('Listelenecek kitap bulunamadi.');
      return;
    }

    const text = firstBooks
      .map((book, index) => `${index + 1}. ${book.title}`)
      .join('. ');
    speak(`Kitaplar: ${text}. Acmak icin birinciyi ac, ikinciyi ac gibi komut verin.`);
  }

  function listDepartments() {
    const firstDepartments = visibleDepartments.slice(0, 8);
    speak(`Bolumler: ${formatDepartmentTitles(firstDepartments)} Bolum adi soyleyebilir, 1 diyebilir veya birinciyi ac diyebilirsiniz.`);
  }

  function formatDepartmentTitles(departments, maxCount = 8) {
    return departments
      .slice(0, maxCount)
      .map((department, index) => `${index + 1}. ${department.name}`)
      .join('. ');
  }

  function listAnnouncements() {
    if (!selectedDepartment) {
      listDepartments();
      return;
    }

    if (!departmentAnnouncements.length) {
      giveFeedback('error');
      speak(`${selectedDepartment.name} icin duyuru bulunamadi.`);
      return;
    }

    const text = departmentAnnouncements
      .map((announcement, index) => `${index + 1}. ${announcement.title}`)
      .join('. ');
    speak(`${selectedDepartment.name} duyurulari: ${text}. Bir duyurunun detayini okumak icin numarasini veya basligindan bir kelime soyleyin.`);
  }

  function readSelectedAnnouncementDetail() {
    if (!selectedAnnouncement) {
      listAnnouncements();
      return;
    }

    selectAnnouncement(selectedAnnouncement, true);
  }

  function handleOrdinalCommand(normalizedCommand) {
    const ordinalMap = [
      ['birinci', '1', 'ilk'],
      ['ikinci', '2'],
      ['ucuncu', 'üçüncü', '3'],
      ['dorduncu', 'dördüncü', '4'],
      ['besinci', 'beşinci', '5'],
    ];

    const ordinalIndex = ordinalMap.findIndex((words) =>
      words.some((word) => normalizedCommand.includes(normalizeText(word))),
    );

    if (ordinalIndex === -1 || !/(ac|aç|sec|seç|oku|git)/.test(normalizedCommand)) {
      return false;
    }

    if (mode === 'announcements' && selectedDepartment) {
      selectAnnouncementByIndex(ordinalIndex);
      return true;
    }

    if (mode === 'announcements') {
      selectDepartmentByIndex(ordinalIndex);
      return true;
    }

    const targetBook = visibleBooks[ordinalIndex];
    if (targetBook) {
      selectBook(targetBook);
      return true;
    }

    giveFeedback('error');
    speak('Bu sirada bir secenek bulunamadi.');
    return true;
  }

  function handleCommand(rawCommand = query) {
    const trimmedQuery = rawCommand.trim();

    if (!trimmedQuery) {
      giveFeedback('error');
      speak('Komut vermek icin kitap adi, duyuru, dinle veya yardim yazabilirsiniz.');
      return;
    }

    setLastCommand(trimmedQuery);
    const normalizedQuery = normalizeText(trimmedQuery);

    const numericOnlyMatch = normalizedQuery.match(/^(\d{1,2})$/);
    if (numericOnlyMatch) {
      const targetIndex = Number(numericOnlyMatch[1]) - 1;
      if (mode === 'announcements' && selectedDepartment) {
        selectAnnouncementByIndex(targetIndex);
        return;
      }

      if (mode === 'announcements') {
        selectDepartmentByIndex(targetIndex);
        return;
      }

      const targetBook = visibleBooks[targetIndex];
      if (targetBook) {
        selectBook(targetBook);
        return;
      }
    }

    if (normalizedQuery.includes('yardim') || normalizedQuery.includes('yardım')) {
      speak(COMMAND_HELP_TEXT);
      return;
    }

    if (normalizedQuery.includes('kaldigim yerden') || normalizedQuery.includes('kaldığım yerden') || normalizedQuery.includes('devam et')) {
      resumeFromBookmark();
      return;
    }

    if (normalizedQuery.includes('isaretle') || normalizedQuery.includes('işaretle') || normalizedQuery.includes('yerimi kaydet')) {
      saveBookmark();
      return;
    }

    const pageMatch = normalizedQuery.match(/(\d+)\s*(sayfa|sayfaya|sayfadan)/);
    if (pageMatch) {
      goToPage(Number(pageMatch[1]), normalizedQuery.includes('oku') || normalizedQuery.includes('dinle'));
      return;
    }

    if (normalizedQuery.includes('ana menu') || normalizedQuery.includes('ana menü')) {
      openLibraryMode();
      return;
    }

    if (normalizedQuery.includes('geri')) {
      if (mode === 'announcements' && selectedDepartment) {
        setSelectedDepartment(null);
        setSelectedAnnouncement(null);
        giveFeedback('success');
        speak('Bolum listesine donuldu.');
        return;
      }

      if (mode === 'announcements') {
        openLibraryMode();
        return;
      }

      speak('Kitaplik modundasiniz.');
      return;
    }

    if (
      mode === 'announcements'
      && selectedAnnouncement
      && (normalizedQuery.includes('detay') || normalizedQuery.includes('tamamini') || normalizedQuery.includes('tamamÄ±nÄ±'))
    ) {
      readSelectedAnnouncementDetail();
      return;
    }

    if (normalizedQuery.includes('dinle') || normalizedQuery.includes('oku') || normalizedQuery.includes('baslat')) {
      if (mode === 'announcements' && selectedAnnouncement) {
        readSelectedAnnouncementDetail();
        return;
      }

      if (mode === 'announcements') {
        listAnnouncements();
        return;
      }

      if (!isPlaying) togglePlayback();
      else speak(`${selectedBook.title} zaten oynatiliyor.`);
      return;
    }

    if (normalizedQuery.includes('dur') || normalizedQuery.includes('duraklat') || normalizedQuery.includes('sus')) {
      if (isPlaying) {
        togglePlayback();
        return;
      }

      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      speak('Ses durduruldu.');
      return;
    }

    if (normalizedQuery.includes('liste')) {
      if (mode === 'announcements') {
        listAnnouncements();
      } else {
        listBooks();
      }
      return;
    }

    if (handleOrdinalCommand(normalizedQuery)) {
      return;
    }

    if (normalizedQuery.includes('sonraki') || normalizedQuery.includes('ileri')) {
      if (normalizedQuery.includes('sayfa')) {
        goToTextChunk(currentChunkIndex + 1);
        return;
      }

      if (mode === 'announcements' && selectedDepartment) {
        selectAnnouncementByIndex(getSelectedAnnouncementIndex() + 1);
        return;
      }

      if (mode === 'announcements') {
        selectDepartmentByIndex(getSelectedDepartmentIndex() + 1);
        return;
      }

      selectBookByIndex(getSelectedBookIndex() + 1);
      return;
    }

    if (normalizedQuery.includes('onceki') || normalizedQuery.includes('önceki') || normalizedQuery.includes('geri kitap')) {
      if (normalizedQuery.includes('sayfa')) {
        goToTextChunk(currentChunkIndex - 1);
        return;
      }

      if (mode === 'announcements' && selectedDepartment) {
        selectAnnouncementByIndex(getSelectedAnnouncementIndex() - 1);
        return;
      }

      if (mode === 'announcements') {
        selectDepartmentByIndex(getSelectedDepartmentIndex() - 1);
        return;
      }

      selectBookByIndex(getSelectedBookIndex() - 1);
      return;
    }

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
      if (selectedDepartment) {
        const requestedAnnouncement = findAnnouncementByCommand(trimmedQuery);
        if (requestedAnnouncement) {
          selectAnnouncement(requestedAnnouncement);
          return;
        }
      }

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
      speakTextBook(selectedBook, currentChunkIndex);
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
      handleCommand(transcript);
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
        try {
          const rawBookmark = localStorage.getItem(`echovoices:bookmark:${publishedBooks[0].id}`);
          setBookmark(rawBookmark ? JSON.parse(rawBookmark) : null);
        } catch {
          setBookmark(null);
        }
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
              if (event.key === 'Enter') handleCommand();
            }}
            placeholder="Ornek: dinle, sonraki, duyurular, Nutuk"
          />
          <button type="button" onClick={() => handleCommand()}>
            Komutu Calistir
          </button>
        </div>
      </section>

      <section className="blind-command-help" aria-label="Komut yardimi">
        <strong>Komutlar</strong>
        <span>Dinle</span>
        <span>Duraklat</span>
        <span>Sonraki</span>
        <span>Onceki</span>
        <span>Listele</span>
        <span>Sonraki sayfa</span>
        <span>5. sayfaya git</span>
        <span>Kaldigim yeri isaretle</span>
        <span>Kaldigim yerden devam et</span>
        <span>Duyurular</span>
        <span>Geri don</span>
        <span>Yardim</span>
        {lastCommand && <em>Son komut: {lastCommand}</em>}
      </section>

      {mode === 'library' && (
        <>
          <section className="blind-now-playing" aria-label="Secili icerik">
            <span>Secili icerik</span>
            <h2>{selectedBook.title}</h2>
            <p>{selectedBook.chapterTitle || (selectedBook.readingMode === 'tts_text' ? 'PDF metni' : 'Tam Metin')}</p>
            <p>{selectedBook.author || 'Bilinmeyen yazar'} - {getBookDuration(selectedBook)}</p>
            <p>{selectedBook.readingMode === 'tts_text' ? 'PDF metni Web Speech API ile okunacak' : 'Ses dosyası modu'}</p>
            {selectedBook.readingMode === 'tts_text' && (
              <p>
                Geçerli sayfa: {textChunks[currentChunkIndex]?.pageStart || 'hazır değil'}
                {bookmark ? ` - İşaretli yer: sayfa ${bookmark.pageStart}` : ''}
              </p>
            )}
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
