import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
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
        <h1 className="auth-headline">Sesiniz bir <br /><span>fark yaratıyor.</span></h1>
        <p className="auth-sub">
          GTÜ erişilebilir sesli kütüphane platformu.<br />
          Her kelime, bir kapı aralıyor.
        </p>
        <div className="auth-stats">
          <div className="auth-stat"><strong>1,240+</strong><span>Dinleyici</span></div>
          <div className="auth-stat"><strong>86</strong><span>Gönüllü</span></div>
          <div className="auth-stat"><strong>312</strong><span>Sesli Kitap</span></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2>Giriş Yap</h2>
          <p className="auth-card-sub">Gönüllü hesabına hoş geldin.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-sage btn-auth" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p className="auth-switch">
            Hesabın yok mu? <Link to="/register">Gönüllü ol</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
