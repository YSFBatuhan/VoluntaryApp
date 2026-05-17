import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';
import admin from 'firebase-admin';

const exec = promisify(execCallback);
const CHUNK_LIMIT = Number(process.env.NATURAL_AUDIO_CHUNK_LIMIT || 12);
const OUTPUT_EXT = (process.env.NATURAL_TTS_OUTPUT_EXT || 'mp3').replace(/^\./, '');
const TTS_COMMAND = process.env.NATURAL_TTS_COMMAND || '';
const TTS_PROVIDER = process.env.NATURAL_TTS_PROVIDER || 'local_worker';
const TTS_VOICE_ID = process.env.NATURAL_TTS_VOICE_ID || '';

if (!TTS_COMMAND) {
  throw new Error(
    'NATURAL_TTS_COMMAND tanimli degil. Ornek: NATURAL_TTS_COMMAND="python scripts/xtts-generate.py --text-file {input} --out {output} --lang {language} --speaker-wav C:\\voices\\approved-reader.wav --cpu"',
  );
}

initializeFirebaseAdmin();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const queuedBooks = await getQueuedBooks();
if (!queuedBooks.length) {
  console.log('Dogal ses kuyrugunda kitap yok.');
  process.exit(0);
}

for (const book of queuedBooks) {
  await processBook(book);
}

async function getQueuedBooks() {
  const snapshot = await db
    .collection('books')
    .where('status', '==', 'published')
    .where('sourceType', '==', 'pdf')
    .where('naturalAudio.status', '==', 'queued')
    .limit(3)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function processBook(book) {
  const bookRef = db.collection('books').doc(book.id);
  const workDir = await mkdtemp(join(tmpdir(), `duyum-natural-audio-${book.id}-`));

  console.log(`Basliyor: ${book.title || book.id}`);
  await bookRef.update({
    naturalAudio: {
      ...(book.naturalAudio || {}),
      status: 'processing',
      provider: TTS_PROVIDER,
      voiceId: TTS_VOICE_ID,
      error: '',
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    const chunks = await getBookChunks(book.id);
    if (!chunks.length) {
      throw new Error('Bu PDF kitap icin book_text_chunks bulunamadi.');
    }

    const selectedChunks = chunks.slice(0, CHUNK_LIMIT);
    let generatedCount = 0;
    const batch = db.batch();

    for (const chunk of selectedChunks) {
      const outputPath = await generateChunkAudio({ book, chunk, workDir });
      const destination = `natural_audio/${book.id}/${String(chunk.order).padStart(4, '0')}.${OUTPUT_EXT}`;
      const [file] = await bucket.upload(outputPath, {
        destination,
        metadata: {
          contentType: getContentType(OUTPUT_EXT),
          metadata: {
            bookId: book.id,
            chunkOrder: String(chunk.order),
            provider: TTS_PROVIDER,
            voiceId: TTS_VOICE_ID,
          },
        },
      });
      await file.makePublic().catch(() => {});

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });
      const chapterRef = db
        .collection('chapters')
        .doc(`natural_${book.id}_${String(chunk.order).padStart(4, '0')}`);

      batch.set(chapterRef, {
        bookId: book.id,
        order: chunk.order,
        chapterTitle: `Sayfa ${chunk.pageStart || chunk.order}`,
        chapterTitleLower: `sayfa ${chunk.pageStart || chunk.order}`,
        status: 'published',
        durationSec: 0,
        readingMode: 'audio_file',
        textChunkStart: chunk.order,
        textChunkEnd: chunk.order,
        audio: {
          provider: TTS_PROVIDER,
          url: signedUrl,
          publicId: destination,
          format: OUTPUT_EXT,
          bytes: Number((await file.getMetadata())[0]?.size || 0),
          durationSec: 0,
          bitrateKbps: 0,
          fileName: `${String(chunk.order).padStart(4, '0')}.${OUTPUT_EXT}`,
        },
        recordedBy: 'natural_audio_worker',
        recordedByName: 'Doğal Ses Worker',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      generatedCount += 1;
      console.log(`  ${generatedCount}/${selectedChunks.length} parca yuklendi.`);
    }

    batch.update(bookRef, {
      naturalAudio: {
        ...(book.naturalAudio || {}),
        status: 'ready',
        provider: TTS_PROVIDER,
        voiceId: TTS_VOICE_ID,
        chapterCount: generatedCount,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: '',
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    console.log(`Tamamlandi: ${book.title || book.id}`);
  } catch (error) {
    await bookRef.update({
      naturalAudio: {
        ...(book.naturalAudio || {}),
        status: 'failed',
        provider: TTS_PROVIDER,
        voiceId: TTS_VOICE_ID,
        error: error.message || String(error),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.error(`Hata: ${book.title || book.id}:`, error.message || error);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function getBookChunks(bookId) {
  const snapshot = await db
    .collection('book_text_chunks')
    .where('bookId', '==', bookId)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function generateChunkAudio({ book, chunk, workDir }) {
  const inputPath = join(workDir, `${String(chunk.order).padStart(4, '0')}.txt`);
  const outputPath = join(workDir, `${String(chunk.order).padStart(4, '0')}.${OUTPUT_EXT}`);
  await writeFile(inputPath, normalizeTtsText(chunk.text || ''), 'utf8');

  const command = TTS_COMMAND
    .replaceAll('{input}', quotePath(inputPath))
    .replaceAll('{output}', quotePath(outputPath))
    .replaceAll('{language}', book.language === 'en-US' ? 'en' : 'tr')
    .replaceAll('{voice}', TTS_VOICE_ID);

  await exec(command, { maxBuffer: 1024 * 1024 * 8 });
  const generated = await readFile(outputPath);
  if (!generated.length) {
    throw new Error(`TTS komutu bos ses dosyasi uretti: chunk ${chunk.order}`);
  }

  return outputPath;
}

function normalizeTtsText(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function getContentType(ext) {
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'm4a') return 'audio/mp4';
  return 'audio/mpeg';
}

function quotePath(path) {
  return `"${String(path).replaceAll('"', '\\"')}"`;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length) return;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET tanimli degil.');
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    storageBucket,
  });
}
