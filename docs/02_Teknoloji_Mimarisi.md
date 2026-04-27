# 2. Teknoloji Mimarisi

Projenin hiçbir aşamasında fiziksel sunucu kiralayıp bakım yapmamak (Serverless Mimari) ve maliyetleri sıfıra indirmek için aşağıdaki modern teknolojiler seçilmiştir.

## 💻 Frontend (İstemci Tarafı)
- **Framework:** React.js veya Next.js (Hızlı, modern, kolay yönetilebilir).
- **Stil Yönetimi:** Tailwind CSS (Yüksek kontrastlı arayüzleri çok hızlı tasarlamak için).
- **Hosting (Barındırma):** Vercel veya Netlify (Tamamen ücretsiz).
- **Geri Bildirim (Feedback) Araçları:**
  - `HTML5 Vibration API` (Mobil cihazlarda ve destekleyen tarayıcılarda titreşimli geri bildirim)
  - `Web Audio API` (Tıklama, hata, başarı gibi 'bip' ses efektleri için)

## 🗄️ Backend & Depolama
- **BaaS (Backend as a Service):** Firebase
- **Kimlik Doğrulama:** Firebase Auth (Gönüllüler için hızlı şifresiz giriş veya Google Login)
- **Veritabanı:** Firestore (Kitap, yazar, kullanıcı verileri için çok hızlı NoSQL)
- **Medya Depolama:** Firebase Cloud Storage (Gönüllü MP3 kayıtları, üretilmiş TTS sesleri ve kapak fotoğrafları için)

## 🗣️ Ses Teknolojileri (Hibrit Yapı)
Maliyetleri düşürmek için sistem kendi içinde karar verici bir hibrit yapı kuracaktır:
- **Web Speech API:** Tarayıcı tabanlı tamamen ücretsiz Metin-Ses (TTS) ve Ses-Metin (STT). Dinamik ve sürekli okuma gerektiren uzun makale tarzı yerlerde ana motorumuz.
- **ElevenLabs API:** Yüksek kaliteli ve pürüzsüz yapay zeka sesi. Sadece **sabit sistem mesajları** (örn: "Ana menüye dönüldü") veya **önceden önbelleğe alınmış (cached)** içerikler için kullanılacak. Maliyet yaratmayacak şekilde dizayn edilmiştir.
