import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase/config';

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_MB = MAX_AUDIO_BYTES / 1024 / 1024;

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
];
const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.webm', '.ogg', '.wav'];

export function isSupportedAudioFile(file) {
  if (!file) return false;
  const lowerName = file.name.toLowerCase();
  return AUDIO_TYPES.includes(file.type) || AUDIO_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

export function validateAudioFile(file) {
  if (!file) {
    throw new Error('Lutfen bir ses dosyasi secin.');
  }

  if (!isSupportedAudioFile(file)) {
    throw new Error('MP3, M4A, AAC, WebM, OGG veya WAV formatinda ses dosyasi secin.');
  }

  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(`Ses dosyasi ${MAX_AUDIO_MB} MB sinirini asiyor. Ucretsiz kota icin daha kisa veya sikistirilmis bir dosya yukleyin.`);
  }
}

export function getAudioDurationSec(file) {
  if (!file || typeof Audio === 'undefined' || typeof URL === 'undefined') {
    return Promise.resolve(0);
  }

  return new Promise((resolve) => {
    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);

    function cleanup(value = 0) {
      URL.revokeObjectURL(objectUrl);
      audio.removeAttribute('src');
      resolve(Number.isFinite(value) ? Math.round(value) : 0);
    }

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => cleanup(audio.duration);
    audio.onerror = () => cleanup(0);
    audio.src = objectUrl;
  });
}

export function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function uploadAudioFile({ file, userId, onProgress }) {
  validateAudioFile(file);

  if (!userId) {
    throw new Error('Ses yuklemek icin giris yapmalisiniz.');
  }

  const safeName = sanitizeFileName(file.name || `audio-${Date.now()}.webm`);
  const durationSec = await getAudioDurationSec(file);
  const path = `audio_uploads/${userId}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, path);
  const metadata = {
    contentType: file.type || inferAudioContentType(safeName),
    customMetadata: {
      uploadedBy: userId,
      originalName: safeName,
    },
  };

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, metadata);

    task.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => reject(toFriendlyStorageError(error)),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          url,
          path,
          bytes: file.size,
          contentType: metadata.contentType,
          fileName: safeName,
          durationSec,
        });
      },
    );
  });
}

function sanitizeFileName(fileName) {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return `${baseName || 'audio'}${extension}`;
}

function inferAudioContentType(fileName) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerName.endsWith('.m4a')) return 'audio/mp4';
  if (lowerName.endsWith('.aac')) return 'audio/aac';
  if (lowerName.endsWith('.ogg')) return 'audio/ogg';
  if (lowerName.endsWith('.wav')) return 'audio/wav';
  return 'audio/webm';
}

function toFriendlyStorageError(error) {
  if (error?.code === 'storage/unauthorized') {
    return new Error('Storage izni reddedildi. Kurallari ve giris durumunu kontrol edin.');
  }

  if (error?.code === 'storage/quota-exceeded') {
    return new Error('Storage kotasi doldu. Yeni yukleme icin kota veya dosya boyutu kontrol edilmeli.');
  }

  if (error?.code === 'storage/retry-limit-exceeded') {
    return new Error('Yukleme ag nedeniyle tamamlanamadi. Baglantiyi kontrol edip tekrar deneyin.');
  }

  return new Error('Ses dosyasi yuklenemedi. Storage ayarlarini ve dosya limitlerini kontrol edin.');
}
