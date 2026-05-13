import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBookTextChunks, getPublishedBooks, getPublishedChapters } from '../services/libraryService';
import { getReadingProgress, saveReadingProgress } from '../services/progressService';
import {
  createCachedSpeechAudio,
  getCachedAnnouncementAudioUrl,
  getCachedMenuAudioUrl,
  loadCachedSpeechConfig,
  MENU_PROMPTS,
} from '../services/cachedSpeechService';
import { createMenuUtterance, createUtterance, getSpeechLanguage } from '../services/speechService';
import { normalizeText } from '../services/textUtils';
import { parseVoiceCommand } from '../services/voiceCommandService';
import { GTU_ANNOUNCEMENTS, GTU_DEPARTMENTS } from '../data/gtuAnnouncements';

const MOCK_BOOKS = [
  {
    id: 'nutuk',
    title: 'Nutuk',
    author: 'Mustafa Kemal Atatürk',
    category: 'Tarih',
    chapterTitle: 'Birinci Bölüm',
    duration: '18 dakika',
    readingMode: 'audio_file',
  },
  {
    id: 'matematik-notlari',
    title: 'Matematik Ders Notları',
    author: 'GTÜ Gönüllüleri',
    category: 'Ders Notu',
    chapterTitle: 'Limit ve Süreklilik',
    duration: '12 dakika',
    readingMode: 'audio_file',
  },
  {
    id: 'gtu-duyuru',
    title: 'GTÜ Haftalık Duyurular',
    author: 'Öğrenci İşleri',
    category: 'GTÜ Duyurusu',
    chapterTitle: 'Bu Haftanın Duyuruları',
    duration: '5 dakika',
    readingMode: 'audio_file',
  },
];

const WELCOME_MESSAGE =
  'Duyum dinleme moduna hoş geldiniz. Komut vermek için Enter tuşuna basabilir veya ekrandaki büyük mikrofon düğmesine dokunabilirsiniz. Kitapları duymak için kitapları listele deyin. GTÜ duyuruları için duyurular deyin. Yardım almak için yardım deyin.';

const COMMAND_HELP_TEXT =
  'Yardım rehberi. Komut vermek için Enter tuşuna basın veya büyük mikrofon düğmesine dokunun. Kitapları listelemek için kitapları listele deyin. Bir kitabı açmak için birinciyi aç veya kitap adını söyleyin. Dinlemek için dinle, durdurmak için duraklat deyin. PDF kitaplarda sonraki sayfa, önceki sayfa veya beşinci sayfaya git diyebilirsiniz. Duyurular için duyurular deyin. Geri dönmek için geri dön deyin. Klavyede Space dinle ve duraklat, sağ ok ileri, sol ok geri, H yardım komutudur.';

const BLIND_INTERFACE_KEY = 'echovoices:blind-interface-mode';

const recognitionConstructor =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const RECOGNITION_ERROR_MESSAGES = {
  'not-allowed': 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundaki mikrofon iznini kontrol edin.',
  'service-not-allowed': 'Tarayıcının ses tanıma servisi bu ortamda çalışmıyor. Yazılı aramayı kullanabilirsiniz.',
  'audio-capture': 'Mikrofon bulunamadı veya tarayıcı mikrofona erişemedi.',
  network: 'Ses tanıma servisine bağlanılamadı. Bu özellik internet veya tarayıcı servisi gerektirebilir.',
  'no-speech': 'Ses algılanamadı. Mikrofona biraz daha yakın konuşup tekrar deneyin.',
  aborted: 'Sesli komut iptal edildi.',
  language: 'Türkçe ses tanıma bu tarayıcıda kullanılamıyor olabilir.',
};

const RECOGNITION_ERROR_PROMPTS = {
  'not-allowed': MENU_PROMPTS.microphonePermissionDenied,
  'service-not-allowed': MENU_PROMPTS.speechServiceUnavailable,
  'audio-capture': MENU_PROMPTS.microphoneUnavailable,
  network: MENU_PROMPTS.speechRecognitionNetworkError,
  'no-speech': MENU_PROMPTS.noSpeechDetected,
  aborted: MENU_PROMPTS.speechCommandAborted,
  language: MENU_PROMPTS.speechRecognitionLanguageUnavailable,
};

function getReadableLanguage(language) {
  return getSpeechLanguage(language) === 'en-US' ? 'İngilizce' : 'Türkçe';
}

export default function BlindMode() {
  const { currentUser, userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(WELCOME_MESSAGE);
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [librarySource, setLibrarySource] = useState('Örnek kütüphane');
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
  const [cachedSpeechReady, setCachedSpeechReady] = useState(false);
  const [storedBlindInterfaceMode] = useState(() =>
    localStorage.getItem(BLIND_INTERFACE_KEY) || 'simple',
  );
  const profileBlindInterfaceMode = userProfile?.blindInterfaceMode;
  const blindInterfaceMode =
    profileBlindInterfaceMode === 'simple' || profileBlindInterfaceMode === 'standard'
      ? profileBlindInterfaceMode
      : storedBlindInterfaceMode;
  const [speechSupported] = useState(() => 'speechSynthesis' in window);
  const [recognitionSupported] = useState(Boolean(recognitionConstructor));
  const recognitionRef = useRef(null);
  const listeningPulseRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const promptAudioRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const currentAudioBookIdRef = useRef('');
  const currentAudioChapterIdRef = useRef('');
  const lastProgressSaveRef = useRef(0);

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
      listening: { frequency: 760, duration: 0.09, volume: 0.055 },
      listeningPulse: { frequency: 520, duration: 0.045, volume: 0.035 },
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

  function stopPromptAudio({ resetPosition = true } = {}) {
    const audio = promptAudioRef.current;
    if (!audio) return;

    audio.pause();
    if (resetPosition) audio.currentTime = 0;
    audio.onended = null;
    audio.onerror = null;
    promptAudioRef.current = null;
  }

  function playCachedSpeech(url, fallback) {
    stopPromptAudio();
    window.speechSynthesis?.cancel();

    const audio = createCachedSpeechAudio(url);
    promptAudioRef.current = audio;
    audio.onended = () => {
      if (promptAudioRef.current === audio) promptAudioRef.current = null;
    };
    audio.onerror = () => {
      if (promptAudioRef.current === audio) promptAudioRef.current = null;
      fallback();
    };
    audio.play().catch(() => {
      if (promptAudioRef.current === audio) promptAudioRef.current = null;
      fallback();
    });
  }

  function speak(message, language = 'tr-TR', options = {}) {
    setStatus(message);

    const fallback = () => {
      if (!speechSupported) return;

      stopPromptAudio();
      window.speechSynthesis.cancel();
      const utterance = createUtterance(message, language);
      window.speechSynthesis.speak(utterance);
    };

    if (options.cachedAudioUrl) {
      playCachedSpeech(options.cachedAudioUrl, fallback);
      return;
    }

    fallback();
  }

  function speakMenu(message, options = {}) {
    setStatus(message);

    const fallback = () => {
      if (!speechSupported) return;

      stopPromptAudio();
      window.speechSynthesis.cancel();
      const utterance = createMenuUtterance(message);
      window.speechSynthesis.speak(utterance);
    };

    const cachedAudioUrl = options.cachedAudioUrl || getCachedMenuAudioUrl(options.promptId);
    if (cachedAudioUrl) {
      playCachedSpeech(cachedAudioUrl, fallback);
      return;
    }

    fallback();
  }

  function getBookDuration(book) {
    if (book.duration) return book.duration;
    if (book.estimatedReadingMinutes) return `${book.estimatedReadingMinutes} dakika`;
    if (book.totalDurationSec) return `${Math.max(1, Math.round(book.totalDurationSec / 60))} dakika`;
    return 'süre bilgisi yok';
  }

  function getBookmarkKey(bookId = selectedBook.id) {
    return `echovoices:bookmark:${bookId}`;
  }

  function stopAudioPlayback({ resetPosition = false } = {}) {
    const audio = audioPlayerRef.current;
    if (!audio) return;

    audio.pause();
    if (resetPosition) audio.currentTime = 0;
    audio.onended = null;
    audio.onerror = null;
  }

  function readLocalBookmark(bookId = selectedBook.id) {
    try {
      const rawBookmark = localStorage.getItem(getBookmarkKey(bookId));
      return rawBookmark ? JSON.parse(rawBookmark) : null;
    } catch {
      return null;
    }
  }

  function writeLocalBookmark(nextBookmark) {
    localStorage.setItem(getBookmarkKey(nextBookmark.bookId), JSON.stringify(nextBookmark));
  }

  async function loadProgressForBook(book) {
    const localBookmark = readLocalBookmark(book.id);
    setBookmark(localBookmark);

    if (!currentUser || !book?.id) return localBookmark;

    try {
      const progress = await getReadingProgress({
        userId: currentUser.uid,
        bookId: book.id,
      });

      if (!progress) return localBookmark;

      const nextBookmark = progressToBookmark(progress, book);
      setBookmark(nextBookmark);
      if (book.readingMode === 'tts_text') {
        setCurrentChunkIndex(progress.chunkIndex || 0);
      }
      writeLocalBookmark(nextBookmark);
      return nextBookmark;
    } catch {
      return localBookmark;
    }
  }

  async function persistProgress({
    book = selectedBook,
    chunkIndex = currentChunkIndex,
    pageStart = null,
    positionSec = 0,
    chapterId = '',
    completed = false,
    announce = false,
  } = {}) {
    const nextBookmark = {
      bookId: book.id,
      title: book.title,
      readingMode: book.readingMode,
      chunkIndex,
      pageStart,
      positionSec: Math.max(0, Math.floor(positionSec || 0)),
      savedAt: new Date().toISOString(),
    };

    writeLocalBookmark(nextBookmark);
    setBookmark(nextBookmark);

    if (currentUser) {
      try {
        await saveReadingProgress({
          userId: currentUser.uid,
          book,
          chapterId,
          chunkIndex,
          pageStart,
          positionSec,
          completed,
        });
      } catch {
        if (announce) {
          speakMenu('Kaldığınız yer bu cihazda kaydedildi, fakat hesabınıza yazılamadı.', {
            promptId: MENU_PROMPTS.progressSaveFailed,
          });
          return nextBookmark;
        }
      }
    }

    if (announce) {
      if (book.readingMode === 'audio_file') {
        speakMenu(`${book.title} için kaldığınız yer ${formatPosition(nextBookmark.positionSec)} olarak kaydedildi.`);
      } else {
        speakMenu(`${book.title} için kaldığınız yer sayfa ${nextBookmark.pageStart || '-'} olarak kaydedildi.`);
      }
    }

    return nextBookmark;
  }

  function progressToBookmark(progress, book) {
    return {
      bookId: book.id,
      title: book.title,
      readingMode: book.readingMode,
      chunkIndex: progress.chunkIndex || 0,
      pageStart: progress.pageStart || null,
      positionSec: progress.positionSec || 0,
      savedAt: progress.updatedAt?.toDate?.().toISOString?.() || new Date().toISOString(),
    };
  }

  function formatPosition(seconds = 0) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    if (!minutes) return `${rest} saniye`;
    return `${minutes} dakika ${rest} saniye`;
  }

  function maybeSaveAudioProgress(book, chapterId, positionSec, { force = false } = {}) {
    const now = Date.now();
    if (!force && now - lastProgressSaveRef.current < 15000) return;

    lastProgressSaveRef.current = now;
    persistProgress({
      book,
      chapterId,
      positionSec,
    });
  }

  async function saveBookmark(chunkIndex = currentChunkIndex) {
    if (selectedBook.readingMode !== 'tts_text') {
      const audio = audioPlayerRef.current;
      await persistProgress({
        book: selectedBook,
        positionSec: audio?.currentTime || bookmark?.positionSec || 0,
        chapterId: currentAudioChapterIdRef.current,
        announce: true,
      });
      giveFeedback('success');
      return;
    }

    const chunk = textChunks[chunkIndex];
    if (!chunk) {
      giveFeedback('error');
      speakMenu('İşaretlenecek sayfa bulunamadı.', { promptId: MENU_PROMPTS.noPageToBookmark });
      return;
    }

    await persistProgress({
      book: selectedBook,
      chunkIndex,
      pageStart: chunk.pageStart,
      announce: true,
    });
    giveFeedback('success');
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
      speakMenu('Bu tarayıcı metin seslendirmeyi desteklemiyor.', {
        promptId: MENU_PROMPTS.textSpeechUnsupported,
      });
      return;
    }

    try {
      stopAudioPlayback({ resetPosition: true });
      const chunks = await ensureTextChunks(book);
      if (!chunks.length) {
        giveFeedback('error');
        speakMenu('Bu PDF kitabı için okunacak metin bulunamadı.', { promptId: MENU_PROMPTS.noPdfText });
        return;
      }

      const token = playbackTokenRef.current + 1;
      playbackTokenRef.current = token;
      setIsPlaying(true);
      setCurrentChunkIndex(startIndex);
      speakChunk(chunks, startIndex, token, getSpeechLanguage(book.language));
    } catch {
      giveFeedback('error');
      speakMenu('PDF metni okunurken Firestore hatası oluştu. Daha sonra tekrar deneyin.', {
        promptId: MENU_PROMPTS.pdfReadError,
      });
    }
  }

  function speakChunk(chunks, index, token, language) {
    if (token !== playbackTokenRef.current) return;

    if (index >= chunks.length) {
      setIsPlaying(false);
      speakMenu('Kitap önizleme metni tamamlandı.', { promptId: MENU_PROMPTS.previewCompleted });
      return;
    }

    const chunk = chunks[index];
    setCurrentChunkIndex(index);
    persistProgress({ book: selectedBook, chunkIndex: index, pageStart: chunk.pageStart });
    setStatus(`${selectedBook.title} okunuyor. Parça ${index + 1}. Sayfa ${chunk.pageStart}.`);
    stopPromptAudio();
    window.speechSynthesis.cancel();

    const utterance = createUtterance(chunk.text, language);
    utterance.onend = () => speakChunk(chunks, index + 1, token, language);
    utterance.onerror = () => {
      setIsPlaying(false);
      giveFeedback('error');
      setStatus('Metin seslendirme sırasında hata oluştu.');
    };
    window.speechSynthesis.speak(utterance);
  }

  function showStatus(message) {
    setStatus(message);
  }

  function startListeningFeedback() {
    stopListeningFeedback();
    vibrate([70, 45, 70]);
    playTone('listening');
    listeningPulseRef.current = window.setInterval(() => {
      vibrate(35);
      playTone('listeningPulse');
    }, 1100);
  }

  function stopListeningFeedback() {
    if (!listeningPulseRef.current) return;
    window.clearInterval(listeningPulseRef.current);
    listeningPulseRef.current = null;
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
    loadProgressForBook(book);
    playbackTokenRef.current += 1;
    stopAudioPlayback({ resetPosition: true });
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speakMenu(`${book.title} bulundu. ${book.chapterTitle || 'Tam metin'} seçildi.`);
  }

  async function goToTextChunk(targetIndex, autoPlay = false) {
    if (selectedBook.readingMode !== 'tts_text') {
      giveFeedback('error');
      speakMenu('Sayfa gezinme sadece PDF metin kitapları için kullanılır.', {
        promptId: MENU_PROMPTS.pageNavigationTextOnly,
      });
      return;
    }

    try {
      const chunks = await ensureTextChunks(selectedBook);
      if (!chunks.length) {
        giveFeedback('error');
        speakMenu('Bu kitapta metin parçası bulunamadı.', { promptId: MENU_PROMPTS.noTextChunks });
        return;
      }

      const clampedIndex = Math.max(0, Math.min(targetIndex, chunks.length - 1));
      const chunk = chunks[clampedIndex];
      playbackTokenRef.current += 1;
      stopAudioPlayback({ resetPosition: true });
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      setCurrentChunkIndex(clampedIndex);
      giveFeedback('success');

      if (autoPlay) {
        speakTextBook(selectedBook, clampedIndex);
      } else {
        speakMenu(`Sayfa ${chunk.pageStart}. Okumak için dinle komutunu verin.`);
      }
    } catch {
      giveFeedback('error');
      speakMenu('Sayfa bilgisi alınamadı.', { promptId: MENU_PROMPTS.noPageInfo });
    }
  }

  async function goToPage(pageNumber, autoPlay = false) {
    if (selectedBook.readingMode !== 'tts_text') {
      giveFeedback('error');
      speakMenu('Sayfa numarası komutu sadece PDF metin kitapları için kullanılır.', {
        promptId: MENU_PROMPTS.pageNumberTextOnly,
      });
      return;
    }

    try {
      const chunks = await ensureTextChunks(selectedBook);
      const targetIndex = chunks.findIndex(
        (chunk) => pageNumber >= chunk.pageStart && pageNumber <= chunk.pageEnd,
      );

      if (targetIndex === -1) {
        giveFeedback('error');
        speakMenu(`${pageNumber}. sayfa bu kitapta bulunamadı.`);
        return;
      }

      goToTextChunk(targetIndex, autoPlay);
    } catch {
      giveFeedback('error');
      speakMenu('Sayfa bilgisi alınamadı.', { promptId: MENU_PROMPTS.noPageInfo });
    }
  }

  async function resumeFromBookmark() {
    const savedBookmark = await loadProgressForBook(selectedBook);
    if (!savedBookmark) {
      giveFeedback('error');
      speakMenu('Bu kitap için kayıtlı kaldığınız yer yok.', { promptId: MENU_PROMPTS.noBookmark });
      return;
    }

    setBookmark(savedBookmark);
    if (selectedBook.readingMode === 'tts_text') {
      goToTextChunk(savedBookmark.chunkIndex || 0, true);
      return;
    }

    playAudioBook(selectedBook, savedBookmark.positionSec || 0);
  }

  function selectBookByIndex(nextIndex) {
    if (!books.length) {
      giveFeedback('error');
      speakMenu('Listelenecek kitap bulunamadı.', { promptId: MENU_PROMPTS.noBooks });
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
    stopAudioPlayback({ resetPosition: true });
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speakMenu(`GTÜ duyuruları modu açıldı. ${formatDepartmentTitles(GTU_DEPARTMENTS)} Bölüm seçmek için 1, 2 gibi sırasını; ya da Bilgisayar, Matematik gibi bölüm adını söyleyin.`, {
      promptId: MENU_PROMPTS.announcementsMode,
    });
  }

  function openLibraryMode() {
    setMode('library');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    stopAudioPlayback();
    giveFeedback('success');
    speakMenu('Kitap dinleme moduna dönüldü.', { promptId: MENU_PROMPTS.libraryMode });
  }

  function selectDepartment(department) {
    setSelectedDepartment(department);
    setSelectedAnnouncement(null);
    giveFeedback('success');
    const announcements = GTU_ANNOUNCEMENTS.filter(
      (announcement) => announcement.departmentId === department.id,
    );

    if (!announcements.length) {
      speakMenu(`${department.name} duyuruları açıldı. Henüz duyuru bulunamadı.`);
      return;
    }

    speakMenu(`${department.name} duyuruları açıldı. ${announcements.length} duyuru bulundu. ${formatAnnouncementTitles(announcements)} Bir duyuruya girmek için birinciyi aç, ikinciyi aç veya duyuru başlığından bir kelime söyleyin.`);
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
    speak(`${announcement.title}. ${detailText}`, announcement.language || 'tr-TR', {
      cachedAudioUrl: getCachedAnnouncementAudioUrl(announcement, { readFullDetail }),
    });
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
      speakMenu('Bu bölüm için duyuru bulunamadı.', { promptId: MENU_PROMPTS.noDepartmentAnnouncements });
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
    const firstBooks = visibleBooks;
    if (!firstBooks.length) {
      giveFeedback('error');
      speakMenu('Listelenecek kitap bulunamadı.', { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    const text = firstBooks
      .map((book, index) => `${index + 1}. ${formatBookForMenu(book)}`)
      .join('. ');
    speakMenu(`Kitaplıkta ${visibleBooks.length} kitap var. İlk kitaplar: ${text}. Açmak için birinciyi aç, ikinciyi aç veya kitap adını söyleyin.`);
  }

  function formatBookForMenu(book) {
    const category = book.category || 'kategori belirtilmemiş';
    const author = book.author ? `Yazar: ${book.author}.` : 'Yazar belirtilmemiş.';
    const readingType = book.readingMode === 'tts_text' ? 'PDF metin, Web Speech ile okunacak' : 'sesli kitap';
    const language = getReadableLanguage(book.language);
    return `${book.title}. Tür: ${category}. ${author} Okuma tipi: ${readingType}. Dil: ${language}`;
  }

  function listDepartments() {
    const firstDepartments = visibleDepartments.slice(0, 8);
    speakMenu(`Bölümler: ${formatDepartmentTitles(firstDepartments)} Bölüm adı söyleyebilir, 1 diyebilir veya birinciyi aç diyebilirsiniz.`);
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
      speakMenu(`${selectedDepartment.name} için duyuru bulunamadı.`);
      return;
    }

    const text = departmentAnnouncements
      .map((announcement, index) => `${index + 1}. ${announcement.title}`)
      .join('. ');
    speakMenu(`${selectedDepartment.name} duyuruları: ${text}. Bir duyurunun detayını okumak için numarasını veya başlığından bir kelime söyleyin.`);
  }

  function readSelectedAnnouncementDetail() {
    if (!selectedAnnouncement) {
      listAnnouncements();
      return;
    }

    selectAnnouncement(selectedAnnouncement, true);
  }

  async function playAudioBook(book, startPositionSec = null) {
    try {
      stopPromptAudio();
      window.speechSynthesis?.cancel();
      stopAudioPlayback({ resetPosition: true });

      const chapters = await getPublishedChapters(book.id);
      const playableChapter = chapters.find(chapter => chapter.audio?.url);

      if (!playableChapter) {
        setIsPlaying(false);
        giveFeedback('error');
        speakMenu('Bu sesli kitap için yayımlanmış ses dosyası bulunamadı. Admin onayından sonra tekrar deneyin.', {
          promptId: MENU_PROMPTS.noPublishedAudio,
        });
        return;
      }

      const audio = new Audio(playableChapter.audio.url);
      audioPlayerRef.current = audio;
      currentAudioBookIdRef.current = book.id;
      currentAudioChapterIdRef.current = playableChapter.id;
      setIsPlaying(true);
      setStatus(`${book.title} oynatılıyor. ${playableChapter.chapterTitle || 'Ses bölümü'}.`);

      const progress = startPositionSec === null ? await loadProgressForBook(book) : null;
      const resumePosition = startPositionSec ?? progress?.positionSec ?? 0;
      if (resumePosition > 0) {
        audio.currentTime = resumePosition;
      }

      audio.ontimeupdate = () => maybeSaveAudioProgress(book, playableChapter.id, audio.currentTime);
      audio.onended = () => {
        setIsPlaying(false);
        persistProgress({
          book,
          chapterId: playableChapter.id,
          positionSec: 0,
          completed: true,
        });
        giveFeedback('success');
        speakMenu(`${book.title} tamamlandı.`);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        giveFeedback('error');
        speakMenu('Ses dosyası oynatılamadı. Storage erişim izni veya dosya bağlantısı kontrol edilmeli.', {
          promptId: MENU_PROMPTS.audioPlaybackError,
        });
      };

      await audio.play();
      giveFeedback('success');
    } catch {
      setIsPlaying(false);
      giveFeedback('error');
      speakMenu('Ses dosyası başlatılamadı. Tarayıcı izinlerini veya Storage ayarlarını kontrol edin.', {
        promptId: MENU_PROMPTS.audioStartError,
      });
    }
  }

  function seekAudio(seconds) {
    const audio = audioPlayerRef.current;
    if (!audio || selectedBook.readingMode === 'tts_text') {
      giveFeedback('focus');
      speakMenu(seconds > 0 ? 'On saniye ileri sarıldı.' : 'On saniye geri sarıldı.', {
        promptId: seconds > 0 ? MENU_PROMPTS.forwardTen : MENU_PROMPTS.backwardTen,
      });
      return;
    }

    audio.currentTime = Math.max(
      0,
      Math.min(audio.duration || Number.MAX_SAFE_INTEGER, audio.currentTime + seconds),
    );
    maybeSaveAudioProgress(selectedBook, currentAudioChapterIdRef.current, audio.currentTime, { force: true });
    giveFeedback('focus');
    setStatus(seconds > 0 ? 'Ses 10 saniye ileri sarildi.' : 'Ses 10 saniye geri sarildi.');
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
    speakMenu('Bu sırada bir seçenek bulunamadı.', { promptId: MENU_PROMPTS.noOptionsAtIndex });
    return true;
  }

  function handleCommand(rawCommand = query) {
    const trimmedQuery = rawCommand.trim();

    if (!trimmedQuery) {
      giveFeedback('error');
      speakMenu('Komut vermek için kitap adı, duyuru, dinle veya yardım yazabilirsiniz.', {
        promptId: MENU_PROMPTS.commandPrompt,
      });
      return;
    }

    setLastCommand(trimmedQuery);
    const command = parseVoiceCommand(trimmedQuery);
    const normalizedQuery = command.normalized;

    if (command.numericIndex !== null || command.ordinalIndex !== null) {
      const targetIndex = command.numericIndex ?? command.ordinalIndex;
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

    if (command.intent === 'help') {
      speakMenu(COMMAND_HELP_TEXT, { promptId: MENU_PROMPTS.commandHelp });
      return;
    }

    if (command.intent === 'resume') {
      resumeFromBookmark();
      return;
    }

    if (command.intent === 'bookmark') {
      saveBookmark();
      return;
    }

    if (command.pageNumber !== null) {
      goToPage(command.pageNumber, command.shouldAutoPlay);
      return;
    }

    if (command.intent === 'home') {
      openLibraryMode();
      return;
    }

    if (command.intent === 'back') {
      if (mode === 'announcements' && selectedDepartment) {
        setSelectedDepartment(null);
        setSelectedAnnouncement(null);
        giveFeedback('success');
        speakMenu('Bölüm listesine dönüldü.', { promptId: MENU_PROMPTS.departmentListReturn });
        return;
      }

      if (mode === 'announcements') {
        openLibraryMode();
        return;
      }

      speakMenu('Kitaplık modundasınız.', { promptId: MENU_PROMPTS.libraryModeAlready });
      return;
    }

    if (
      mode === 'announcements'
      && selectedAnnouncement
      && command.intent === 'detail'
    ) {
      readSelectedAnnouncementDetail();
      return;
    }

    if (command.intent === 'play') {
      if (mode === 'announcements' && selectedAnnouncement) {
        readSelectedAnnouncementDetail();
        return;
      }

      if (mode === 'announcements') {
        listAnnouncements();
        return;
      }

      if (!isPlaying) togglePlayback();
      else speakMenu(`${selectedBook.title} zaten oynatılıyor.`);
      return;
    }

    if (command.intent === 'pause') {
      if (isPlaying) {
        togglePlayback();
        return;
      }

      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      speakMenu('Ses durduruldu.', { promptId: MENU_PROMPTS.audioStopped });
      return;
    }

    if (command.intent === 'list') {
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

    if (command.intent === 'next') {
      if (command.isPageNavigation) {
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

    if (command.intent === 'previous') {
      if (command.isPageNavigation) {
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

    if (command.intent === 'announcements') {
      openAnnouncementsMode();
      return;
    }

    const requestedDepartment = findDepartmentByCommand(trimmedQuery);
    if (requestedDepartment) {
      setMode('announcements');
      selectDepartment(requestedDepartment);
      return;
    }

    if (command.intent === 'library') {
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
      speakMenu(`${trimmedQuery} için bölüm veya duyuru bulunamadı.`);
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
      speakMenu(`${trimmedQuery} için sonuç bulunamadı.`);
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
      if (selectedBook.readingMode === 'audio_file') {
        const audio = audioPlayerRef.current;
        persistProgress({
          book: selectedBook,
          chapterId: currentAudioChapterIdRef.current,
          positionSec: audio?.currentTime || 0,
        });
      } else if (selectedBook.readingMode === 'tts_text') {
        const chunk = textChunks[currentChunkIndex];
        persistProgress({
          book: selectedBook,
          chunkIndex: currentChunkIndex,
          pageStart: chunk?.pageStart || bookmark?.pageStart || null,
        });
      }
      stopAudioPlayback();
      window.speechSynthesis?.cancel();
      speakMenu('Oynatma duraklatıldı.', { promptId: MENU_PROMPTS.playbackPaused });
      return;
    }

    if (selectedBook.readingMode === 'tts_text') {
      speakTextBook(selectedBook, currentChunkIndex);
      return;
    }

    playAudioBook(selectedBook);
  }

  function startListening() {
    if (!recognitionSupported) {
      giveFeedback('error');
      speakMenu('Bu tarayıcı sesli komutu desteklemiyor. Arama kutusunu kullanabilirsiniz.', {
        promptId: MENU_PROMPTS.speechUnsupported,
      });
      return;
    }

    playbackTokenRef.current += 1;
    stopAudioPlayback();
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();

    const recognition = new recognitionConstructor();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      startListeningFeedback();
      showStatus('Dinliyorum. Komutunuzu söyleyin. Bip sesi duyduğunuz sürece mikrofon açık.');
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      stopListeningFeedback();
      const errorMessage =
        RECOGNITION_ERROR_MESSAGES[event.error] ||
        `Sesli komut çalışmadı. Hata kodu: ${event.error || 'bilinmiyor'}. Yazılı aramayı kullanabilirsiniz.`;
      const promptId = RECOGNITION_ERROR_PROMPTS[event.error];
      giveFeedback('error');
      speakMenu(errorMessage, promptId ? { promptId } : {});
    };

    recognition.onend = () => {
      setIsListening(false);
      stopListeningFeedback();
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
        await loadCachedSpeechConfig();
      } catch {
        // Cached ElevenLabs prompts are optional; Web Speech remains the fallback.
      } finally {
        if (!cancelled) setCachedSpeechReady(true);
      }

      try {
        const publishedBooks = await getPublishedBooks();
        if (cancelled || !publishedBooks.length) return;

        setBooks(publishedBooks);
        setSelectedBook(publishedBooks[0]);
        loadProgressForBook(publishedBooks[0]);
        setLibrarySource('Firestore kütüphanesi');
      } catch {
        if (!cancelled) {
          setLibrarySource('Örnek kütüphane');
        }
      }
    }

    loadLibrary();

    return () => {
      cancelled = true;
    };
    // Library should be loaded once on entry; progress is refreshed again when a book is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cachedSpeechReady) return;

    const welcomeTimer = window.setTimeout(() => {
      speakMenu(WELCOME_MESSAGE, { promptId: MENU_PROMPTS.welcome });
    }, 0);

    return () => {
      window.clearTimeout(welcomeTimer);
      playbackTokenRef.current += 1;
      stopPromptAudio();
      stopAudioPlayback({ resetPosition: true });
      stopListeningFeedback();
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
    // Welcome prompt should run once after cached prompt configuration is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedSpeechReady, speechSupported]);

  useEffect(() => {
    const nextMode = userProfile?.blindInterfaceMode;
    if (nextMode === 'simple' || nextMode === 'standard') {
      localStorage.setItem(BLIND_INTERFACE_KEY, nextMode);
    }
  }, [userProfile?.blindInterfaceMode]);

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
        seekAudio(10);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        seekAudio(-10);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (mode === 'announcements') openLibraryMode();
      }

      if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        speakMenu(COMMAND_HELP_TEXT, { promptId: MENU_PROMPTS.commandHelp });
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('keydown', handleKeyboard);
      stopListeningFeedback();
    };
  });

  if (blindInterfaceMode === 'simple') {
    return (
      <main className="blind-page blind-page-simple">
        <button
          type="button"
          className={isListening ? 'blind-simple-mic-button listening' : 'blind-simple-mic-button'}
          onClick={startListening}
          autoFocus
          aria-label={isListening ? 'Dinleniyor' : 'Sesli komut ver'}
        >
          <span aria-hidden="true">🎙</span>
        </button>
        <p className="blind-simple-status" aria-live="polite">
          {isListening ? 'Dinleniyor. Komutunuzu söyleyin.' : status}
        </p>
      </main>
    );
  }

  return (
    <main className="blind-page">
      <section className="blind-hero" aria-live="polite">
        <p className="blind-kicker">Duyum</p>
        <h1>Dinleme Modu</h1>
        <p className="blind-status">{status}</p>
      </section>

      <section className="blind-controls" aria-label="Ana dinleme kontrolleri">
        <button
          type="button"
          className="blind-primary-action"
          onClick={startListening}
          onFocus={() => giveFeedback('focus')}
          autoFocus
        >
          {isListening ? 'Dinleniyor' : 'Komut Ver'}
        </button>
        <button
          type="button"
          className="blind-secondary-action"
          onClick={mode === 'announcements' ? openLibraryMode : togglePlayback}
          onFocus={() => giveFeedback('focus')}
        >
          {mode === 'announcements' ? 'Kitaplara Dön' : (isPlaying ? 'Duraklat' : 'Dinle')}
        </button>
      </section>

      <section className="blind-mode-switch" aria-label="Mod secimi">
        <button
          type="button"
          className={mode === 'announcements' ? 'blind-mode-button active' : 'blind-mode-button'}
          onClick={openAnnouncementsMode}
          onFocus={() => giveFeedback('focus')}
        >
          GTÜ Duyuruları
        </button>
        <button
          type="button"
          className={mode === 'library' ? 'blind-mode-button active' : 'blind-mode-button'}
          onClick={openLibraryMode}
          onFocus={() => giveFeedback('focus')}
        >
          Kitaplık
        </button>
      </section>

      <section className="blind-search" aria-label="Yazılı arama">
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
            placeholder="Örnek: dinle, sonraki, duyurular, Nutuk"
          />
          <button type="button" onClick={() => handleCommand()}>
            Komutu Çalıştır
          </button>
        </div>
      </section>

      <section className="blind-command-help" aria-label="Komut yardımı">
        <strong>Komutlar</strong>
        <span>Dinle</span>
        <span>Duraklat</span>
        <span>Sonraki</span>
        <span>Önceki</span>
        <span>Listele</span>
        <span>Sonraki sayfa</span>
        <span>5. sayfaya git</span>
        <span>Kaldığım yeri işaretle</span>
        <span>Kaldığım yerden devam et</span>
        <span>Duyurular</span>
        <span>Geri dön</span>
        <span>Yardım</span>
        {lastCommand && <em>Son komut: {lastCommand}</em>}
      </section>

      {mode === 'library' && (
        <>
          <section className="blind-now-playing" aria-label="Seçili içerik">
            <span>Seçili içerik</span>
            <h2>{selectedBook.title}</h2>
            <p>{selectedBook.chapterTitle || (selectedBook.readingMode === 'tts_text' ? 'PDF metni' : 'Tam Metin')}</p>
            <p>{selectedBook.author || 'Bilinmeyen yazar'} - {getBookDuration(selectedBook)}</p>
            <p>Okuma dili: {getReadableLanguage(selectedBook.language)}</p>
            <p>{selectedBook.readingMode === 'tts_text' ? 'PDF metni Web Speech API ile okunacak' : 'Ses dosyası modu'}</p>
            {selectedBook.readingMode === 'tts_text' && (
              <p>
                Geçerli sayfa: {textChunks[currentChunkIndex]?.pageStart || 'hazır değil'}
                {bookmark ? ` - İşaretli yer: sayfa ${bookmark.pageStart}` : ''}
              </p>
            )}
          </section>

          <section className="blind-library-header" aria-label="Kütüphane kaynağı">
            <span>{librarySource}</span>
          </section>

          <section className="blind-library" aria-label="Kütüphane">
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
          <section className="blind-now-playing" aria-label="GTÜ duyuru durumu">
            <span>GTÜ Duyuruları</span>
            <h2>{selectedDepartment ? selectedDepartment.name : 'Bölüm Seçimi'}</h2>
            <p>{selectedAnnouncement ? selectedAnnouncement.title : 'Bölüm adını söyleyin veya listeden seçin.'}</p>
            <p>{selectedAnnouncement ? selectedAnnouncement.summary : 'Örnek: Bilgisayar duyuruları, Matematik duyuruları.'}</p>
          </section>

          {!selectedDepartment && (
            <section className="blind-library" aria-label="GTÜ bölümleri">
              {visibleDepartments.map((department) => (
                <button
                  type="button"
                  className="blind-book"
                  key={department.id}
                  onClick={() => selectDepartment(department)}
                  onFocus={() => giveFeedback('focus')}
                >
                  <strong>{department.name}</strong>
                  <span>Duyuruları aç</span>
                </button>
              ))}
            </section>
          )}

          {selectedDepartment && (
            <section className="blind-library" aria-label="Bölüm duyuruları">
              <button
                type="button"
                className="blind-book"
                onClick={() => setSelectedDepartment(null)}
                onFocus={() => giveFeedback('focus')}
              >
                <strong>Bölümlere Dön</strong>
                <span>GTÜ bölüm listesine geri dön</span>
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
