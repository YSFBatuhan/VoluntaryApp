export const MENU_SPEECH_LANGUAGE = 'tr-TR';
export const MENU_SPEECH_PROVIDER = 'elevenlabs';

export function getSpeechLanguage(language) {
  if (language === 'en-US' || language === 'İngilizce' || language === 'Ingilizce') return 'en-US';
  return 'tr-TR';
}

export function createMenuUtterance(text) {
  return createUtterance(text, MENU_SPEECH_LANGUAGE);
}

export function createUtterance(text, language = 'tr-TR') {
  const lang = getSpeechLanguage(language);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang === 'tr-TR' ? 0.9 : 0.95;
  utterance.pitch = 1;

  const voice = findVoiceForLanguage(lang);
  if (voice) {
    utterance.voice = voice;
  }

  return utterance;
}

export function findVoiceForLanguage(language = 'tr-TR') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const lang = getSpeechLanguage(language);
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const exactLocal = voices.find(voice => voice.lang === lang && voice.localService);
  if (exactLocal) return exactLocal;

  const exact = voices.find(voice => voice.lang === lang);
  if (exact) return exact;

  const languagePrefix = lang.split('-')[0];
  return voices.find(voice => voice.lang?.toLowerCase().startsWith(languagePrefix)) || null;
}
