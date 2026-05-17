import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GTU_ANNOUNCEMENTS } from '../data/gtuAnnouncements';
import { getAnnouncementAudioStatus, loadAnnouncementAudioCache } from '../services/cachedSpeechService';
import { DEFAULT_TTS_CONFIG, getTtsConfig, saveTtsConfig } from '../services/ttsConfigService';

const MODE_OPTIONS = [
  { value: 'cached_audio', label: 'Hazır Ses', helper: 'Yayınlanan içerikte depolanmış doğal ses dosyaları kullanılır.' },
  { value: 'elevenlabs', label: 'ElevenLabs', helper: 'Premium kalite; backend, kredi ve depolama gerekir.' },
];

export default function AdminTtsSettings() {
  const { currentUser } = useAuth();
  const [config, setConfig] = useState(DEFAULT_TTS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcementCacheLoaded, setAnnouncementCacheLoaded] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const announcementAudioStats = getAnnouncementAudioStats();

  useEffect(() => {
    let alive = true;

    async function loadConfig() {
      setLoading(true);
      setError('');
      try {
        const [nextConfig] = await Promise.all([
          getTtsConfig(),
          loadAnnouncementAudioCache(),
        ]);
        if (alive) {
          setConfig(nextConfig);
          setAnnouncementCacheLoaded(true);
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
      setSuccessMsg('Ses üretim ayarları kaydedildi.');
    } catch (err) {
      setError('Ses üretim ayarları kaydedilemedi: ' + err.message);
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
        <h1>Ses Üretimi</h1>
        <p className="subtitle">Doğal ses üretimini, cache/depolama akışını ve maliyet limitlerini yönetin.</p>
      </div>

      {error && <div className="auth-error qc-alert">{error}</div>}
      {successMsg && <div className="success-msg qc-alert">{successMsg}</div>}

      <div className="tts-settings-grid">
        <form className="card tts-settings-form" onSubmit={handleSubmit}>
          <div className="card-header">
            <div>
              <h3>Üretim Modu</h3>
              <p className="card-desc">İçerikler hazır ses dosyasıyla yayınlanır; eksik sesler kuyruk ve cache durumundan takip edilir.</p>
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
              <label>Yedek akış</label>
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
              <p>Ses üretimi ve yayın kararı kalite kontrol onayından sonra ilerler.</p>
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
            {saving ? 'Kaydediliyor...' : 'Ses Üretim Ayarlarını Kaydet'}
          </button>

        </form>

        <aside className="card tts-policy-card">
          <h3>Yayın Güvencesi</h3>
          <div className="tts-policy-list">
            <div><strong>API key yok</strong><span>ElevenLabs anahtarı client bundle içine girmez.</span></div>
            <div><strong>Cache zorunlu</strong><span>Yayınlanan içerikte ses dosyası Storage üzerinden oynatılır.</span></div>
            <div><strong>Hazır değilse bekler</strong><span>Eksik sesli içerik yayın öncesi kuyrukta görünür.</span></div>
            <div><strong>Kredi sınırı</strong><span>Üretim admin limiti aşmadan planlanır.</span></div>
          </div>
        </aside>
      </div>

      <section className="card manual-prompts-card">
        <div className="card-header">
          <div>
            <h3>Duyuru Ses Cache Durumu</h3>
            <p className="card-desc">GTÜ duyurularında özet ve detay MP3 dosyalarının Firestore/Storage tarafında hazır olup olmadığını gösterir.</p>
          </div>
          <span className="badge-light">
            {announcementCacheLoaded ? 'Cache okundu' : 'Cache yükleniyor'}
          </span>
        </div>

        <div className="metric-grid compact">
          <section className="metric-card">
            <span>Toplam Duyuru</span>
            <strong>{announcementAudioStats.total}</strong>
            <p>Generated GTÜ duyuru datası</p>
          </section>
          <section className="metric-card">
            <span>Özet Sesi</span>
            <strong>{announcementAudioStats.summaryReady}</strong>
            <p>summaryUrl veya ortak audio URL hazır</p>
          </section>
          <section className="metric-card">
            <span>Detay Sesi</span>
            <strong>{announcementAudioStats.detailReady}</strong>
            <p>detailUrl veya ortak audio URL hazır</p>
          </section>
          <section className="metric-card">
            <span>Tam Hazır</span>
            <strong>{announcementAudioStats.bothReady}</strong>
            <p>Özet ve detay birlikte hazır</p>
          </section>
        </div>

        {announcementAudioStats.missing.length > 0 && (
          <div className="manual-prompt-list">
            {announcementAudioStats.missing.map(({ announcement, status }) => (
              <article className="manual-prompt-row" key={announcement.id}>
                <div>
                  <strong>{announcement.title}</strong>
                  <span className="badge-light">{announcement.departmentName || announcement.departmentId}</span>
                  <p>
                    Özet: {status.summaryReady ? 'hazır' : 'eksik'} · Detay: {status.detailReady ? 'hazır' : 'eksik'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getAnnouncementAudioStats() {
  const rows = GTU_ANNOUNCEMENTS.map((announcement) => ({
    announcement,
    status: getAnnouncementAudioStatus(announcement),
  }));

  return {
    total: rows.length,
    summaryReady: rows.filter(row => row.status.summaryReady).length,
    detailReady: rows.filter(row => row.status.detailReady).length,
    bothReady: rows.filter(row => row.status.summaryReady && row.status.detailReady).length,
    missing: rows.filter(row => !row.status.summaryReady || !row.status.detailReady).slice(0, 6),
  };
}
