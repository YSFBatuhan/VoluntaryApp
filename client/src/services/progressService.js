import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function getProgressId(userId, bookId) {
  return `${userId}_${bookId}`;
}

export async function getReadingProgress({ userId, bookId }) {
  if (!userId || !bookId) return null;

  const progressRef = doc(db, 'playback_progress', getProgressId(userId, bookId));
  const snapshot = await getDoc(progressRef);
  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function saveReadingProgress({
  userId,
  book,
  chapterId = '',
  chunkIndex = 0,
  pageStart = null,
  positionSec = 0,
  completed = false,
}) {
  if (!userId || !book?.id) return null;

  const payload = {
    uid: userId,
    bookId: book.id,
    chapterId,
    title: book.title || '',
    author: book.author || '',
    readingMode: book.readingMode || '',
    chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex : 0,
    pageStart: pageStart || null,
    positionSec: Math.max(0, Math.floor(positionSec || 0)),
    completed,
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    doc(db, 'playback_progress', getProgressId(userId, book.id)),
    payload,
    { merge: true },
  );

  return payload;
}
