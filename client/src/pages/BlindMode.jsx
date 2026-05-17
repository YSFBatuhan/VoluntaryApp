import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBookTextChunks, getPublishedBooks, getPublishedChapters } from '../services/libraryService';
import { getReadingProgress, saveReadingProgress } from '../services/progressService';
import {
  createCachedSpeechAudio,
  getCachedAnnouncementAudioUrl,
  getCachedMenuAudioUrl,
  loadAnnouncementAudioCache,
  loadCachedSpeechConfig,
  MENU_PROMPTS,
} from '../services/cachedSpeechService';
import { generateCachedDynamicSpeech } from '../services/elevenLabsGenerationService';
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
  'Duyum dinleme moduna hoş geldiniz. Komut vermek için Enter tuşuna basabilir veya ekrandaki büyük mikrofon düğmesine dokunabilirsiniz. Kitapları duymak için kitapları listele deyin. GTÜ duyuruları için duyurular deyin. Son mesajı yeniden duymak için tekrar et, yardım almak için yardım deyin.';

const DYNAMIC_SPEECH_FALLBACK_MS = 1200;
const ACTIVATION_MESSAGE =
  'Duyum açıldı. Komut vermek için ekrana tekrar dokunun veya Enter tuşuna basın. Yardım için yardım deyin.';

const COMMAND_HELP_TEXT =
  'Yardım rehberi. Komut vermek için Enter tuşuna basın veya büyük mikrofon düğmesine dokunun. Kitapları listelemek için kitapları listele deyin. Bir kitabı açmak için birinciyi aç veya kitap adını söyleyin. Dinlemek için dinle, durdurmak için duraklat deyin. PDF kitaplarda sonraki sayfa, önceki sayfa veya beşinci sayfaya git diyebilirsiniz. Duyurulara geçmek için duyurular deyin. Bölüm seçmek için Bilgisayar duyuruları veya Matematik duyuruları diyebilirsiniz. Duyuru listesinden bir duyuru açmak için birinciyi aç, ikinciyi aç veya başlıktan bir kelime söyleyin. Açılan duyuruda kısa metin için özet oku, tam metin için detay oku deyin. Duyurular arasında gezinmek için sonraki duyuru veya önceki duyuru deyin. Son mesajı yeniden duymak için tekrar et deyin. Geri dönmek için geri dön deyin. Klavyede Space dinle ve duraklat, sağ ok ileri, sol ok geri, H yardım komutudur.';

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

function hasNaturalAudio(book) {
  return book?.sourceType === 'pdf' && book?.naturalAudio?.status === 'ready';
}

function getPlaybackMode(book) {
  if (hasNaturalAudio(book)) return 'audio_file';
  return book?.readingMode || 'tts_text';
}

export default function BlindMode() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(WELCOME_MESSAGE);
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [librarySource, setLibrarySource] = useState('Örnek kütüphane');
  const [publishedLibraryLoaded, setPublishedLibraryLoaded] = useState(false);
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
  const [cachedSpeechReady, setCachedSpeechReady] = useState(true);
  const [isWelcomeActive, setIsWelcomeActive] = useState(true);
  const [hasUserActivatedAudio, setHasUserActivatedAudio] = useState(false);
  const [speechSupported] = useState(() => 'speechSynthesis' in window);
  const [recognitionSupported] = useState(Boolean(recognitionConstructor));
  const recognitionRef = useRef(null);
  const listeningPulseRef = useRef(null);
  const processingPulseRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const speechRequestTokenRef = useRef(0);
  const promptAudioRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const currentAudioBookIdRef = useRef('');
  const currentAudioChapterIdRef = useRef('');
  const lastProgressSaveRef = useRef(0);
  const welcomeCompletedRef = useRef(false);
  const pendingWelcomeActionRef = useRef(null);
  const idleReminderTimerRef = useRef(null);
  const isPlayingRef = useRef(false);
  const isListeningRef = useRef(false);
  const lastSpokenMessageRef = useRef(WELCOME_MESSAGE);
  const libraryLoadingAnnouncedRef = useRef(false);

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
      processing: { frequency: 340, duration: 0.08, volume: 0.04 },
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

  function finishSpeechCallback(callback) {
    if (typeof callback === 'function') callback();
  }

  function playCachedSpeech(url, fallback, options = {}) {
    stopPromptAudio();
    window.speechSynthesis?.cancel();

    const audio = createCachedSpeechAudio(url);
    promptAudioRef.current = audio;
    audio.onended = () => {
      if (promptAudioRef.current === audio) promptAudioRef.current = null;
      finishSpeechCallback(options.onEnd);
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

  async function playGeneratedSpeech(message, language, fallback, options = {}) {
    if (!options.allowDynamicSpeech) {
      fallback();
      return;
    }

    let fallbackTimer = null;
    let fallbackUsed = false;
    startProcessingFeedback();

    const playFallbackSpeech = () => {
      if (fallbackUsed) return;
      fallbackUsed = true;
      stopProcessingFeedback();
      if (options.requestToken !== speechRequestTokenRef.current) return;
      fallback();
    };

    try {
      fallbackTimer = window.setTimeout(playFallbackSpeech, DYNAMIC_SPEECH_FALLBACK_MS);
      const result = await generateCachedDynamicSpeech({
        text: message,
        language,
        announcementId: options.announcementId,
        announcementVariant: options.announcementVariant,
        publicPromptId: options.publicPromptId,
      });

      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      stopProcessingFeedback();
      if (fallbackUsed) return;
      if (options.requestToken !== speechRequestTokenRef.current) return;

      if (result?.audioUrl) {
        playCachedSpeech(result.audioUrl, fallback, options);
        return;
      }
    } catch {
      // Missing quota, config, or provider access should not break the listener screen.
    } finally {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      stopProcessingFeedback();
    }

    if (fallbackUsed) return;
    if (options.requestToken !== speechRequestTokenRef.current) return;
    playFallbackSpeech();
  }

  function speak(message, language = 'tr-TR', options = {}) {
    setStatus(message);
    if (!options.skipHistory) lastSpokenMessageRef.current = message;
    const requestToken = speechRequestTokenRef.current + 1;
    speechRequestTokenRef.current = requestToken;

    const fallback = () => {
      if (!speechSupported) {
        finishSpeechCallback(options.onEnd);
        return;
      }

      stopPromptAudio();
      window.speechSynthesis.cancel();
      const utterance = createUtterance(message, language);
      utterance.onend = () => finishSpeechCallback(options.onEnd);
      utterance.onerror = () => finishSpeechCallback(options.onEnd);
      window.speechSynthesis.speak(utterance);
    };

    if (options.cachedAudioUrl) {
      playCachedSpeech(options.cachedAudioUrl, fallback, options);
      return;
    }

    playGeneratedSpeech(message, language, fallback, { ...options, requestToken });
  }

  function speakMenu(message, options = {}) {
    setStatus(message);
    if (!options.skipHistory) lastSpokenMessageRef.current = message;
    const requestToken = speechRequestTokenRef.current + 1;
    speechRequestTokenRef.current = requestToken;
    const publicPromptId =
      options.publicPromptId
      || (options.promptId ? `blind_menu_${sanitizePromptKey(options.promptId)}` : createMenuPromptId(message));

    const fallback = () => {
      if (!speechSupported) {
        finishSpeechCallback(options.onEnd);
        return;
      }

      stopPromptAudio();
      window.speechSynthesis.cancel();
      const utterance = createMenuUtterance(message);
      utterance.onend = () => finishSpeechCallback(options.onEnd);
      utterance.onerror = () => finishSpeechCallback(options.onEnd);
      window.speechSynthesis.speak(utterance);
    };

    const cachedAudioUrl = options.cachedAudioUrl
      || getCachedMenuAudioUrl(options.promptId)
      || getCachedMenuAudioUrl(publicPromptId);
    if (cachedAudioUrl) {
      playCachedSpeech(cachedAudioUrl, fallback, options);
      return;
    }

    playGeneratedSpeech(message, 'tr-TR', fallback, {
      allowDynamicSpeech: options.allowDynamicSpeech ?? false,
      ...options,
      publicPromptId,
      requestToken,
    });
  }

  function createMenuPromptId(message) {
    const normalized = normalizeText(message).slice(0, 120);
    const readablePart = sanitizePromptKey(normalized).slice(0, 48) || 'prompt';
    return `blind_menu_${readablePart}_${hashPromptText(message)}`;
  }

  function sanitizePromptKey(value = '') {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'prompt';
  }

  function hashPromptText(value = '') {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function clearIdleReminder() {
    if (!idleReminderTimerRef.current) return;
    window.clearTimeout(idleReminderTimerRef.current);
    idleReminderTimerRef.current = null;
  }

  function scheduleIdleReminder() {
    clearIdleReminder();
  }

  function registerUserActivity() {
    if (welcomeCompletedRef.current) scheduleIdleReminder();
  }

  function runAfterWelcome(action) {
    if (welcomeCompletedRef.current) {
      registerUserActivity();
      return true;
    }

    pendingWelcomeActionRef.current = action;
    stopPromptAudio();
    window.speechSynthesis?.cancel();
    finishWelcome();
    return false;
  }

  function activateAudioSession() {
    if (hasUserActivatedAudio) return true;

    setHasUserActivatedAudio(true);
    giveFeedback('success');
    stopPromptAudio();
    window.speechSynthesis?.cancel();
    finishWelcome();
    setStatus(ACTIVATION_MESSAGE);
    return false;
  }

  function handlePrimaryTouch() {
    if (!activateAudioSession()) return;
    startListening();
  }

  function repeatLastMessage() {
    const message = lastSpokenMessageRef.current || status || WELCOME_MESSAGE;
    giveFeedback('focus');
    speakMenu(`Tekrar ediyorum. ${message}`, {
      allowDynamicSpeech: false,
      skipHistory: true,
    });
  }

  function finishWelcome() {
    if (welcomeCompletedRef.current) return;

    welcomeCompletedRef.current = true;
    setIsWelcomeActive(false);
    scheduleIdleReminder();

    const pendingAction = pendingWelcomeActionRef.current;
    pendingWelcomeActionRef.current = null;
    if (pendingAction) {
      window.setTimeout(() => {
        registerUserActivity();
        pendingAction();
      }, 150);
    }
  }

  function getBookDuration(book) {
    if (book.duration) return book.duration;
    if (book.estimatedReadingMinutes) return `${book.estimatedReadingMinutes} dakika`;
    if (book.totalDurationSec) return `${Math.max(1, Math.round(book.totalDurationSec / 60))} dakika`;
    return 'süre bilgisi yok';
  }

  function getBookmarkKey(bookId = selectedBook?.id) {
    if (!bookId) return 'echovoices:bookmark:unknown';
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

  function readLocalBookmark(bookId = selectedBook?.id) {
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
      if (getPlaybackMode(book) === 'tts_text') {
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
      readingMode: getPlaybackMode(book),
      chunkIndex,
      pageStart,
      positionSec: Math.max(0, Math.floor(positionSec || 0)),
      chapterId,
      savedAt: new Date().toISOString(),
    };

    writeLocalBookmark(nextBookmark);
    setBookmark(nextBookmark);

    if (currentUser) {
      try {
        await saveReadingProgress({
          userId: currentUser.uid,
          book: { ...book, readingMode: getPlaybackMode(book) },
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
      if (getPlaybackMode(book) === 'audio_file') {
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
      readingMode: getPlaybackMode(book),
      chunkIndex: progress.chunkIndex || 0,
      pageStart: progress.pageStart || null,
      positionSec: progress.positionSec || 0,
      chapterId: progress.chapterId || '',
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
    if (!selectedBook) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    if (getPlaybackMode(selectedBook) !== 'tts_text') {
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

    startProcessingFeedback();
    try {
      const chunks = await getBookTextChunks(book.id, 40);
      setTextChunks(chunks);
      return chunks;
    } finally {
      stopProcessingFeedback();
    }
  }

  async function speakTextBook(book, startIndex = 0) {
    if (!book) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

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

  function startProcessingFeedback() {
    stopProcessingFeedback();
    vibrate([35, 45, 35]);
    playTone('processing');
    processingPulseRef.current = window.setInterval(() => {
      vibrate(25);
      playTone('processing');
    }, 900);
  }

  function stopProcessingFeedback() {
    if (!processingPulseRef.current) return;
    window.clearInterval(processingPulseRef.current);
    processingPulseRef.current = null;
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
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(() => selectBook(book))) return;

    setQuery('');
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
    if (!selectedBook) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    if (getPlaybackMode(selectedBook) !== 'tts_text') {
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
    if (!selectedBook) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    if (getPlaybackMode(selectedBook) !== 'tts_text') {
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
    if (!selectedBook) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    const savedBookmark = await loadProgressForBook(selectedBook);
    if (!savedBookmark) {
      giveFeedback('error');
      speakMenu('Bu kitap için kayıtlı kaldığınız yer yok.', { promptId: MENU_PROMPTS.noBookmark });
      return;
    }

    setBookmark(savedBookmark);
    if (getPlaybackMode(selectedBook) === 'tts_text') {
      goToTextChunk(savedBookmark.chunkIndex || 0, true);
      return;
    }

    playAudioBook(selectedBook, savedBookmark.positionSec || 0);
  }

  function selectBookByIndex(nextIndex) {
    if (!books.length) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    const normalizedIndex = (nextIndex + books.length) % books.length;
    selectBook(books[normalizedIndex]);
  }

  function getSelectedBookIndex() {
    if (!selectedBook) return 0;
    return Math.max(0, books.findIndex((book) => book.id === selectedBook.id));
  }

  function openAnnouncementsMode() {
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(openAnnouncementsMode)) return;

    setQuery('');
    setMode('announcements');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    setIsPlaying(false);
    playbackTokenRef.current += 1;
    stopAudioPlayback({ resetPosition: true });
    window.speechSynthesis?.cancel();
    giveFeedback('success');
    speakMenu(`GTÜ duyuruları modu açıldı. ${formatDepartmentTitles(GTU_DEPARTMENTS)} Bölüm seçmek için 1, 2 gibi sırasını; ya da Bilgisayar duyuruları, Matematik duyuruları gibi bölüm adını söyleyin. Komutları tekrar duymak için yardım deyin.`, {
      promptId: MENU_PROMPTS.announcementsMode,
    });
  }

  function openLibraryMode() {
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(openLibraryMode)) return;

    setQuery('');
    setMode('library');
    setSelectedDepartment(null);
    setSelectedAnnouncement(null);
    stopAudioPlayback();
    giveFeedback('success');
    speakMenu('Kitap dinleme moduna dönüldü.', { promptId: MENU_PROMPTS.libraryMode });
  }

  function selectDepartment(department) {
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(() => selectDepartment(department))) return;

    setQuery('');
    setSelectedDepartment(department);
    setSelectedAnnouncement(null);
    giveFeedback('success');
    const announcements = GTU_ANNOUNCEMENTS.filter(
      (announcement) => announcement.departmentId === department.id,
    );

    if (!announcements.length) {
      speakMenu(`${department.name} duyuruları açıldı. Henüz duyuru bulunamadı.`, {
        allowDynamicSpeech: true,
        publicPromptId: `blind_department_${department.id}_empty`,
      });
      return;
    }

    speakMenu(`${department.name} duyuruları açıldı. ${announcements.length} duyuru bulundu. ${formatAnnouncementTitles(announcements)} Bir duyuruya girmek için birinciyi aç, ikinciyi aç veya duyuru başlığından bir kelime söyleyin. Duyuru açıldıktan sonra tam metin için detay oku, kısa metin için özet oku diyebilirsiniz.`, {
      allowDynamicSpeech: true,
      publicPromptId: `blind_department_${department.id}_list`,
    });
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
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(() => selectAnnouncement(announcement, readFullDetail))) return;

    setQuery('');
    setSelectedAnnouncement(announcement);
    giveFeedback('success');
    const navigationHint = readFullDetail
      ? 'Komutlar: Özete dönmek için özet oku, sonraki duyuru için sonraki duyuru, önceki duyuru için önceki duyuru, bölüm listesine dönmek için geri dön deyin.'
      : 'Komutlar: Tam metni okumak için detay oku, sonraki duyuru için sonraki duyuru, önceki duyuru için önceki duyuru, bölüm listesine dönmek için geri dön deyin.';
    const detailText = `${getAnnouncementSpeechText(announcement, { readFullDetail })} ${navigationHint}`;
    speak(detailText, announcement.language || 'tr-TR', {
      cachedAudioUrl: getCachedAnnouncementAudioUrl(announcement, { readFullDetail }),
      allowDynamicSpeech: true,
      announcementId: announcement.id,
      announcementVariant: readFullDetail ? 'detail' : 'summary',
    });
  }

  function getAnnouncementSpeechText(announcement, { readFullDetail = false } = {}) {
    const content = getAnnouncementContent(announcement, { readFullDetail });
    if (content) return `${announcement.title}. ${content}`;

    if (announcement.detailUrl) {
      return `${announcement.title}. Bu duyuru için okunabilir detay metni alınamadı. Kaynak bağlantısı ekranda mevcut.`;
    }

    return `${announcement.title}. Bu duyuru için okunabilir içerik bulunamadı.`;
  }

  function getAnnouncementContent(announcement, { readFullDetail = false } = {}) {
    const candidates = readFullDetail
      ? [announcement.bodyText, announcement.summary]
      : [announcement.summary, announcement.bodyText];

    return candidates
      .map((value) => String(value || '').trim())
      .find((value) => value && !isMissingAnnouncementContent(value)) || '';
  }

  function isMissingAnnouncementContent(value) {
    const normalized = normalizeText(value);
    return normalized.includes('bu duyuru icin kaynak sayfada ayri detay metni bulunamadi')
      || normalized.includes('duyuru metnine ulasmak icin tiklayiniz')
      || normalized.includes('duyurusuna ulasmak icin tiklayiniz')
      || normalized.includes('detayli bilgiye ulasmak icin tiklayiniz');
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
    const exactDepartment = GTU_DEPARTMENTS.find((department) => {
      const searchableText = normalizeText(`${department.name} ${department.keywords.join(' ')}`);
      return searchableText.includes(normalizedCommand) || normalizedCommand.includes(normalizeText(department.name));
    });
    if (exactDepartment) return exactDepartment;

    const scoredDepartments = GTU_DEPARTMENTS
      .map((department) => ({
        department,
        score: getFuzzyMatchScore(
          normalizedCommand,
          normalizeText(`${department.name} ${department.keywords.join(' ')}`),
        ),
      }))
      .filter(({ score }) => score >= 3)
      .sort((a, b) => b.score - a.score);

    return scoredDepartments[0]?.department || null;
  }

  function isGenericAnnouncementsCommand(normalizedCommand) {
    return ['duyuru', 'duyurular', 'gtu duyurulari', 'gtu duyurulari'].includes(normalizedCommand);
  }

  function getFuzzyMatchScore(normalizedCommand, normalizedTarget) {
    const commandWords = normalizedCommand.split(' ').filter((word) => word.length >= 3);
    const targetWords = normalizedTarget.split(' ').filter((word) => word.length >= 3);

    return commandWords.reduce((score, word) => {
      const matched = targetWords.some((targetWord) => {
        if (targetWord === word) return true;
        if (targetWord.startsWith(word) || word.startsWith(targetWord)) return true;
        return Math.max(word.length, targetWord.length) >= 5
          && getEditDistance(word, targetWord) <= 2;
      });

      return matched ? score + Math.min(3, word.length) : score;
    }, 0);
  }

  function getEditDistance(first, second) {
    const rows = Array.from({ length: first.length + 1 }, (_, index) => [index]);

    for (let column = 1; column <= second.length; column += 1) {
      rows[0][column] = column;
    }

    for (let row = 1; row <= first.length; row += 1) {
      for (let column = 1; column <= second.length; column += 1) {
        const cost = first[row - 1] === second[column - 1] ? 0 : 1;
        rows[row][column] = Math.min(
          rows[row - 1][column] + 1,
          rows[row][column - 1] + 1,
          rows[row - 1][column - 1] + cost,
        );
      }
    }

    return rows[first.length][second.length];
  }

  function listBooks() {
    const firstBooks = books.slice(0, 10);
    if (!firstBooks.length) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage());
      return;
    }

    const text = firstBooks
      .map((book, index) => `${index + 1}. ${formatBookForMenu(book)}`)
      .join('. ');
    speakMenu(`Kitaplıkta ${firstBooks.length} kitap var. İlk kitaplar: ${text}. Açmak için birinciyi aç, ikinciyi aç veya kitap adını söyleyin.`);
  }

  function getNoBooksMessage() {
    if (publishedLibraryLoaded) {
      return 'Yayınlanmış kitap bulunamadı. Yüklenen ses dosyaları veya PDF kitaplar admin onayından sonra dinleyici kitaplığında görünür.';
    }

    return 'Kitaplık henüz yüklenemedi. Birkaç saniye sonra tekrar deneyin.';
  }

  function formatBookForMenu(book) {
    const category = book.category || 'kategori belirtilmemiş';
    const author = book.author ? `Yazar: ${book.author}.` : 'Yazar belirtilmemiş.';
    const readingType = hasNaturalAudio(book)
      ? 'PDF metninden üretilmiş doğal ses'
      : (book.readingMode === 'tts_text' ? 'PDF metin, Web Speech ile okunacak' : 'sesli kitap');
    const language = getReadableLanguage(book.language);
    return `${book.title}. Tür: ${category}. ${author} Okuma tipi: ${readingType}. Dil: ${language}`;
  }

  function listDepartments() {
    speakMenu(`Bölümler: ${formatDepartmentTitles(visibleDepartments)} Bölüm adı söyleyebilir, 1 diyebilir veya birinciyi aç diyebilirsiniz.`, {
      allowDynamicSpeech: true,
      publicPromptId: 'blind_department_list',
    });
  }

  function formatDepartmentTitles(departments, maxCount = departments.length) {
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
      speakMenu(`${selectedDepartment.name} için duyuru bulunamadı.`, {
        allowDynamicSpeech: true,
        publicPromptId: `blind_announcement_${selectedDepartment.id}_empty`,
      });
      return;
    }

    const text = departmentAnnouncements
      .map((announcement, index) => `${index + 1}. ${announcement.title}`)
      .join('. ');
    speakMenu(`${selectedDepartment.name} duyuruları: ${text}. Bir duyuru açmak için numarasını veya başlığından bir kelime söyleyin. Açılan duyuruda tam metin için detay oku, kısa metin için özet oku deyin.`, {
      allowDynamicSpeech: true,
      publicPromptId: `blind_announcement_${selectedDepartment.id}_list`,
    });
  }

  function readSelectedAnnouncementDetail() {
    if (!selectedAnnouncement) {
      listAnnouncements();
      return;
    }

    selectAnnouncement(selectedAnnouncement, true);
  }

  function readSelectedAnnouncementSummary() {
    if (!selectedAnnouncement) {
      listAnnouncements();
      return;
    }

    selectAnnouncement(selectedAnnouncement, false);
  }

  async function playAudioBook(book, startPositionSec = null) {
    try {
      stopPromptAudio();
      window.speechSynthesis?.cancel();
      stopAudioPlayback({ resetPosition: true });
      startProcessingFeedback();
      setStatus(`${book.title} hazırlanıyor. Ses dosyası kontrol ediliyor.`);

      const chapters = await getPublishedChapters(book.id);
      const playableChapters = chapters.filter(chapter => chapter.audio?.url);
      stopProcessingFeedback();

      if (!playableChapters.length) {
        setIsPlaying(false);
        giveFeedback('error');
        speakMenu('Bu sesli kitap için yayımlanmış ses dosyası bulunamadı. Admin onayından sonra tekrar deneyin.', {
          promptId: MENU_PROMPTS.noPublishedAudio,
        });
        return;
      }

      const progress = startPositionSec === null ? await loadProgressForBook(book) : null;
      const savedChapterIndex = progress?.chapterId
        ? playableChapters.findIndex(chapter => chapter.id === progress.chapterId)
        : -1;
      const chapterIndex = Math.max(0, savedChapterIndex);
      const resumePosition = startPositionSec ?? progress?.positionSec ?? 0;
      playAudioChapterSequence({
        book,
        chapters: playableChapters,
        chapterIndex,
        startPositionSec: resumePosition,
      });
    } catch {
      stopProcessingFeedback();
      setIsPlaying(false);
      giveFeedback('error');
      speakMenu('Ses dosyası başlatılamadı. Tarayıcı izinlerini veya Storage ayarlarını kontrol edin.', {
        promptId: MENU_PROMPTS.audioStartError,
      });
    }
  }

  async function playAudioChapterSequence({ book, chapters, chapterIndex, startPositionSec = 0 }) {
    try {
      const playableChapter = chapters[chapterIndex];
      const audio = new Audio(playableChapter.audio.url);
      audioPlayerRef.current = audio;
      currentAudioBookIdRef.current = book.id;
      currentAudioChapterIdRef.current = playableChapter.id;
      setIsPlaying(true);
      setStatus(`${book.title} oynatılıyor. ${playableChapter.chapterTitle || 'Ses bölümü'}.`);

      if (startPositionSec > 0) {
        audio.currentTime = startPositionSec;
      }

      audio.ontimeupdate = () => maybeSaveAudioProgress(book, playableChapter.id, audio.currentTime);
      audio.onended = () => {
        const nextChapterIndex = chapterIndex + 1;
        if (nextChapterIndex < chapters.length) {
          persistProgress({ book, chapterId: chapters[nextChapterIndex].id, positionSec: 0 });
          playAudioChapterSequence({
            book,
            chapters,
            chapterIndex: nextChapterIndex,
            startPositionSec: 0,
          });
          return;
        }

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
    if (!audio || getPlaybackMode(selectedBook) === 'tts_text') {
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
    if (!runAfterWelcome(() => handleCommand(rawCommand))) return;

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

    if (command.intent === 'repeat') {
      repeatLastMessage();
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

    if (
      mode === 'announcements'
      && selectedAnnouncement
      && command.intent === 'summary'
    ) {
      readSelectedAnnouncementSummary();
      return;
    }

    if (command.intent === 'play') {
      if (mode === 'announcements' && selectedAnnouncement) {
        readSelectedAnnouncementSummary();
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
      const requestedDepartment = findDepartmentByCommand(trimmedQuery);
      if (requestedDepartment && !isGenericAnnouncementsCommand(normalizedQuery)) {
        setMode('announcements');
        selectDepartment(requestedDepartment);
        return;
      }

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
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(togglePlayback)) return;

    if (!selectedBook) {
      giveFeedback('error');
      speakMenu(getNoBooksMessage(), { promptId: MENU_PROMPTS.noBooks });
      return;
    }

    const nextPlaying = !isPlaying;
    giveFeedback('success');

    if (!nextPlaying) {
      playbackTokenRef.current += 1;
      setIsPlaying(false);
      if (getPlaybackMode(selectedBook) === 'audio_file') {
        const audio = audioPlayerRef.current;
        persistProgress({
          book: selectedBook,
          chapterId: currentAudioChapterIdRef.current,
          positionSec: audio?.currentTime || 0,
        });
      } else if (getPlaybackMode(selectedBook) === 'tts_text') {
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

    if (getPlaybackMode(selectedBook) === 'tts_text') {
      speakTextBook(selectedBook, currentChunkIndex);
      return;
    }

    playAudioBook(selectedBook);
  }

  function pickBestTranscript(alternatives) {
    if (!alternatives.length) return '';

    const scored = alternatives.map((transcript, index) => {
      const command = parseVoiceCommand(transcript);
      const normalizedTranscript = command.normalized || normalizeText(transcript);
      let score = Math.max(0, 3 - index);

      if (command.intent) score += 5;
      if (command.numericIndex !== null || command.ordinalIndex !== null) score += 3;
      if (command.pageNumber !== null) score += 3;

      const matchedBook = books.some((book) => {
        const searchableText = normalizeText(
          `${book.title} ${book.author || ''} ${book.category || ''} ${book.chapterTitle || ''}`,
        );
        return searchableText.includes(normalizedTranscript)
          || getFuzzyMatchScore(normalizedTranscript, searchableText) >= 3;
      });
      if (matchedBook) score += 4;

      if (mode === 'announcements') {
        const matchedDepartment = GTU_DEPARTMENTS.some((department) => {
          const searchableText = normalizeText(`${department.name} ${department.keywords.join(' ')}`);
          return searchableText.includes(normalizedTranscript)
            || getFuzzyMatchScore(normalizedTranscript, searchableText) >= 3;
        });
        if (matchedDepartment) score += 4;

        if (selectedDepartment) {
          const matchedAnnouncement = departmentAnnouncements.some((announcement) =>
            normalizeText(announcement.title).includes(normalizedTranscript),
          );
          if (matchedAnnouncement) score += 4;
        }
      }

      return { transcript, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].transcript;
  }

  function startListening() {
    if (!activateAudioSession()) return;
    if (!runAfterWelcome(startListening)) return;

    if (!recognitionSupported) {
      giveFeedback('error');
      speakMenu('Bu tarayıcı sesli komutu desteklemiyor. Klavyede H tuşu yardım rehberini, Space seçili kitabı dinlemeyi, sağ ve sol oklar ileri geri gitmeyi sağlar. Yazılı arama kutusu standart arayüzde kullanılabilir.', {
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
    recognition.maxAlternatives = 3;
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
      speakMenu(`${errorMessage} Klavyede H yardım, Space dinle veya duraklat, sağ ve sol oklar ileri geri gitmek içindir. Tekrar denemek için ekrana dokunun.`, promptId ? { promptId } : {});
    };

    recognition.onend = () => {
      setIsListening(false);
      stopListeningFeedback();
    };

    recognition.onresult = (event) => {
      const alternatives = Array.from(event.results[0] || [])
        .map(result => result.transcript)
        .filter(Boolean);
      const transcript = pickBestTranscript(alternatives);
      setQuery(transcript);
      handleCommand(transcript);
    };

    recognition.start();
  }

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        if (!libraryLoadingAnnouncedRef.current) {
          libraryLoadingAnnouncedRef.current = true;
          startProcessingFeedback();
          setStatus('Duyum hazırlanıyor. Kitaplık ve duyuru sesleri yükleniyor.');
        }

        await Promise.all([
          loadCachedSpeechConfig(),
          loadAnnouncementAudioCache(),
        ]);
      } catch {
        // Cached ElevenLabs prompts are optional; Web Speech remains the fallback.
      } finally {
        if (!cancelled) setCachedSpeechReady(true);
      }

      try {
        const publishedBooks = await getPublishedBooks();
        if (cancelled) return;
        stopProcessingFeedback();

        setPublishedLibraryLoaded(true);
        if (!publishedBooks.length) {
          setBooks([]);
          setSelectedBook(null);
          setLibrarySource('Yayınlanmış kitap yok');
          return;
        }

        setBooks(publishedBooks);
        setSelectedBook(publishedBooks[0]);
        loadProgressForBook(publishedBooks[0]);
        setLibrarySource('Firestore kütüphanesi');
      } catch {
        stopProcessingFeedback();
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
      setIsWelcomeActive(true);
      giveFeedback('focus');
      setStatus(WELCOME_MESSAGE);
      finishWelcome();
    }, 0);

    return () => {
      window.clearTimeout(welcomeTimer);
      clearIdleReminder();
      playbackTokenRef.current += 1;
      stopPromptAudio();
      stopAudioPlayback({ resetPosition: true });
      stopListeningFeedback();
      stopProcessingFeedback();
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
    // Welcome is visual-only on startup; user audio starts after explicit interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedSpeechReady, speechSupported]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isListeningRef.current = isListening;
    if (welcomeCompletedRef.current) scheduleIdleReminder();
    // Idle reminder should reflect current playback and listening states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isListening]);

  useEffect(() => {
    function handleKeyboard(event) {
      if (event.target.tagName === 'INPUT') return;

      if (!welcomeCompletedRef.current) {
        if (
          event.code === 'Space'
          || event.key === 'Enter'
          || event.key === 'ArrowRight'
          || event.key === 'ArrowLeft'
          || event.key === 'Escape'
          || event.key === 'h'
          || event.key === 'H'
        ) {
          event.preventDefault();
          runAfterWelcome(() => {
            if (event.key === 'Enter') startListening();
            else if (event.code === 'Space') togglePlayback();
            else if (event.key === 'ArrowRight') seekAudio(10);
            else if (event.key === 'ArrowLeft') seekAudio(-10);
            else if (event.key === 'Escape' && mode === 'announcements') openLibraryMode();
            else if (event.key === 'h' || event.key === 'H') {
              speakMenu(COMMAND_HELP_TEXT, { promptId: MENU_PROMPTS.commandHelp });
            }
          });
        }
        return;
      }

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

  const showStandardBlindMode = false;
  const simplePage = (() => {
    const simplePageClassName = [
      'blind-page',
      'blind-page-simple',
      isListening ? 'listening' : '',
      isWelcomeActive ? 'welcoming' : '',
    ].filter(Boolean).join(' ');

    return (
      <main
        className={simplePageClassName}
      >
        <button
          type="button"
          className="blind-simple-touch-surface"
          onClick={handlePrimaryTouch}
          autoFocus
          aria-label={isListening ? 'Dinleniyor. Komutunuzu söyleyin.' : 'Duyum sesli komut alanı. Başlatmak veya komut vermek için dokunun.'}
        >
          <span className="blind-simple-wave wave-one" aria-hidden="true" />
          <span className="blind-simple-wave wave-two" aria-hidden="true" />
          <span className="blind-simple-wave wave-three" aria-hidden="true" />
          <span
            className={isListening ? 'blind-simple-mic-button listening' : 'blind-simple-mic-button'}
            aria-hidden="true"
          >
            <span className="blind-audio-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </span>
        </button>
        <p className="blind-simple-status" aria-live="polite">
          {isListening ? 'Dinleniyor. Komutunuzu söyleyin.' : status}
        </p>
      </main>
    );
  })();

  if (!showStandardBlindMode) return simplePage;

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
          onClick={handlePrimaryTouch}
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
            placeholder={mode === 'announcements' ? 'Örnek: Bilgisayar duyuruları, birinciyi aç, detay oku' : 'Örnek: dinle, sonraki, duyurular, Nutuk'}
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
        <span>Tekrar et</span>
        <span>Kaldığım yeri işaretle</span>
        <span>Kaldığım yerden devam et</span>
        <span>Duyurular</span>
        <span>Bilgisayar duyuruları</span>
        <span>Birinciyi aç</span>
        <span>Özet oku</span>
        <span>Detay oku</span>
        <span>Sonraki duyuru</span>
        <span>Geri dön</span>
        <span>Yardım</span>
        {lastCommand && <em>Son komut: {lastCommand}</em>}
      </section>

      {mode === 'library' && (
        <>
          {selectedBook ? (
            <section className="blind-now-playing" aria-label="Seçili içerik">
              <span>Seçili içerik</span>
              <h2>{selectedBook.title}</h2>
              <p>{selectedBook.chapterTitle || (getPlaybackMode(selectedBook) === 'tts_text' ? 'PDF metni' : 'Tam Metin')}</p>
              <p>{selectedBook.author || 'Bilinmeyen yazar'} - {getBookDuration(selectedBook)}</p>
              <p>Okuma dili: {getReadableLanguage(selectedBook.language)}</p>
              <p>{hasNaturalAudio(selectedBook) ? 'PDF doğal ses dosyasıyla okunacak' : (getPlaybackMode(selectedBook) === 'tts_text' ? 'PDF metni Web Speech API ile okunacak' : 'Ses dosyası modu')}</p>
              {getPlaybackMode(selectedBook) === 'tts_text' && (
                <p>
                  Geçerli sayfa: {textChunks[currentChunkIndex]?.pageStart || 'hazır değil'}
                  {bookmark ? ` - İşaretli yer: sayfa ${bookmark.pageStart}` : ''}
                </p>
              )}
            </section>
          ) : (
            <section className="blind-now-playing" aria-label="Kitaplık durumu">
              <span>Kitaplık</span>
              <h2>Yayınlanmış içerik yok</h2>
              <p>Yüklenen ses dosyaları ve PDF kitaplar admin onayından sonra burada görünür.</p>
            </section>
          )}

          <section className="blind-library-header" aria-label="Kütüphane kaynağı">
            <span>{librarySource}</span>
          </section>

          <section className="blind-library" aria-label="Kütüphane">
            {visibleBooks.map((book) => (
              <button
                type="button"
                className={selectedBook && book.id === selectedBook.id ? 'blind-book active' : 'blind-book'}
                key={book.id}
                onClick={() => selectBook(book)}
                onFocus={() => giveFeedback('focus')}
              >
                <strong>{book.title}</strong>
                <span>{book.category || 'Kategori yok'} - {hasNaturalAudio(book) ? 'PDF/Doğal Ses' : (book.readingMode === 'tts_text' ? 'PDF/TTS' : (book.chapterTitle || 'Ses'))}</span>
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
            <p>
              {selectedAnnouncement
                ? getAnnouncementContent(selectedAnnouncement, { readFullDetail: true })
                  || 'Bu duyuru için okunabilir detay metni alınamadı. Kaynak bağlantısı ekranda mevcut.'
                : 'Örnek: Bilgisayar duyuruları, Matematik duyuruları.'}
            </p>
            {selectedAnnouncement?.detailUrl && (
              <p>Kaynak: {selectedAnnouncement.detailUrl}</p>
            )}
            {selectedAnnouncement && (
              <p>Komutlar: Detay oku, özet oku, sonraki duyuru, önceki duyuru, geri dön.</p>
            )}
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
