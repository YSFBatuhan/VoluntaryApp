import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';

const functions = getFunctions(app);
const generateCachedSpeechCallable = httpsCallable(functions, 'generateCachedSpeech');

export async function generateCachedDynamicSpeech({
  text,
  language = 'tr-TR',
  model,
  voiceId,
  announcementId = '',
  announcementVariant = 'summary',
  publicPromptId = '',
} = {}) {
  const result = await generateCachedSpeechCallable({
    text,
    language,
    model,
    voiceId,
    announcementId,
    announcementVariant,
    publicPromptId,
  });

  return result.data;
}
