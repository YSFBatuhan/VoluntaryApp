import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      return setError('Şifreler eşleşmiyor.');
    }
    if (form.password.length < 6) {
      return setError('Şifre en az 6 karakter olmalı.');
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kayıtlı.');
      } else {
        setError('Kayıt sırasında bir hata oluştu. Tekrar deneyin.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>
            <strong>Duyum</strong>
            <small>Erişilebilir Sesli Kütüphane</small>
          </span>
        </div>
        <h1 className="auth-headline">Topluluğumuza <br /><span>katılın.</span></h1>
        <p className="auth-sub">
          Sesinizi bağışlayın, hayat değiştirin.<br />
          GTÜ'nün görme engelli öğrencileri sizi bekliyor.
        </p>
        <div className="auth-stats">
          <div className="auth-stat"><strong>1,240+</strong><span>Dinleyici</span></div>
          <div className="auth-stat"><strong>86</strong><span>Gönüllü</span></div>
          <div className="auth-stat"><strong>312</strong><span>Sesli Kitap</span></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Gönüllü Ol</h2>
          <p className="auth-card-sub">Ücretsiz hesap oluştur, kayıt yapmaya başla.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Ad Soyad</label>
              <input
                type="text"
                placeholder="Adınız Soyadınız"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>E-posta</label>
              <input
                type="email"
                placeholder="ornek@gtu.edu.tr"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Şifre Tekrar</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-sage btn-auth" disabled={loading}>
              {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
            </button>
          </form>

          <p className="auth-switch">
            Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
