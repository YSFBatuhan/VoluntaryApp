import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAudioPromptConfig, saveAudioPromptConfig } from '../services/audioPromptConfigService';
import { generateCachedMenuSpeech, MENU_SPEECH_PROMPTS } from '../services/elevenLabsGenerationService';
import { DEFAULT_TTS_CONFIG, getTtsConfig, saveTtsConfig } from '../services/ttsConfigService';

const MODE_OPTIONS = [
  { value: 'web_speech', label: 'Web Speech', helper: 'Tamamen ücretsiz, kalite tarayıcıya bağlı.' },
  { value: 'hybrid', label: 'Hibrit', helper: 'Varsayılan ücretsiz okuma, seçili içerikte premium TTS.' },
  { value: 'elevenlabs', label: 'ElevenLabs', helper: 'Premium kalite; backend, kredi ve depolama gerekir.' },
];

export default function AdminTtsSettings() {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(DEFAULT_TTS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingManualPrompts, setSavingManualPrompts] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [manualPromptUrls, setManualPromptUrls] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const manualPromptStats = useMemo(() => {
    const missing = MENU_SPEECH_PROMPTS.filter(prompt => !manualPromptUrls[prompt.id]?.trim());
    return {
      missing,
      readyCount: MENU_SPEECH_PROMPTS.length - missing.length,
      totalCount: MENU_SPEECH_PROMPTS.length,
    };
  }, [manualPromptUrls]);

  useEffect(() => {
    let alive = true;

    async function loadConfig() {
      setLoading(true);
      setError('');
      try {
        const [nextConfig, audioPrompts] = await Promise.all([
          getTtsConfig(),
          getAudioPromptConfig(),
        ]);
        if (alive) {
          setConfig(nextConfig);
          setManualPromptUrls(
            Object.fromEntries(
              MENU_SPEECH_PROMPTS.map(prompt => [prompt.id, audioPrompts[prompt.id]?.url || '']),
            ),
          );
        }
      } catch (err) {
        if (alive) setError('TTS ayarları alınamadı: ' + err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadConfig();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const savedConfig = await saveTtsConfig(config, currentUser.uid);
      setConfig(savedConfig);
      setSuccessMsg('TTS ayarları kaydedildi.');
    } catch (err) {
      setError('TTS ayarları kaydedilemedi: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field, value) {
    setConfig(current => ({ ...current, [field]: value }));
  }

  async function handleGenerateMenuPrompts() {
    setGeneratingPrompts(true);
    setError('');
    setSuccessMsg('');

    try {
      const results = [];
      for (const prompt of MENU_SPEECH_PROMPTS) {
        const result = await generateCachedMenuSpeech(prompt, {
          model: config.defaultModel,
          voiceId: config.defaultVoiceId,
        });
        results.push(result.cached ? 'cache' : 'yeni');
      }

      setSuccessMsg(`Menü sesleri hazırlandı. ${results.filter(result => result === 'yeni').length} yeni üretim, ${results.filter(result => result === 'cache').length} cache kullanımı.`);
    } catch (err) {
      setError('Menü sesleri üretilemedi: ' + toFriendlyGenerationError(err));
    } finally {
      setGeneratingPrompts(false);
    }
  }

  async function handleSaveManualPrompts() {
    setSavingManualPrompts(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = Object.fromEntries(
        MENU_SPEECH_PROMPTS.map(prompt => [
          prompt.id,
          {
            provider: 'manual_elevenlabs',
            url: manualPromptUrls[prompt.id] || '',
          },
        ]),
      );

      await saveAudioPromptConfig(payload);
      setSuccessMsg('Manuel menü ses URLleri kaydedildi.');
    } catch (err) {
      setError('Manuel menü sesleri kaydedilemedi: ' + err.message);
    } finally {
      setSavingManualPrompts(false);
    }
  }

  function updateManualPromptUrl(promptId, url) {
    setManualPromptUrls(current => ({ ...current, [promptId]: url }));
  }

  return (
    <div className="tts-settings-page">
      <div className="page-header">
        <h1>TTS Ayarları</h1>
        <p className="subtitle">Web Speech ve ElevenLabs hibrit modelini maliyet kontrollü şekilde yönetin.</p>
      </div>

      {error && <div className="auth-error qc-alert">{error}</div>}
      {successMsg && <div className="success-msg qc-alert">{successMsg}</div>}

      <div className="tts-settings-grid">
        <form className="card tts-settings-form" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Motor Seçimi</h3>
              <p className="card-desc">Bugün gerçek üretim kapalı; bu ayarlar yarın backend/storage açıldığında kullanılacak.</p>
            </div>
            {loading && <span className="badge-light">Yükleniyor</span>}
          </div>

          <div className="tts-mode-options">
            {MODE_OPTIONS.map(option => (
              <label className={config.mode === option.value ? 'tts-mode-card active' : 'tts-mode-card'} key={option.value}>
                <input
                  type="radio"
                  name="tts-mode"
                  value={option.value}
                  checked={config.mode === option.value}
                  onChange={event => updateField('mode', event.target.value)}
                />
                <strong>{option.label}</strong>
                <span>{option.helper}</span>
              </label>
            ))}
          </div>

          <div className="settings-switch-row">
            <div>
              <strong>ElevenLabs üretimi</strong>
              <p>API key client tarafına konulmayacak. Backend/proxy hazır olunca açılmalı.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.elevenLabsEnabled}
                onChange={event => updateField('elevenLabsEnabled', event.target.checked)}
              />
              <span></span>
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Aylık kredi limiti</label>
              <input
                type="number"
                min="0"
                value={config.monthlyCreditLimit}
                onChange={event => updateField('monthlyCreditLimit', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Tahmini kullanılan kredi</label>
              <input
                type="number"
                min="0"
                value={config.usedCreditsEstimate}
                onChange={event => updateField('usedCreditsEstimate', event.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Kitap başına maksimum karakter</label>
              <input
                type="number"
                min="500"
                value={config.maxCharsPerBook}
                onChange={event => updateField('maxCharsPerBook', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>İstek başına maksimum karakter</label>
              <input
                type="number"
                min="250"
                value={config.maxCharsPerRequest}
                onChange={event => updateField('maxCharsPerRequest', event.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duyuru başına maksimum karakter</label>
              <input
                type="number"
                min="250"
                value={config.maxCharsPerAnnouncement}
                onChange={event => updateField('maxCharsPerAnnouncement', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Fallback motoru</label>
              <input
                value={config.fallbackEngine}
                onChange={event => updateField('fallbackEngine', event.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Varsayılan model</label>
              <input
                value={config.defaultModel}
                onChange={event => updateField('defaultModel', event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Varsayılan voice id</label>
              <input
                placeholder="ElevenLabs voice id"
                value={config.defaultVoiceId}
                onChange={event => updateField('defaultVoiceId', event.target.value)}
              />
            </div>
          </div>

          <div className="settings-switch-row">
            <div>
              <strong>Admin onayı zorunlu</strong>
              <p>Premium ses üretimi gönüllü tarafından doğrudan başlatılamaz.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.requireAdminApproval}
                onChange={event => updateField('requireAdminApproval', event.target.checked)}
              />
              <span></span>
            </label>
          </div>

          <div className="settings-switch-row">
            <div>
              <strong>Cache/depolama zorunlu</strong>
              <p>Aynı metin her dinlemede tekrar ElevenLabs kredisi harcamasın.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={config.cacheRequired}
                onChange={event => updateField('cacheRequired', event.target.checked)}
              />
              <span></span>
            </label>
          </div>

          <button className="btn-sage btn-auth" type="submit" disabled={saving || loading}>
            {saving ? 'Kaydediliyor...' : 'TTS Ayarlarını Kaydet'}
          </button>

          <button
            className="btn-outline btn-auth"
            type="button"
            disabled={generatingPrompts || loading || saving}
            onClick={handleGenerateMenuPrompts}
          >
            {generatingPrompts ? 'Menü sesleri hazırlanıyor...' : 'Cached Menü Seslerini Üret'}
          </button>
        </form>

        <aside className="card tts-policy-card">
          <h3>Bugünkü güvenli mod</h3>
          <div className="tts-policy-list">
            <div><strong>API key yok</strong><span>ElevenLabs anahtarı client bundle içine girmez.</span></div>
            <div><strong>Üretim yok</strong><span>Backend ve Storage hazır olmadan MP3 üretilmez.</span></div>
            <div><strong>Fallback var</strong><span>Premium ses yoksa Blind Mode Web Speech ile okumaya devam eder.</span></div>
            <div><strong>Kredi sınırı</strong><span>Admin limiti aşmadan premium üretim planlanır.</span></div>
          </div>
        </aside>
      </div>

      <section className="card manual-prompts-card">
        <div className="card-header">
          <div>
            <h3>Manuel Menü Sesleri</h3>
            <p className="card-desc">ElevenLabs web arayüzünde MP3 üretip Firebase Storage'a yükleyin, dosya URL'lerini buraya yapıştırın.</p>
          </div>
          <span className="badge-light">
            {manualPromptStats.readyCount}/{manualPromptStats.totalCount} hazır
          </span>
        </div>

        {manualPromptStats.missing.length > 0 && (
          <p className="card-desc">
            Eksik MP3: {manualPromptStats.missing.map(prompt => `${prompt.id}.mp3`).join(', ')}
          </p>
        )}

        <div className="manual-prompt-list">
          {MENU_SPEECH_PROMPTS.map(prompt => (
            <article className="manual-prompt-row" key={prompt.id}>
              <div>
                <strong>{prompt.label}</strong>
                <span className="badge-light">{prompt.id}.mp3</span>
                <p>{prompt.text}</p>
              </div>
              <div className="form-group">
                <label>MP3 URL</label>
                <input
                  placeholder="https://firebasestorage.googleapis.com/..."
                  value={manualPromptUrls[prompt.id] || ''}
                  onChange={event => updateManualPromptUrl(prompt.id, event.target.value)}
                />
              </div>
            </article>
          ))}
        </div>

        <button
          className="btn-sage btn-auth"
          type="button"
          disabled={savingManualPrompts || loading}
          onClick={handleSaveManualPrompts}
        >
          {savingManualPrompts ? 'Kaydediliyor...' : 'Manuel Ses URLlerini Kaydet'}
        </button>
      </section>
    </div>
  );
}

function toFriendlyGenerationError(error) {
  const message = error?.message || 'Bilinmeyen hata';

  if (
    message.includes('Unusual activity detected') ||
    message.includes('Free Tier usage disabled') ||
    message.includes('proxy/VPN')
  ) {
    return 'ElevenLabs ücretsiz hesap, Firebase Functions gibi cloud/proxy ortamından gelen isteği engelledi. Çözüm: ElevenLabs Starter/Paid plana geçmek veya bu sesleri ElevenLabs arayüzünden manuel üretip cache URL olarak eklemek.';
  }

  if (message.includes('ElevenLabs üretimi admin ayarlarında kapalı') || message.includes('ElevenLabs uretimi admin ayarlarinda kapali')) {
    return 'ElevenLabs üretimi kapalı. Toggle açıkken ayarları kaydedip tekrar deneyin.';
  }

  return message;
}
