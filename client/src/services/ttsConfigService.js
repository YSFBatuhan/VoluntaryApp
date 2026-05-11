import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const DEFAULT_TTS_CONFIG = {
  mode: 'hybrid',
  elevenLabsEnabled: false,
  monthlyCreditLimit: 30000,
  usedCreditsEstimate: 0,
  maxCharsPerBook: 10000,
  maxCharsPerRequest: 3000,
  maxCharsPerAnnouncement: 2500,
  requireAdminApproval: true,
  cacheRequired: true,
  defaultVoiceId: '',
  defaultModel: 'eleven_flash_v2_5',
  fallbackEngine: 'web_speech',
};

const TTS_CONFIG_REF = doc(db, 'app_config', 'tts');

export async function getTtsConfig() {
  const snapshot = await getDoc(TTS_CONFIG_REF);
  if (!snapshot.exists()) return DEFAULT_TTS_CONFIG;

  return {
    ...DEFAULT_TTS_CONFIG,
    ...snapshot.data(),
  };
}

export async function saveTtsConfig(config, updatedBy) {
  const payload = {
    ...DEFAULT_TTS_CONFIG,
    ...config,
    monthlyCreditLimit: Number(config.monthlyCreditLimit) || DEFAULT_TTS_CONFIG.monthlyCreditLimit,
    usedCreditsEstimate: Number(config.usedCreditsEstimate) || 0,
    maxCharsPerBook: Number(config.maxCharsPerBook) || DEFAULT_TTS_CONFIG.maxCharsPerBook,
    maxCharsPerRequest: Number(config.maxCharsPerRequest) || DEFAULT_TTS_CONFIG.maxCharsPerRequest,
    maxCharsPerAnnouncement: Number(config.maxCharsPerAnnouncement) || DEFAULT_TTS_CONFIG.maxCharsPerAnnouncement,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await setDoc(TTS_CONFIG_REF, payload, { merge: true });
  return payload;
}
