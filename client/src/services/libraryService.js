import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { buildKeywords, normalizeText } from './textUtils';

export async function createAudioBook({ form, audioUpload, currentUser, userProfile }) {
  const chapterTitle = form.chapterTitle?.trim() || form.title?.trim() || 'Tek Kayıt';
  const durationSec = Number(audioUpload.durationSec || 0);

  const bookRef = await addDoc(collection(db, 'books'), {
    title: form.title,
    titleLower: normalizeText(form.title),
    author: form.author,
    authorLower: normalizeText(form.author),
    category: form.category,
    type: 'book',
    sourceType: 'audio_upload',
    readingMode: 'audio_file',
    language: getLanguageCode(form.language),
    description: form.notes,
    sourceNote: form.sourceNote || '',
    permissionNote: form.permissionNote || '',
    keywords: buildKeywords([form.title, form.author, form.category, chapterTitle]),
    status: 'pending',
    visibility: 'public',
    chapterCount: 1,
    totalDurationSec: durationSec,
    createdBy: currentUser.uid,
    uploaderName: userProfile?.name || currentUser.displayName || 'Gönüllü',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'chapters'), {
    bookId: bookRef.id,
    order: 1,
    chapterTitle,
    chapterTitleLower: normalizeText(chapterTitle),
    status: 'pending',
    durationSec,
    readingMode: 'audio_file',
    audio: {
      provider: 'firebase_storage',
      url: audioUpload.url,
      publicId: audioUpload.path,
      format: audioUpload.contentType || 'audio',
      bytes: audioUpload.bytes || 0,
      durationSec,
      bitrateKbps: 0,
      fileName: audioUpload.fileName || '',
    },
    recordedBy: currentUser.uid,
    recordedByName: userProfile?.name || currentUser.displayName || 'Gönüllü',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return bookRef.id;
}

export async function addAudioChapterToBook({
  book,
  form,
  audioUpload,
  currentUser,
  userProfile,
}) {
  if (!book?.id) {
    throw new Error('Bölüm eklenecek kitap bulunamadı.');
  }

  if (book.sourceType !== 'audio_upload' || book.readingMode !== 'audio_file') {
    throw new Error('Yeni ses bölümü sadece sesli kitaplara eklenebilir.');
  }

  const chaptersSnapshot = await getDocs(
    query(collection(db, 'chapters'), where('bookId', '==', book.id)),
  );
  const chapters = chaptersSnapshot.docs.map((chapterDoc) => chapterDoc.data());
  const nextOrder = chapters.reduce((maxOrder, chapter) => Math.max(maxOrder, chapter.order || 0), 0) + 1;
  const chapterTitle = form.chapterTitle?.trim() || `Bölüm ${nextOrder}`;
  const durationSec = Number(audioUpload.durationSec || 0);
  const batch = writeBatch(db);

  batch.update(doc(db, 'books', book.id), {
    status: 'pending',
    reviewNote: '',
    reviewedBy: '',
    reviewedAt: null,
    chapterCount: increment(1),
    totalDurationSec: increment(durationSec),
    updatedAt: serverTimestamp(),
    resubmittedAt: serverTimestamp(),
    createdBy: currentUser.uid,
  });

  batch.set(doc(collection(db, 'chapters')), {
    bookId: book.id,
    order: nextOrder,
    chapterTitle,
    chapterTitleLower: normalizeText(chapterTitle),
    status: 'pending',
    durationSec,
    readingMode: 'audio_file',
    audio: {
      provider: 'firebase_storage',
      url: audioUpload.url,
      publicId: audioUpload.path,
      format: audioUpload.contentType || 'audio',
      bytes: audioUpload.bytes || 0,
      durationSec,
      bitrateKbps: 0,
      fileName: audioUpload.fileName || '',
    },
    recordedBy: currentUser.uid,
    recordedByName: userProfile?.name || currentUser.displayName || 'Gönüllü',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
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
    language: getLanguageCode(form.language),
    description: form.notes,
    sourceNote: form.sourceNote || '',
    permissionNote: form.permissionNote || '',
    keywords: buildKeywords([form.title, form.author, form.category, pdfInfo.fileName]),
    status: publishImmediately ? 'published' : 'pending',
    visibility: 'public',
    naturalAudio: {
      status: 'not_requested',
      provider: '',
      voiceId: '',
      chapterCount: 0,
      generatedAt: null,
      requestedAt: null,
      requestedBy: '',
      error: '',
    },
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
    uploaderName: userProfile?.name || currentUser.displayName || 'Gönüllü',
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
    recordedByName: userProfile?.name || currentUser.displayName || 'Gönüllü',
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
      language: getLanguageCode(form.language),
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

export async function getPendingReviewBooks() {
  const booksQuery = query(
    collection(db, 'books'),
    where('status', '==', 'pending'),
    limit(30),
  );
  const snapshot = await getDocs(booksQuery);

  return snapshot.docs
    .map((bookDoc) => ({
      id: bookDoc.id,
      ...bookDoc.data(),
    }))
    .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
}

export async function getAllBooksForAdmin() {
  const booksQuery = query(
    collection(db, 'books'),
    limit(100),
  );
  const snapshot = await getDocs(booksQuery);

  return snapshot.docs
    .map((bookDoc) => ({
      id: bookDoc.id,
      ...bookDoc.data(),
    }))
    .sort((a, b) => getMillis(b.createdAt || b.publishedAt) - getMillis(a.createdAt || a.publishedAt));
}

export async function getPublishedPdfBooksForNaturalAudio() {
  const booksQuery = query(
    collection(db, 'books'),
    where('status', '==', 'published'),
    limit(50),
  );
  const snapshot = await getDocs(booksQuery);

  return snapshot.docs
    .map((bookDoc) => ({
      id: bookDoc.id,
      ...bookDoc.data(),
    }))
    .filter(book => book.sourceType === 'pdf')
    .sort((a, b) => getMillis(b.publishedAt) - getMillis(a.publishedAt));
}

export async function getBooksByOwner(ownerId) {
  const booksQuery = query(
    collection(db, 'books'),
    where('createdBy', '==', ownerId),
    limit(50),
  );
  const snapshot = await getDocs(booksQuery);

  return snapshot.docs
    .map((bookDoc) => ({
      id: bookDoc.id,
      ...bookDoc.data(),
    }))
    .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
}

export async function getBookReviewPreview(bookId) {
  const chaptersQuery = query(
    collection(db, 'chapters'),
    where('bookId', '==', bookId),
    limit(10),
  );
  const chunksQuery = query(
    collection(db, 'book_text_chunks'),
    where('bookId', '==', bookId),
    limit(3),
  );

  const [chaptersSnapshot, chunksSnapshot] = await Promise.all([
    getDocs(chaptersQuery),
    getDocs(chunksQuery),
  ]);

  return {
    chapters: chaptersSnapshot.docs
      .map((chapterDoc) => ({ id: chapterDoc.id, ...chapterDoc.data() }))
      .sort((a, b) => a.order - b.order),
    chunks: chunksSnapshot.docs
      .map((chunkDoc) => ({ id: chunkDoc.id, ...chunkDoc.data() }))
      .sort((a, b) => a.order - b.order),
  };
}

export async function updateBookReviewStatus({
  bookId,
  status,
  reviewNote,
  reviewerId,
  requestNaturalAudio = false,
  naturalAudioProvider = 'local_worker',
}) {
  const nextStatus = status === 'approved' ? 'published' : status;
  const batch = writeBatch(db);
  const bookRef = doc(db, 'books', bookId);
  const chaptersQuery = query(collection(db, 'chapters'), where('bookId', '==', bookId));
  const chaptersSnapshot = await getDocs(chaptersQuery);
  const reviewPayload = {
    status: nextStatus,
    reviewNote: reviewNote || '',
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const bookPayload = {
    ...reviewPayload,
    publishedAt: nextStatus === 'published' ? serverTimestamp() : null,
  };

  if (nextStatus === 'published' && requestNaturalAudio) {
    bookPayload.naturalAudio = {
      status: 'queued',
      provider: naturalAudioProvider,
      voiceId: '',
      chapterCount: 0,
      generatedAt: null,
      requestedAt: serverTimestamp(),
      requestedBy: reviewerId,
      error: '',
    };
  }

  batch.update(bookRef, bookPayload);

  chaptersSnapshot.docs.forEach((chapterDoc) => {
    batch.update(doc(db, 'chapters', chapterDoc.id), {
      status: nextStatus,
      reviewNote: reviewNote || '',
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: nextStatus === 'published' ? serverTimestamp() : null,
    });
  });

  await batch.commit();
}

export async function requestNaturalAudioGeneration({
  bookId,
  requesterId,
  provider = 'local_worker',
  voiceId = '',
}) {
  if (!bookId) {
    throw new Error('Doğal ses üretimine alınacak kitap bulunamadı.');
  }

  await updateDoc(doc(db, 'books', bookId), {
    naturalAudio: {
      status: 'queued',
      provider,
      voiceId,
      chapterCount: 0,
      generatedAt: null,
      requestedAt: serverTimestamp(),
      requestedBy: requesterId || '',
      error: '',
    },
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBookCascade(bookId) {
  if (!bookId) {
    throw new Error('Silinecek kitap bulunamadı.');
  }

  const [
    chaptersSnapshot,
    chunksSnapshot,
    progressSnapshot,
    favoritesSnapshot,
  ] = await Promise.all([
    getDocs(query(collection(db, 'chapters'), where('bookId', '==', bookId))),
    getDocs(query(collection(db, 'book_text_chunks'), where('bookId', '==', bookId))),
    getDocs(query(collection(db, 'playback_progress'), where('bookId', '==', bookId))),
    getDocs(query(collection(db, 'favorites'), where('bookId', '==', bookId))),
  ]);

  const docsToDelete = [
    ...chaptersSnapshot.docs,
    ...chunksSnapshot.docs,
    ...progressSnapshot.docs,
    ...favoritesSnapshot.docs,
  ];
  const storagePaths = [
    ...chaptersSnapshot.docs
      .map(snapshotDoc => snapshotDoc.data()?.audio?.publicId)
      .filter(Boolean),
  ];

  for (let index = 0; index < docsToDelete.length; index += 450) {
    const batch = writeBatch(db);
    docsToDelete.slice(index, index + 450).forEach((snapshotDoc) => {
      batch.delete(snapshotDoc.ref);
    });
    await batch.commit();
  }

  await deleteDoc(doc(db, 'books', bookId));

  await Promise.allSettled(
    [...new Set(storagePaths)]
      .filter(path => !String(path).startsWith('http'))
      .map(path => deleteObject(storageRef(storage, path))),
  );
}

export async function updateVolunteerBookMetadata({ bookId, ownerId, form }) {
  const bookRef = doc(db, 'books', bookId);
  const status = form.resubmit ? 'pending' : form.status;
  const batch = writeBatch(db);
  const chaptersSnapshot = form.resubmit
    ? await getDocs(query(collection(db, 'chapters'), where('bookId', '==', bookId)))
    : null;
  const payload = {
    title: form.title,
    titleLower: normalizeText(form.title),
    author: form.author || '',
    authorLower: normalizeText(form.author || ''),
    category: form.category,
    language: getLanguageCode(form.language),
    description: form.notes || '',
    sourceNote: form.sourceNote || '',
    permissionNote: form.permissionNote || '',
    keywords: buildKeywords([form.title, form.author, form.category, form.sourceNote]),
    updatedAt: serverTimestamp(),
    volunteerUpdatedAt: serverTimestamp(),
  };

  if (status) {
    payload.status = status;
  }

  if (form.resubmit) {
    payload.resubmittedAt = serverTimestamp();
    payload.reviewNote = '';
    payload.reviewedBy = '';
    payload.reviewedAt = null;
  }

  batch.update(bookRef, {
    ...payload,
    createdBy: ownerId,
  });

  if (chaptersSnapshot) {
    chaptersSnapshot.docs.forEach((chapterDoc) => {
      batch.update(doc(db, 'chapters', chapterDoc.id), {
        status: 'pending',
        reviewNote: '',
        updatedAt: serverTimestamp(),
      });
    });
  }

  await batch.commit();
}

export async function replaceBookAudioForReview({ bookId, ownerId, audioUpload }) {
  const bookRef = doc(db, 'books', bookId);
  const chaptersSnapshot = await getDocs(
    query(collection(db, 'chapters'), where('bookId', '==', bookId)),
  );

  if (chaptersSnapshot.empty) {
    throw new Error('Bu kitap için güncellenecek ses bölümü bulunamadı.');
  }

  const targetChapterDoc = chaptersSnapshot.docs
    .map((chapterDoc) => ({ ref: chapterDoc.ref, data: chapterDoc.data() }))
    .sort((a, b) => (a.data.order || 0) - (b.data.order || 0))[0];
  const currentAudio = targetChapterDoc.data.audio || {};
  const previousDurationSec = Number(targetChapterDoc.data.durationSec || currentAudio.durationSec || 0);
  const nextDurationSec = Number(audioUpload.durationSec || 0);
  const batch = writeBatch(db);
  batch.update(bookRef, {
    status: 'pending',
    reviewNote: '',
    reviewedBy: '',
    reviewedAt: null,
    resubmittedAt: serverTimestamp(),
    totalDurationSec: increment(nextDurationSec - previousDurationSec),
    updatedAt: serverTimestamp(),
    createdBy: ownerId,
  });

  batch.update(targetChapterDoc.ref, {
    status: 'pending',
    reviewNote: '',
    reviewedBy: '',
    reviewedAt: null,
    audio: {
      ...currentAudio,
      provider: 'firebase_storage',
      url: audioUpload.url,
      publicId: audioUpload.path,
      format: audioUpload.contentType || currentAudio.format || 'audio',
      bytes: audioUpload.bytes || currentAudio.bytes || 0,
      durationSec: nextDurationSec,
      fileName: audioUpload.fileName || currentAudio.fileName || '',
    },
    durationSec: nextDurationSec,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function upsertPublicAppConfig() {
  await setDoc(
    doc(db, 'app_config', 'public'),
    {
      blindMode: {
        welcomeMessage: 'Duyum dinleme moduna hoş geldiniz.',
        defaultSpeechRate: 0.9,
        maxBooksPerPage: 20,
        voiceCommandsEnabled: true,
      },
      uploadLimits: {
        maxAudioBytes: 26_214_400,
        maxPdfBytes: 20_971_520,
        allowedFormats: ['mp3', 'm4a', 'aac', 'webm', 'ogg', 'wav'],
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

function getLanguageCode(language) {
  if (language === 'İngilizce' || language === 'Ingilizce' || language === 'en-US') return 'en-US';
  return 'tr-TR';
}

