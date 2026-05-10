import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadConfig() {
      setLoading(true);
      setError('');
      try {
        const nextConfig = await getTtsConfig();
        if (alive) setConfig(nextConfig);
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
    </div>
  );
}
