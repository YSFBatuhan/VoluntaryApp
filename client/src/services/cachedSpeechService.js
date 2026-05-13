import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const MENU_PROMPTS = {
  welcome: 'welcome',
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
// Bos URL olursa Blind Mode otomatik olarak Web Speech fallback kullanir.
const CACHED_MENU_AUDIO_URLS = {
  [MENU_PROMPTS.welcome]: '',
  [MENU_PROMPTS.commandHelp]: '',
  [MENU_PROMPTS.libraryMode]: '',
  [MENU_PROMPTS.noBooks]: '',
  [MENU_PROMPTS.speechUnsupported]: '',
  [MENU_PROMPTS.progressSaveFailed]: '',
  [MENU_PROMPTS.noBookmark]: '',
  [MENU_PROMPTS.noPageInfo]: '',
  [MENU_PROMPTS.noPageToBookmark]: '',
  [MENU_PROMPTS.textSpeechUnsupported]: '',
  [MENU_PROMPTS.noPdfText]: '',
  [MENU_PROMPTS.pdfReadError]: '',
  [MENU_PROMPTS.previewCompleted]: '',
  [MENU_PROMPTS.pageNavigationTextOnly]: '',
  [MENU_PROMPTS.pageNumberTextOnly]: '',
  [MENU_PROMPTS.noTextChunks]: '',
  [MENU_PROMPTS.announcementsMode]: '',
  [MENU_PROMPTS.noDepartmentAnnouncements]: '',
  [MENU_PROMPTS.noOptionsAtIndex]: '',
  [MENU_PROMPTS.commandPrompt]: '',
  [MENU_PROMPTS.departmentListReturn]: '',
  [MENU_PROMPTS.libraryModeAlready]: '',
  [MENU_PROMPTS.noPublishedAudio]: '',
  [MENU_PROMPTS.audioPlaybackError]: '',
  [MENU_PROMPTS.audioStartError]: '',
  [MENU_PROMPTS.forwardTen]: '',
  [MENU_PROMPTS.backwardTen]: '',
  [MENU_PROMPTS.playbackPaused]: '',
  [MENU_PROMPTS.audioStopped]: '',
  [MENU_PROMPTS.microphonePermissionDenied]: '',
  [MENU_PROMPTS.speechServiceUnavailable]: '',
  [MENU_PROMPTS.microphoneUnavailable]: '',
  [MENU_PROMPTS.speechRecognitionNetworkError]: '',
  [MENU_PROMPTS.noSpeechDetected]: '',
  [MENU_PROMPTS.speechCommandAborted]: '',
  [MENU_PROMPTS.speechRecognitionLanguageUnavailable]: '',
};

let runtimeMenuAudioUrls = {};

export async function loadCachedSpeechConfig() {
  const snapshot = await getDoc(doc(db, 'app_config', 'public'));
  const audioPrompts = snapshot.exists() ? snapshot.data()?.audioPrompts : null;

  runtimeMenuAudioUrls = Object.fromEntries(
    Object.entries(audioPrompts || {}).map(([key, value]) => [key, value?.url || '']),
  );

  return runtimeMenuAudioUrls;
}

export function getCachedMenuAudioUrl(promptId) {
  if (!promptId) return '';
  return runtimeMenuAudioUrls[promptId] || CACHED_MENU_AUDIO_URLS[promptId] || '';
}

export function getCachedAnnouncementAudioUrl(announcement, { readFullDetail = false } = {}) {
  if (!announcement?.audio) return '';

  if (readFullDetail) {
    return announcement.audio.detailUrl || announcement.audio.url || '';
  }

  return announcement.audio.summaryUrl || announcement.audio.url || '';
}

export function createCachedSpeechAudio(url) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  return audio;
}
