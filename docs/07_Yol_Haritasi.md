# 7. Yol Haritası ve Faz Planlaması (Roadmap)

Adım adım, en güvenli şekilde projeyi tamamlamak için izlenecek yol:

## Faz 1: Temel Mimari ve Altyapı (Hafta 1-2)
- Dokümantasyona dayalı klasör yapılarının oluşturulması.
- React (Vite) projesinin kurulması ve Firebase bağlantılarının yapılması.
- Veritabanı koleksiyonlarının (`users`, `books`, `chapters`) oluşturulması.
- Gönüllü kayıt/giriş sayfalarının hazırlanması.

## Faz 2: Gönüllü Stüdyosu (Hafta 3-4)
- Gönüllülerin tarayıcı üzerinden mikrofonla kayıt yapabileceği arayüzün (MediaRecorder API) kodlanması.
- Yüklenen seslerin Firebase Storage'a aktarılması ve veritabanına bağlanması.
- MP3 dosya yükleme desteği ve yükleme barının (progress bar) eklenmesi.

## Faz 3: Erişilebilirlik Motoru (Hafta 5-6) (KRİTİK FAZ)
- Görme Engelli yüksek kontrastlı arayüzün kodlanması.
- **Titreşim ve Ses Efektlerinin (Haptic & Audio Cues)** sisteme gömülmesi.
- Sesli Komut Dinleme (Speech-to-Text) ve arama modülünün kodlanması.
- TTS Caching (Önbellekleme) maliyet algoritmasının devreye alınması.

## Faz 4: GTÜ Beta Testi (Hafta 7-8)
- Kapalı Beta: Projenin GTÜ içerisindeki 2-3 görme engelli öğrenciyle test edilmesi.
- Geri bildirimlerin alınması: "Titreşimler rahatsız edici mi?", "Sesli komut algılama yeterli mi?"
- Tespit edilen hataların çözümü ve optimizasyon.
- Vercel üzerinden tam sürüm lansmanı.
