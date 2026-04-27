# 5. Veritabanı ve Veri Modeli Tasarımı (Firestore)

Minimum okuma maliyeti ve yüksek hız hedeflenerek tasarlanan NoSQL şeması:

## Koleksiyonlar (Collections)

### `users` (Kullanıcılar)
- `uid`: String (Firebase Auth ID)
- `role`: "volunteer" | "blind_user" | "admin"
- `name`: String
- `preferences`: Object (Ses hızı ayarı, Titreşim aktif/pasif)
- `totalMinutesRead`: Number (Gönüllüler için motive edici istatistik)

### `books` (Kitaplar / Yayınlar)
- `id`: String
- `title`: String
- `author`: String
- `category`: String (Roman, Ders Notu, GTÜ Duyuru)
- `createdAt`: Timestamp

### `chapters` (Kitap Alt Bölümleri / Ses Dosyaları)
- `id`: String
- `bookId`: String (Hangi kitaba ait olduğu)
- `chapterTitle`: String (Örn: "Bölüm 1")
- `audioUrl`: String (Firebase Storage MP3 linki - Gönüllünün kaydı)
- `duration`: Number (Saniye)
- `recordedBy`: String (Kaydeden gönüllünün UID'si)

### `tts_cache` (Akıllı Önbellek Havuzu - Maliyet Düşürücü)
Bu koleksiyon ElevenLabs API maliyetlerini engellemek için kullanılır.
- `textHash`: String (Metnin MD5 veya SHA-256 özeti, örn: "platforma_hos_geldiniz_hash")
- `audioUrl`: String (ElevenLabs ile sadece BİR KERE çevrilip Storage'a atılmış MP3 linki)
