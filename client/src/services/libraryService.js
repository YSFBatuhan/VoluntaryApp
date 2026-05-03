import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { buildKeywords, normalizeText } from './textUtils';

export async function createAudioBook({ form, audioUrl, currentUser, userProfile }) {
  const bookRef = await addDoc(collection(db, 'books'), {
    title: form.title,
    titleLower: normalizeText(form.title),
    author: form.author,
    authorLower: normalizeText(form.author),
    category: form.category,
    type: 'book',
    sourceType: 'audio_upload',
    readingMode: 'audio_file',
    language: form.language === 'İngilizce' ? 'en-US' : 'tr-TR',
    description: form.notes,
    keywords: buildKeywords([form.title, form.author, form.category, form.chapterTitle]),
    status: 'pending',
    visibility: 'public',
    chapterCount: 1,
    totalDurationSec: 0,
    createdBy: currentUser.uid,
    uploaderName: userProfile?.name || currentUser.displayName || 'Gonullu',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'chapters'), {
    bookId: bookRef.id,
    order: 1,
    chapterTitle: form.chapterTitle,
    chapterTitleLower: normalizeText(form.chapterTitle),
    status: 'pending',
    durationSec: 0,
    readingMode: 'audio_file',
    audio: {
      provider: 'cloudinary',
      url: audioUrl,
      publicId: '',
      format: 'audio',
      bytes: 0,
      bitrateKbps: 0,
    },
    recordedBy: currentUser.uid,
    recordedByName: userProfile?.name || currentUser.displayName || 'Gonullu',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return bookRef.id;
}

export async function createPdfBook({ form, pdfInfo, currentUser, userProfile, publishImmediately }) {
  const bookRef = await addDoc(collection(db, 'books'), {
    title: form.title,
    titleLower: normalizeText(form.title),
    author: form.author,
    authorLower: normalizeText(form.author),
    category: form.category,
    type: 'book',
    sourceType: 'pdf',
    readingMode: 'tts_text',
    language: form.language === 'İngilizce' ? 'en-US' : 'tr-TR',
    description: form.notes,
    keywords: buildKeywords([form.title, form.author, form.category, pdfInfo.fileName]),
    status: publishImmediately ? 'published' : 'pending',
    visibility: 'public',
    chapterCount: 1,
    textChunkCount: pdfInfo.chunks.length,
    totalDurationSec: Math.round((pdfInfo.wordCount / 150) * 60),
    estimatedReadingMinutes: Math.ceil(pdfInfo.wordCount / 150),
    sourceFile: {
      provider: 'local_extracted',
      url: '',
      publicId: '',
      format: 'pdf',
      bytes: pdfInfo.bytes,
      pageCount: pdfInfo.pageCount,
      fileName: pdfInfo.fileName,
    },
    createdBy: currentUser.uid,
    uploaderName: userProfile?.name || currentUser.displayName || 'Gonullu',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: publishImmediately ? serverTimestamp() : null,
  });

  const chapterRef = await addDoc(collection(db, 'chapters'), {
    bookId: bookRef.id,
    order: 1,
    chapterTitle: form.chapterTitle || 'Tam Metin',
    chapterTitleLower: normalizeText(form.chapterTitle || 'Tam Metin'),
    status: publishImmediately ? 'published' : 'pending',
    durationSec: Math.round((pdfInfo.wordCount / 150) * 60),
    readingMode: 'tts_text',
    textChunkStart: 1,
    textChunkEnd: pdfInfo.chunks.length,
    recordedBy: currentUser.uid,
    recordedByName: userProfile?.name || currentUser.displayName || 'Gonullu',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: publishImmediately ? serverTimestamp() : null,
  });

  const batch = writeBatch(db);
  pdfInfo.chunks.forEach((chunk) => {
    const chunkId = `${bookRef.id}_${String(chunk.order).padStart(4, '0')}`;
    batch.set(doc(db, 'book_text_chunks', chunkId), {
      bookId: bookRef.id,
      chapterId: chapterRef.id,
      order: chunk.order,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      text: chunk.text,
      charCount: chunk.charCount,
      wordCount: chunk.wordCount,
      language: form.language === 'İngilizce' ? 'en-US' : 'tr-TR',
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return bookRef.id;
}

export async function getPublishedBooks() {
  const booksQuery = query(
    collection(db, 'books'),
    where('status', '==', 'published'),
    limit(20),
  );
  const snapshot = await getDocs(booksQuery);

  return snapshot.docs
    .map((bookDoc) => ({
      id: bookDoc.id,
      ...bookDoc.data(),
    }))
    .sort((a, b) => getMillis(b.publishedAt) - getMillis(a.publishedAt));
}

export async function getBookTextChunks(bookId, chunkLimit = 5) {
  const chunksQuery = query(
    collection(db, 'book_text_chunks'),
    where('bookId', '==', bookId),
    limit(Math.max(chunkLimit, 20)),
  );
  const snapshot = await getDocs(chunksQuery);

  return snapshot.docs
    .map((chunkDoc) => ({
      id: chunkDoc.id,
      ...chunkDoc.data(),
    }))
    .sort((a, b) => a.order - b.order)
    .slice(0, chunkLimit);
}

export async function getPublishedChapters(bookId) {
  const chaptersQuery = query(
    collection(db, 'chapters'),
    where('bookId', '==', bookId),
    where('status', '==', 'published'),
  );
  const snapshot = await getDocs(chaptersQuery);

  return snapshot.docs
    .map((chapterDoc) => ({
      id: chapterDoc.id,
      ...chapterDoc.data(),
    }))
    .sort((a, b) => a.order - b.order);
}

export async function upsertPublicAppConfig() {
  await setDoc(
    doc(db, 'app_config', 'public'),
    {
      blindMode: {
        welcomeMessage: 'GTU EchoVoices dinleme moduna hos geldiniz.',
        defaultSpeechRate: 0.9,
        maxBooksPerPage: 20,
        voiceCommandsEnabled: true,
      },
      uploadLimits: {
        maxAudioBytes: 52_428_800,
        maxPdfBytes: 20_971_520,
        allowedFormats: ['mp3', 'wav', 'aac', 'webm'],
        allowedDocumentFormats: ['pdf'],
        recommendedBitrateKbps: 128,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function getMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
