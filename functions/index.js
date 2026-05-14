const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

admin.initializeApp();

const elevenLabsApiKey = defineSecret('ELEVENLABS_API_KEY');

const DEFAULT_TTS_CONFIG = {
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

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

exports.generateCachedSpeech = onCall(
  {
    secrets: [elevenLabsApiKey],
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    const {
      text,
      language = 'tr-TR',
      promptId = '',
      announcementId = '',
      announcementVariant = 'summary',
      publicPromptId = '',
      model,
      voiceId,
    } = request.data || {};

    const isPublicAnnouncementAudio = Boolean(announcementId);
    const isPublicPromptAudio = Boolean(publicPromptId)
      && /^blind_(department|announcement|menu)_/.test(publicPromptId);

    if (!request.auth?.uid && !isPublicAnnouncementAudio && !isPublicPromptAudio) {
      throw new HttpsError('unauthenticated', 'Giris yapmadan premium ses uretilemez.');
    }

    // Duyuru icerigi ve onayli dinleyici promptlari cache-on-first-listen calisir.
    // Diger menu/genel ses uretimleri admin-only kalir.
    if (!isPublicAnnouncementAudio && !isPublicPromptAudio) {
      await assertAdmin(request.auth.uid);
    }

    const normalizedText = normalizeSpeechText(text);
    if (!normalizedText) {
      throw new HttpsError('invalid-argument', 'Ses uretimi icin metin bos olamaz.');
    }

    const config = await getTtsConfig();
    if (!config.elevenLabsEnabled) {
      throw new HttpsError('failed-precondition', 'ElevenLabs uretimi admin ayarlarinda kapali.');
    }
    const actorId = request.auth?.uid || 'public_listener';

    const targetType = promptId
      ? 'menu_prompt'
      : announcementId
        ? 'announcement'
        : publicPromptId
          ? 'public_prompt'
          : 'generic';
    const maxChars = targetType === 'announcement' || targetType === 'public_prompt'
      ? config.maxCharsPerAnnouncement
      : config.maxCharsPerRequest;

    if (normalizedText.length > maxChars) {
      throw new HttpsError(
        'invalid-argument',
        `Metin ${normalizedText.length} karakter. Bu hedef icin limit ${maxChars} karakter.`,
      );
    }

    const nextModel = model || config.defaultModel || DEFAULT_TTS_CONFIG.defaultModel;
    const nextVoiceId = voiceId || config.defaultVoiceId || DEFAULT_VOICE_ID;
    const textHash = createSpeechHash({
      text: normalizedText,
      language,
      model: nextModel,
      voiceId: nextVoiceId,
    });

    const db = admin.firestore();
    const cacheRef = db.collection('tts_cache').doc(textHash);
    const cachedSnapshot = await cacheRef.get();
    if (cachedSnapshot.exists) {
      const cached = cachedSnapshot.data();
      await attachCachedAudio({
        audioUrl: cached.audio?.url,
        textHash,
        promptId,
        announcementId,
        announcementVariant,
        publicPromptId,
        metadata: cached,
      });
      return {
        cached: true,
        textHash,
        audioUrl: cached.audio?.url,
      };
    }

    const creditEstimate = estimateCredits(normalizedText.length, nextModel);
    const usedCreditsEstimate = Number(config.usedCreditsEstimate || 0);
    const monthlyCreditLimit = Number(config.monthlyCreditLimit || 0);
    if (monthlyCreditLimit > 0 && usedCreditsEstimate + creditEstimate > monthlyCreditLimit) {
      throw new HttpsError('resource-exhausted', 'Aylik ElevenLabs kredi limiti asilacak.');
    }

    const apiKey = String(elevenLabsApiKey.value() || '').trim();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'ELEVENLABS_API_KEY secret tanimli degil.');
    }

    const audioBuffer = await generateElevenLabsAudio({
      apiKey,
      text: normalizedText,
      model: nextModel,
      voiceId: nextVoiceId,
    });
    const audioPath = `tts_cache/${textHash}.mp3`;
    const downloadToken = crypto.randomUUID();
    const bucket = admin.storage().bucket();
    const file = bucket.file(audioPath);

    await file.save(audioBuffer, {
      resumable: false,
      contentType: 'audio/mpeg',
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          textHash,
          provider: 'elevenlabs',
          model: nextModel,
          language,
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    const audioUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(audioPath)}?alt=media&token=${downloadToken}`;

    const cachePayload = {
      textHash,
      textPreview: normalizedText.slice(0, 160),
      language,
      provider: 'elevenlabs',
      model: nextModel,
      voiceId: nextVoiceId,
      charCount: normalizedText.length,
      creditEstimate,
      targetType,
      publicPromptId,
      audio: {
        provider: 'firebase_storage',
        url: audioUrl,
        publicId: audioPath,
        format: 'audio/mpeg',
        bytes: audioBuffer.length,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: actorId,
    };

    await cacheRef.set(cachePayload);
    await db.collection('app_config').doc('tts').set(
      {
        usedCreditsEstimate: admin.firestore.FieldValue.increment(creditEstimate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: actorId,
      },
      { merge: true },
    );

    await attachCachedAudio({
      audioUrl,
      textHash,
      promptId,
      announcementId,
      announcementVariant,
      publicPromptId,
      metadata: cachePayload,
    });

    return {
      cached: false,
      textHash,
      audioUrl,
      creditEstimate,
      bytes: audioBuffer.length,
    };
  },
);

async function assertAdmin(uid) {
  const userSnapshot = await admin.firestore().collection('users').doc(uid).get();
  if (userSnapshot.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Bu islem icin admin yetkisi gerekir.');
  }
}

async function getTtsConfig() {
  const snapshot = await admin.firestore().collection('app_config').doc('tts').get();
  return {
    ...DEFAULT_TTS_CONFIG,
    ...(snapshot.exists ? snapshot.data() : {}),
  };
}

function normalizeSpeechText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSpeechHash({ text, language, model, voiceId }) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ text, language, model, voiceId }))
    .digest('hex');
}

function estimateCredits(charCount, model) {
  const lowerModel = String(model || '').toLowerCase();
  if (lowerModel.includes('flash') || lowerModel.includes('turbo')) {
    return Math.ceil(charCount / 2);
  }
  return charCount;
}

async function generateElevenLabsAudio({ apiKey, text, model, voiceId }) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const providerMessage = parseElevenLabsError(errorText);
    const message = providerMessage || `ElevenLabs uretimi basarisiz: HTTP ${response.status}`;
    const code = response.status === 401 || response.status === 403
      ? 'failed-precondition'
      : 'internal';

    console.error('ElevenLabs generation failed', {
      status: response.status,
      message,
      raw: errorText.slice(0, 500),
    });

    throw new HttpsError(code, message, {
      provider: 'elevenlabs',
      status: response.status,
      raw: errorText.slice(0, 500),
    });
  }

  return Buffer.from(await response.arrayBuffer());
}

function parseElevenLabsError(errorText) {
  try {
    const parsed = JSON.parse(errorText);
    return parsed?.detail?.message || parsed?.message || '';
  } catch {
    return errorText.slice(0, 240);
  }
}

async function attachCachedAudio({
  audioUrl,
  textHash,
  promptId,
  announcementId,
  announcementVariant,
  publicPromptId,
  metadata,
}) {
  if (!audioUrl) return;

  const db = admin.firestore();
  const audioPayload = {
    provider: 'elevenlabs',
    url: audioUrl,
    textHash,
    model: metadata.model,
    voiceId: metadata.voiceId,
    charCount: metadata.charCount,
    creditEstimate: metadata.creditEstimate,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (promptId) {
    await db.collection('app_config').doc('public').set(
      {
        audioPrompts: {
          [promptId]: audioPayload,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (publicPromptId) {
    await db.collection('app_config').doc('public').set(
      {
        audioPrompts: {
          [publicPromptId]: audioPayload,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (announcementId) {
    const urlField = announcementVariant === 'detail' ? 'detailUrl' : 'summaryUrl';
    await db.collection('announcements').doc(announcementId).set(
      {
        audio: {
          ...audioPayload,
          [urlField]: audioUrl,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}
