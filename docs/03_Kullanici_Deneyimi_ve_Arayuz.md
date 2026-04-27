# 3. Kullanıcı Deneyimi (UX) ve Arayüz (UI)

Sistemde iki farklı ana arayüz bulunacaktır: Görme Engelli Modu ve Gönüllü Modu.

## 3.1. Görme Engelli Öğrenci Arayüzü
Erişilebilirliğin sadece ekran okuyucu uyumu değil, başlı başına özel bir deneyim olduğuna inanıyoruz.

- **Görsel Tasarım:** Koyu orman yeşili arka plan üzerine parlak krem yazılar. (Siyah/sarı kadar yüksek kontrast sağlarken, aynı zamanda huzur veren bir renk paleti). Ekranda hiçbir gereksiz görsel olmayacak, sadece tüm ekranı kaplayan 2-3 devasa buton (Touch Targets).
- **Renk Paleti (Gönüllü Paneli):** Beyaz, Krem ve Adaçayı Yeşili (Sage Green) tonlarında ferah, sade ve kullanıcıyı yormayan huzur verici bir modern panel tasarımı.
- **Çoklu Duyusal Geri Bildirim (Multi-sensory Feedback):**
  - *Titreşim (Haptic Feedback):* Bir butona odaklanıldığında veya menüde gezerken çok kısa bir titreşim (`vibrate(50)`). İşlem başarılı olduğunda (örneğin kitap başladığında) uzun titreşim, hata durumunda kesik kesik üç titreşim.
  - *İşitsel Geri Bildirim (Audio Cues):* Sayfa değişimlerinde "rüzgar (swish)" sesi, butona basıldığında net bir "click/pop" sesi. Kullanıcı ekrana bakmasa bile o an sistemin tepki verdiğini bilecek.
- **Navigasyon Kısayolları:** Boşluk (Oynat/Durdur), Yön Tuşları (10 saniye ileri/geri), ve Sesli komut tuşu.

## 3.2. Gönüllü Arayüzü
Gönüllülerin işini kolaylaştırmak için modern bir Dashboard.
- **İçerik Stüdyosu:** Gönüllü, sisteme giriş yapar yapmaz "Yeni Kayıt Oluştur" butonuna basar.
- **Doğrudan Kayıt:** Gönüllüler başka programlarla MP3 hazırlamakla uğraşmadan, doğrudan tarayıcı üzerinden mikrofonlarına izin vererek okuma yapıp platforma anında yükleyebilirler.
- **Takip Paneli:** Gönüllü "Bu ay kaç dakika kitap okudum, içeriklerim ne kadar dinlendi?" gibi motive edici istatistiklerini görebilir.
