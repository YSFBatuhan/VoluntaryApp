import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PUBLIC_CONFIG_REF = doc(db, 'app_config', 'public');

export async function getAudioPromptConfig() {
  const snapshot = await getDoc(PUBLIC_CONFIG_REF);
  return snapshot.exists() ? snapshot.data()?.audioPrompts || {} : {};
}

export async function saveAudioPromptConfig(audioPrompts) {
  const cleanedPrompts = Object.fromEntries(
    Object.entries(audioPrompts || {}).map(([key, value]) => [
      key,
      {
        provider: value.provider || 'manual_elevenlabs',
        url: String(value.url || '').trim(),
        updatedAt: new Date().toISOString(),
      },
    ]),
  );

  await setDoc(
    PUBLIC_CONFIG_REF,
    {
      audioPrompts: cleanedPrompts,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return cleanedPrompts;
}
