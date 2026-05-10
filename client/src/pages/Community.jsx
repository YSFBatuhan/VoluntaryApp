export default function Community() {
  return (
    <div className="community-page">
      <div className="page-header">
        <h1>Topluluk</h1>
        <p className="subtitle">Gönüllülerin ortak çalışma notları, duyurular ve kalite rehberi.</p>
      </div>

      <div className="community-grid">
        <section className="card">
          <div className="card-header">
            <h3>Duyurular</h3>
            <span className="badge-light">MVP</span>
          </div>
          <div className="community-list">
            <article>
              <strong>Kalite kontrol akışı aktif</strong>
              <p>Yüklediğin içerikler önce admin incelemesine gider. Düzeltme istenirse Kitap Yönetimi sayfasında görebilirsin.</p>
            </article>
            <article>
              <strong>PDF yüklerken kaynak notu ekle</strong>
              <p>Ders notu, açık erişim PDF veya izinli içerik olduğunu kısa ve net yazman onay sürecini hızlandırır.</p>
            </article>
            <article>
              <strong>Ses yükleme beklemede</strong>
              <p>Firebase Storage Blaze kararı verilene kadar ana katkı yolu seçilebilir metinli PDF yüklemek olacak.</p>
            </article>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Kalite Rehberi</h3>
          </div>
          <div className="quality-checklist">
            <label><input type="checkbox" readOnly checked /> Metin veya ses kaynağı izinli mi?</label>
            <label><input type="checkbox" readOnly checked /> Kitap adı, yazar ve kategori net mi?</label>
            <label><input type="checkbox" readOnly checked /> PDF seçilebilir metin içeriyor mu?</label>
            <label><input type="checkbox" readOnly checked /> PDF metni ilk önizlemede düzgün okunuyor mu?</label>
          </div>
        </section>
      </div>

      <section className="card community-help-card">
        <h3>Yardıma mı ihtiyacın var?</h3>
        <p>Şimdilik destek akışı uygulama içinde tutuluyor. Takıldığın içerikleri Kitap Yönetimi sayfasında notuyla birlikte güncelle; admin kontrol panelinde görünür.</p>
      </section>
    </div>
  );
}
