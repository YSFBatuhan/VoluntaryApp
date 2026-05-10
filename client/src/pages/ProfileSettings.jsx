import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BLIND_INTERFACE_KEY = 'echovoices:blind-interface-mode';

export default function ProfileSettings() {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [form, setForm] = useState({
    name: userProfile?.name || currentUser?.displayName || '',
    level: userProfile?.level || 'Başlangıç',
    bio: userProfile?.bio || '',
    preferredCategory: userProfile?.preferredCategory || 'Ders Notu',
    availability: userProfile?.availability || 'Haftada 2-3 saat',
    goalMinutes: userProfile?.goalMinutes || 120,
    blindInterfaceMode:
      userProfile?.blindInterfaceMode || localStorage.getItem(BLIND_INTERFACE_KEY) || 'standard',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setError('');

    try {
      await updateUserProfile({
        ...form,
        goalMinutes: Number(form.goalMinutes) || 0,
      });
      localStorage.setItem(BLIND_INTERFACE_KEY, form.blindInterfaceMode);
      setSuccessMsg('Profil güncellendi.');
    } catch (err) {
      setError('Profil kaydedilemedi: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profil</h1>
        <p className="subtitle">Gönüllü kimliğini, ilgi alanlarını ve katkı hedefini düzenle.</p>
      </div>

      <div className="profile-grid">
        <section className="card profile-summary-card">
          <div className="profile-avatar-large">{getInitials(form.name)}</div>
          <h2>{form.name || 'Gönüllü'}</h2>
          <p>{currentUser?.email}</p>
          <div className="profile-role-row">
            <span>{userProfile?.role === 'admin' ? 'Admin' : 'Gönüllü'}</span>
            <span>{form.level}</span>
          </div>
          <div className="profile-goal-box">
            <strong>{form.goalMinutes || 0} dk</strong>
            <span>Aylık katkı hedefi</span>
          </div>
        </section>

        <section className="card profile-form-card">
          {error && <div className="auth-error">{error}</div>}
          {successMsg && <div className="success-msg">{successMsg}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Ad Soyad</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Gönüllü Seviyesi</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                  <option>Başlangıç</option>
                  <option>Düzenli Okuyucu</option>
                  <option>Deneyimli Gönüllü</option>
                  <option>Kalite Kontrole Hazır</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Öncelikli İlgi Alanı</label>
                <select value={form.preferredCategory} onChange={e => setForm({ ...form, preferredCategory: e.target.value })}>
                  <option>Ders Notu</option>
                  <option>Roman</option>
                  <option>Bilim</option>
                  <option>Tarih</option>
                  <option>GTÜ Duyurusu</option>
                </select>
              </div>
              <div className="form-group">
                <label>Uygunluk</label>
                <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}>
                  <option>Haftada 1 saat</option>
                  <option>Haftada 2-3 saat</option>
                  <option>Haftada 4+ saat</option>
                  <option>Dönem dönem uygunum</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Aylık Okuma Hedefi (dk)</label>
              <input
                type="number"
                min="0"
                value={form.goalMinutes}
                onChange={e => setForm({ ...form, goalMinutes: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Blind Mode Arayüzü</label>
              <select
                value={form.blindInterfaceMode}
                onChange={e => setForm({ ...form, blindInterfaceMode: e.target.value })}
              >
                <option value="standard">Standart arayüz</option>
                <option value="simple">Sade mikrofon arayüzü</option>
              </select>
            </div>

            <div className="form-group">
              <label>Kısa Profil Notu</label>
              <textarea
                rows={4}
                placeholder="Ör: Teknik ders notları ve GTÜ duyurularına öncelik veriyorum."
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
              />
            </div>

            <button className="btn-sage btn-auth" type="submit" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Profili Kaydet'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function getInitials(name) {
  return name
    ? name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
    : 'GV';
}
