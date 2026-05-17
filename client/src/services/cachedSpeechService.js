import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export const MENU_PROMPTS = {
  welcome: 'blind_welcome',
  commandHelp: 'command_help',
  libraryMode: 'library_mode',
  noBooks: 'no_books',
  speechUnsupported: 'speech_unsupported',
  progressSaveFailed: 'progress_save_failed',
  noBookmark: 'no_bookmark',
  noPageInfo: 'no_page_info',
  noPageToBookmark: 'no_page_to_bookmark',
  textSpeechUnsupported: 'text_speech_unsupported',
  noPdfText: 'no_pdf_text',
  pdfReadError: 'pdf_read_error',
  previewCompleted: 'preview_completed',
  pageNavigationTextOnly: 'page_navigation_text_only',
  pageNumberTextOnly: 'page_number_text_only',
  noTextChunks: 'no_text_chunks',
  announcementsMode: 'announcements_mode',
  noDepartmentAnnouncements: 'no_department_announcements',
  noOptionsAtIndex: 'no_options_at_index',
  commandPrompt: 'command_prompt',
  microphoneListening: 'microphone_listening',
  departmentListReturn: 'department_list_return',
  libraryModeAlready: 'library_mode_already',
  noPublishedAudio: 'no_published_audio',
  audioPlaybackError: 'audio_playback_error',
  audioStartError: 'audio_start_error',
  forwardTen: 'forward_ten',
  backwardTen: 'backward_ten',
  playbackPaused: 'playback_paused',
  audioStopped: 'audio_stopped',
  microphonePermissionDenied: 'microphone_permission_denied',
  speechServiceUnavailable: 'speech_service_unavailable',
  microphoneUnavailable: 'microphone_unavailable',
  speechRecognitionNetworkError: 'speech_recognition_network_error',
  noSpeechDetected: 'no_speech_detected',
  speechCommandAborted: 'speech_command_aborted',
  speechRecognitionLanguageUnavailable: 'speech_recognition_language_unavailable',
};

// ElevenLabs ile uretilen sabit menu sesleri buraya veya Firestore app_config'e baglanacak.
// Bos URL olursa ekranda metin durum mesajı gösterilir.
const CACHED_MENU_AUDIO_URLS = {
  [MENU_PROMPTS.welcome]: '',
  [MENU_PROMPTS.commandHelp]: '',
  [MENU_PROMPTS.libraryMode]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Flibrary_mode.mp3?alt=media&token=e290187b-c7e9-4f57-851b-6b9867b69f75',
  [MENU_PROMPTS.noBooks]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fno_books.mp3?alt=media&token=b86ed592-93c3-43fb-a74a-2d5a759af8a4',
  [MENU_PROMPTS.speechUnsupported]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fspeech_unsupported.mp3?alt=media&token=8f236730-1bee-448b-93c2-dc9eb39efba9',
  [MENU_PROMPTS.progressSaveFailed]: '',
  [MENU_PROMPTS.noBookmark]: '',
  [MENU_PROMPTS.noPageInfo]: '',
  [MENU_PROMPTS.noPageToBookmark]: '',
  [MENU_PROMPTS.textSpeechUnsupported]: '',
  [MENU_PROMPTS.noPdfText]: '',
  [MENU_PROMPTS.pdfReadError]: '',
  [MENU_PROMPTS.previewCompleted]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fpreview_completed.mp3?alt=media&token=cd2c4a5d-a6cf-4de2-b676-6baf7fe9f13d',
  [MENU_PROMPTS.pageNavigationTextOnly]: '',
  [MENU_PROMPTS.pageNumberTextOnly]: '',
  [MENU_PROMPTS.noTextChunks]: '',
  [MENU_PROMPTS.announcementsMode]: '',
  [MENU_PROMPTS.noDepartmentAnnouncements]: '',
  [MENU_PROMPTS.noOptionsAtIndex]: '',
  [MENU_PROMPTS.commandPrompt]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fcommand_prompt.mp3?alt=media&token=b5cc8c71-0fe9-4fb9-b36c-786c658bf0bd',
  [MENU_PROMPTS.microphoneListening]: '',
  [MENU_PROMPTS.departmentListReturn]: '',
  [MENU_PROMPTS.libraryModeAlready]: '',
  [MENU_PROMPTS.noPublishedAudio]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fno_published_audio.mp3?alt=media&token=4b6fc3eb-bbe3-4025-beb2-e90314bbdabc',
  [MENU_PROMPTS.audioPlaybackError]: '',
  [MENU_PROMPTS.audioStartError]: '',
  [MENU_PROMPTS.forwardTen]: '',
  [MENU_PROMPTS.backwardTen]: '',
  [MENU_PROMPTS.playbackPaused]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Fplayback_paused.mp3?alt=media&token=3e1f1a07-2297-47b4-a717-58eef512394e',
  [MENU_PROMPTS.audioStopped]: 'https://firebasestorage.googleapis.com/v0/b/gtu-echovoices.firebasestorage.app/o/tts_cache%2Fmenu%2Faudio_stopped.mp3?alt=media&token=ae77b9f6-ef3c-4047-b738-97496d22ccee',
  [MENU_PROMPTS.microphonePermissionDenied]: '',
  [MENU_PROMPTS.speechServiceUnavailable]: '',
  [MENU_PROMPTS.microphoneUnavailable]: '',
  [MENU_PROMPTS.speechRecognitionNetworkError]: '',
  [MENU_PROMPTS.noSpeechDetected]: '',
  [MENU_PROMPTS.speechCommandAborted]: '',
  [MENU_PROMPTS.speechRecognitionLanguageUnavailable]: '',
};

let runtimeMenuAudioUrls = {};

// Runtime cache: Firestore 'announcements' koleksiyonundan okunan audio URL'leri.
// Batch script veya Cloud Function ile uretilen sesler buraya yazilir,
// statik JS dosyasinda audio alani olmayan duyurular icin runtime'da tamamlanir.
let runtimeAnnouncementAudioCache = {};

export async function loadCachedSpeechConfig() {
  const snapshot = await getDoc(doc(db, 'app_config', 'public'));
  const audioPrompts = snapshot.exists() ? snapshot.data()?.audioPrompts : null;

  runtimeMenuAudioUrls = Object.fromEntries(
    Object.entries(audioPrompts || {}).map(([key, value]) => [key, value?.url || '']),
  );

  return runtimeMenuAudioUrls;
}

/**
 * Firestore 'announcements' koleksiyonundan duyuru audio URL'lerini yukler.
 * Batch script veya Cloud Function tarafindan uretilen sesleri runtime'da client'a getirir.
 */
export async function loadAnnouncementAudioCache() {
  try {
    const snapshot = await getDocs(collection(db, 'announcements'));
    const cache = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data?.audio) {
        cache[docSnap.id] = data.audio;
      }
    });
    runtimeAnnouncementAudioCache = cache;
    return cache;
  } catch {
    // Firestore erisim hatasi sessizce yutulur, varsayilan prompt listesi kullanilir.
    return {};
  }
}

export function getCachedMenuAudioUrl(promptId) {
  if (!promptId) return '';
  return runtimeMenuAudioUrls[promptId] || CACHED_MENU_AUDIO_URLS[promptId] || '';
}

export function getCachedAnnouncementAudioUrl(announcement, { readFullDetail = false } = {}) {
  // Oncelik 1: Statik data'daki audio alani (generatedGtuAnnouncements.js'te varsa)
  const staticAudio = announcement?.audio;
  // Oncelik 2: Runtime Firestore cache (batch script / Cloud Function ile uretilmis)
  const runtimeAudio = announcement?.id ? runtimeAnnouncementAudioCache[announcement.id] : null;

  const audio = staticAudio || runtimeAudio;
  if (!audio) return '';

  if (readFullDetail) {
    return audio.detailUrl || audio.url || '';
  }

  return audio.summaryUrl || audio.url || '';
}

export function getAnnouncementAudioStatus(announcement) {
  const staticAudio = announcement?.audio;
  const runtimeAudio = announcement?.id ? runtimeAnnouncementAudioCache[announcement.id] : null;
  const audio = staticAudio || runtimeAudio || {};
  const summaryUrl = audio.summaryUrl || audio.url || '';
  const detailUrl = audio.detailUrl || audio.url || '';

  return {
    summaryReady: Boolean(summaryUrl),
    detailReady: Boolean(detailUrl),
    summaryUrl,
    detailUrl,
    source: runtimeAudio ? 'firestore' : (staticAudio ? 'static' : 'missing'),
    readyCount: Number(Boolean(summaryUrl)) + Number(Boolean(detailUrl)),
  };
}

export function createCachedSpeechAudio(url) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  return audio;
}
