# 9. Faz 2 Database Semasi

Bu dokuman Faz 2 icin Firestore veri modelini tarif eder. Ana hedef, Blind Mode'u gercek veriye baglarken ucretsiz kotayi korumak, arama deneyimini hizli tutmak ve ileride admin/kalite kontrol akisina hazir olmaktir.

## Tasarim Ilkeleri

1. **Okuma sayisi dusuk olacak:** Dinleyici ekraninda tek acilista az sayida dokuman okunacak.
2. **Realtime listener varsayilan olmayacak:** `onSnapshot` sadece gercek zamanli takip gereken admin ekranlarinda dusunulecek.
3. **Arama basit ve ucuz olacak:** Tam metin arama servisi kullanilmayacak. Normalize edilmis alanlar ve anahtar kelime dizileri tutulacak.
4. **Ses dosyasi Firestore'a gomulmeyecek:** Firestore sadece metadata ve URL tutacak.
5. **Yayinlanmamis veri dinleyiciye gitmeyecek:** Blind Mode sadece `status == "published"` icerikleri okuyacak.
6. **Ileride servis degisimi kolay olacak:** Cloudinary, Firebase Storage veya baska depolama servisleri ayni `audio` objesi altinda temsil edilecek.

## Koleksiyon Haritasi

```text
users/{uid}
books/{bookId}
chapters/{chapterId}
book_text_chunks/{chunkId}
announcements/{announcementId}
playback_progress/{uid_bookId}
favorites/{uid_bookId}
listening_events/{eventId}
app_config/public
```

MVP icin zorunlu koleksiyonlar:

- `users`
- `books`
- `chapters`
- `book_text_chunks`
- `app_config`
- `announcements`

Beta icin eklenecek koleksiyonlar:

- `playback_progress`
- `favorites`
- `listening_events`

## `users`

Firebase Auth kullanicisinin uygulama profilidir. Dokuman ID her zaman Firebase `uid` olmalidir.

```json
{
  "uid": "auth_uid",
  "email": "ogrenci@gtu.edu.tr",
  "name": "Ad Soyad",
  "role": "volunteer",
  "status": "active",
  "preferences": {
    "speechRate": 0.9,
    "hapticsEnabled": true,
    "audioCuesEnabled": true,
    "highContrast": true,
    "preferredLanguage": "tr-TR"
  },
  "volunteerStats": {
    "totalMinutesRead": 0,
    "booksCompleted": 0,
    "chaptersUploaded": 0,
    "approvedChapters": 0
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastLoginAt": "Timestamp"
}
```

### Alan Notlari

| Alan | Tip | Zorunlu | Not |
| --- | --- | --- | --- |
| `uid` | string | Evet | Auth uid ile ayni. |
| `email` | string | Evet | Login icin. Dinleyici tarafinda gosterilmez. |
| `name` | string | Evet | Gonullu panelinde gorunur. |
| `role` | string | Evet | `volunteer`, `blind_user`, `admin`. |
| `status` | string | Evet | `active`, `disabled`, `pending`. |
| `preferences` | object | Evet | Blind Mode deneyimi icin. |
| `volunteerStats` | object | Hayir | Sadece gonullu/admin ekranlarinda. |

## `books`

Kitap, ders notu, duyuru veya podcast gibi ana yayin kaydidir. Dinleyici ekraninda listelenen temel obje budur.

```json
{
  "title": "Nutuk",
  "titleLower": "nutuk",
  "author": "Mustafa Kemal Ataturk",
  "authorLower": "mustafa kemal ataturk",
  "category": "Tarih",
  "type": "book",
  "sourceType": "pdf",
  "language": "tr-TR",
  "description": "Kisa aciklama",
  "keywords": ["nutuk", "atatürk", "ataturk", "tarih", "cumhuriyet"],
  "status": "published",
  "visibility": "public",
  "readingMode": "tts_text",
  "chapterCount": 3,
  "textChunkCount": 42,
  "totalDurationSec": 5400,
  "estimatedReadingMinutes": 90,
  "sourceFile": {
    "provider": "cloudinary",
    "url": "https://...",
    "publicId": "echovoices/pdf/nutuk",
    "format": "pdf",
    "bytes": 2400000,
    "pageCount": 120
  },
  "cover": {
    "url": "",
    "alt": "Nutuk kitap kapagi"
  },
  "createdBy": "volunteer_uid",
  "uploaderName": "Ad Soyad",
  "approvedBy": "admin_uid",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "publishedAt": "Timestamp"
}
```

### `books.status`

| Deger | Anlam |
| --- | --- |
| `draft` | Gonullu kaydi tamamlamadi. |
| `pending` | Admin/kalite kontrol bekliyor. |
| `published` | Blind Mode'da gorunebilir. |
| `rejected` | Kalite kontrol reddetti. |
| `archived` | Yayindan kaldirildi ama silinmedi. |

### Neden `chapterCount` ve `totalDurationSec` Kitapta Tutuluyor?

Firestore join yapmaz. Dinleyici listesinde her kitap icin bolumleri tek tek okumak pahali olur. Bu iki alan kitap kartini tek okumayla anlamli hale getirir.

### `books.sourceType`

| Deger | Anlam |
| --- | --- |
| `audio_upload` | Gonullu hazir ses dosyasi yukledi. |
| `browser_recording` | Gonullu tarayicidan ses kaydi aldi. |
| `pdf` | Gonullu PDF yukledi, sistem metni okuyacak. |
| `text` | Gonullu duz metin ekledi, sistem okuyacak. |

### `books.readingMode`

| Deger | Anlam |
| --- | --- |
| `audio_file` | Player dogrudan ses dosyasi oynatir. |
| `tts_text` | Web Speech API metni seslendirir. |
| `mixed` | Bazi bolumler ses, bazi bolumler metin tabanlidir. |

## `chapters`

Her ses dosyasi veya kitap bolumu icin bir dokumandir. PDF tabanli kitaplarda `chapters` yine bolumleme bilgisini tutabilir; asil metin parcalari `book_text_chunks` koleksiyonunda saklanir.

```json
{
  "bookId": "book_id",
  "order": 1,
  "chapterTitle": "Birinci Bolum",
  "chapterTitleLower": "birinci bolum",
  "status": "published",
  "durationSec": 1200,
  "readingMode": "audio_file",
  "textChunkStart": 1,
  "textChunkEnd": 8,
  "audio": {
    "provider": "cloudinary",
    "url": "https://...",
    "publicId": "echovoices/nutuk/bolum-1",
    "format": "mp3",
    "bytes": 12500000,
    "bitrateKbps": 128
  },
  "recordedBy": "volunteer_uid",
  "recordedByName": "Ad Soyad",
  "quality": {
    "noiseCheck": "unknown",
    "clarity": "unknown",
    "pace": "unknown",
    "adminNote": ""
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "publishedAt": "Timestamp"
}
```

### Alan Notlari

| Alan | Tip | Zorunlu | Not |
| --- | --- | --- | --- |
| `bookId` | string | Evet | `books/{bookId}` referansi. |
| `order` | number | Evet | Bolum sirasi. |
| `status` | string | Evet | Kitap status'u ile uyumlu olmali. |
| `durationSec` | number | Evet | Player ve gonullu istatistigi icin. |
| `readingMode` | string | Evet | `audio_file`, `tts_text`, `mixed`. |
| `textChunkStart` | number | Hayir | PDF/metin tabanli bolumlerde ilk chunk sirasi. |
| `textChunkEnd` | number | Hayir | PDF/metin tabanli bolumlerde son chunk sirasi. |
| `audio.provider` | string | Hayir | `cloudinary`, `firebase_storage`, `external`. |
| `audio.url` | string | Hayir | Sadece ses dosyali bolumlerde zorunlu. |
| `audio.bytes` | number | Hayir | Depolama/kota kontrolu icin. |

## `book_text_chunks`

PDF veya duz metin kaynakli kitaplarin okunabilir metin parcalaridir. Firestore dokuman boyutu limiti ve TTS kontrolu icin tum kitap tek dokumanda tutulmaz.

Dokuman ID formati onerisi:

```text
{bookId}_{chunkOrder}
```

Ornek: `nutuk_0001`

```json
{
  "bookId": "book_id",
  "chapterId": "chapter_id_or_null",
  "order": 1,
  "pageStart": 1,
  "pageEnd": 3,
  "text": "Okunacak metin parcasi...",
  "charCount": 3800,
  "wordCount": 620,
  "language": "tr-TR",
  "createdAt": "Timestamp"
}
```

### Chunk Boyutu Kurali

- Her chunk yaklasik 2.000 - 4.000 karakter arasi tutulmali.
- Bir chunk tek TTS okuma oturumu icin cok uzun olmamali.
- Sayfa numarasi saklanmali; kullanici "3. sayfaya git" dediginde navigasyon mumkun olmali.
- OCR sonucu guvenilmezse kitap `pending_review` olarak bekletilmeli.

### PDF Metni Nerede Islenecek?

MVP icin hedef: PDF metnini tarayici tarafinda cikarmak ve Firestore'a parcalar halinde yazmak.

Neden?

- Cloud Function gerekmez.
- Sunucu maliyeti yoktur.
- PDF upload eden gonullunun cihazi isi yapar.
- Firestore'a sadece islenmis metin ve metadata gider.

Risk: Taranmis/gorsel PDF'lerde metin cikmayabilir. OCR maliyetli olabilecegi icin MVP'de bu tip PDF'ler "metin secilemiyor" uyarisi alir ve manuel metin girisi ya da insan kontrolu gerekir.

## `playback_progress`

10 Mayis 2026 guncellemesi: Blind Mode icinde cihazlar arasi kaldigi yerden devam icin `playback_progress` kullanilmaya baslandi. LocalStorage fallback olarak kalir; kullanici giris yapmissa Firestore kaydi onceliklidir.

Dokuman ID formati:

```text
{uid}_{bookId}
```

PDF/TTS kitaplarda:

- `chunkIndex`: Okunan metin parcasinin 0 tabanli index'i.
- `pageStart`: Kullaniciya soylenen sayfa numarasi.
- `positionSec`: 0 kalabilir.

Sesli kitaplarda:

- `chapterId`: Oynatilan yayinlanmis bolum.
- `positionSec`: Ses dosyasinda kalinan saniye.
- `chunkIndex` ve `pageStart`: 0/null kalabilir.

Blind Mode su an progress'i su anlarda yazar:

- PDF/TTS chunk okunmaya basladiginda.
- Kullanici duraklattiginda.
- Kullanici "kaldigim yeri isaretle" dediginde.
- Sesli kitap oynarken yaklasik 15 saniyede bir.
- Sesli kitapta ileri/geri sarildiginda.
- Sesli kitap duraklatildiginda.

Komutlar:

- `kaldigim yeri isaretle`
- `kaldigim yerden devam et`
- `sonraki sayfa`
- `onceki sayfa`
- `10 saniye ileri`
- `10 saniye geri`

## `announcements`

GTU genel duyurulari ve bolum duyurulari icin ortak koleksiyondur. Dinleyici tarafinda bolum bazli filtrelenir.

```json
{
  "title": "Ara sinav salonlari hakkinda",
  "titleLower": "ara sinav salonlari hakkinda",
  "summary": "Kisa ve sesli okumaya uygun ozet",
  "bodyText": "Duyurunun detay metni",
  "departmentId": "bilgisayar",
  "departmentName": "Bilgisayar Muhendisligi",
  "scope": "department",
  "language": "tr-TR",
  "sourceUrl": "https://www.gtu.edu.tr/...",
  "sourceHash": "hash",
  "status": "published",
  "publishedAt": "Timestamp",
  "fetchedAt": "Timestamp",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Alan Notlari

| Alan | Tip | Zorunlu | Not |
| --- | --- | --- | --- |
| `departmentId` | string | Evet | Bolum listesi ile eslesir. Genel duyuru icin `gtu-genel`. |
| `scope` | string | Evet | `general`, `department`, `faculty`. |
| `bodyText` | string | Hayir | Detay sayfasindan temizlenmis metin. |
| `sourceUrl` | string | Evet | Orijinal GTU duyuru linki. |
| `sourceHash` | string | Hayir | Ayni duyuruyu tekrar yazmamak icin. |

### Duyuru Sorgusu

```text
announcements
  where status == "published"
  where departmentId == selectedDepartmentId
  limit 20
```

MVP'de `orderBy publishedAt` zorunlu tutulmayabilir; az veri cekilip client'ta siralanabilir. Boylece index zorunlulugu azalir.

---

Kullanicinin nerede kaldigini tutar. Dokuman ID formatı `uid_bookId` olmalidir. Bu sayede ayni kullanici-kitap ikilisi icin tek dokuman okunur/yazilir.

```json
{
  "uid": "auth_uid",
  "bookId": "book_id",
  "chapterId": "chapter_id",
  "title": "Kitap adi",
  "author": "Yazar",
  "readingMode": "audio_file",
  "positionSec": 420,
  "chunkIndex": 8,
  "pageStart": 42,
  "completed": false,
  "updatedAt": "Timestamp"
}
```

### Yazma Sikligi Kurali

Player her saniye Firestore'a yazmayacak. MVP icin:

- Oynatma duraklatilinca yaz.
- Bolum degisince yaz.
- Sayfa kapanmadan once yazmayi dene.
- En sik 30 saniyede bir yaz.
- TTS metin okumada `chunkOrder` ve `charOffset` sakla.

## `favorites`

Dinleyicinin kaydettigi kitaplar icindir. Dokuman ID formatı `uid_bookId` olmalidir.

```json
{
  "uid": "auth_uid",
  "bookId": "book_id",
  "title": "Nutuk",
  "author": "Mustafa Kemal Ataturk",
  "createdAt": "Timestamp"
}
```

Basit liste icin `title` ve `author` denormalize tutulur. Boylece favoriler ekraninda her favori icin tekrar `books` okunmaz.

## `listening_events`

Analitik icin dusuk frekansli olay kaydidir. MVP'de zorunlu degildir. Kotayi korumak icin sadece anlamli olaylarda yazilir.

```json
{
  "uid": "auth_uid_or_anonymous",
  "bookId": "book_id",
  "chapterId": "chapter_id",
  "eventType": "play_started",
  "positionSec": 0,
  "createdAt": "Timestamp"
}
```

### Izin Verilen Event Tipleri

- `play_started`
- `chapter_completed`
- `book_completed`
- `search_no_result`
- `voice_command_failed`

Her play/pause tiklamasini yazmak yok. Bu koleksiyon beta sonrasi acilmali.

## `app_config`

Public uygulama ayarlaridir. Dokuman ID `public` olabilir.

```json
{
  "blindMode": {
    "welcomeMessage": "GTU EchoVoices dinleme moduna hos geldiniz.",
    "defaultSpeechRate": 0.9,
    "maxBooksPerPage": 20,
    "voiceCommandsEnabled": true
  },
  "uploadLimits": {
    "maxAudioBytes": 52428800,
    "maxPdfBytes": 20971520,
    "allowedFormats": ["mp3", "wav", "aac", "webm"],
    "allowedDocumentFormats": ["pdf"],
    "recommendedBitrateKbps": 128
  },
  "updatedAt": "Timestamp"
}
```

Bu dokuman uygulama acilisinda bir kere okunabilir. Sik degismedigi icin localStorage ile cache'lenebilir.

## Kota Dostu Sorgular

### Blind Mode Ilk Acilis

```text
books
  where status == "published"
  orderBy publishedAt desc
  limit 20
```

Amac: Tek sorguda 20 kitap, 20 read. Bolumler sadece kitap secilince okunur.

### Kitap Secilince Bolumleri Getirme

```text
chapters
  where bookId == selectedBookId
  where status == "published"
  orderBy order asc
```

Amac: Sadece dinlenecek kitabin bolumlerini oku.

### PDF Kitapta Metin Chunklarini Getirme

```text
book_text_chunks
  where bookId == selectedBookId
  orderBy order asc
  limit 5
```

Amac: Tum kitabi tek seferde okumamak. Player mevcut chunk bitince sonraki 5 chunk'i getirir.

### Kategoriye Gore Listeleme

```text
books
  where status == "published"
  where category == "Ders Notu"
  orderBy publishedAt desc
  limit 20
```

### Basit Arama

Firestore tam metin arama icin ideal degil. MVP icin iki kademeli arama:

1. Ekranda yuklu 20 kitap icinde client-side arama.
2. Sonuc yoksa `keywords` ile sinirli sorgu:

```text
books
  where status == "published"
  where keywords array-contains "nutuk"
  limit 10
```

## Gerekebilecek Composite Indexler

Firestore hata mesajindan otomatik link verebilir, ama beklenen indexler:

| Koleksiyon | Alanlar | Kullanim |
| --- | --- | --- |
| `books` | `status ASC`, `publishedAt DESC` | Blind Mode ilk liste |
| `books` | `status ASC`, `category ASC`, `publishedAt DESC` | Kategori filtresi |
| `chapters` | `bookId ASC`, `status ASC`, `order ASC` | Kitap bolumleri |
| `book_text_chunks` | `bookId ASC`, `order ASC` | PDF/metin okuma |
| `playback_progress` | `uid ASC`, `updatedAt DESC` | Son dinlenenler |

## Security Rules Taslagi

10 Mayis 2026 guncellemesi: Uygulanabilir Firestore rules dosyasi repo kokune `firestore.rules` olarak eklendi. Firebase Console > Firestore Database > Rules ekranina bu dosya icerigi yapistirilip publish edilebilir.

Ana kararlar:

- Admin rolu `users/{uid}.role == "admin"` ile belirlenir.
- Kullanici kendi `users/{uid}` profilini okuyup guncelleyebilir, ama kendi rolunu degistiremez.
- Yeni kayit olan kullanici sadece `volunteer` veya `blind_user` roluyle profil olusturabilir.
- Admin tum kitap, bolum, metin parcasi ve config kayitlarini yonetebilir.
- Gonullu kendi yukledigi kitaplari ve ilgili bolum/metin parcalarini gorebilir.
- Dinleyici/public taraf sadece `published` kitap, bolum ve metin parcalarini okuyabilir.
- `app_config/public` herkes tarafindan okunabilir; `app_config/tts` sadece admin tarafindan okunup yazilabilir.

Ilk admin atama:

1. Firebase Console > Firestore Database > `users` koleksiyonuna gir.
2. Admin yapmak istedigin kullanicinin UID dokumanini ac.
3. `role` alanini `admin` yap.
4. Kullanici cikis-giris yaptiginda `/admin/qc` ve `/admin/tts` ekranlarini gorebilir.

Eski karar taslagi:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function isAdmin() {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) || isAdmin();
    }

    match /books/{bookId} {
      allow read: if resource.data.status == "published" || isAdmin();
      allow create: if signedIn();
      allow update: if isAdmin() || resource.data.createdBy == request.auth.uid;
    }

    match /chapters/{chapterId} {
      allow read: if resource.data.status == "published" || isAdmin();
      allow create: if signedIn();
      allow update: if isAdmin() || resource.data.recordedBy == request.auth.uid;
    }

    match /book_text_chunks/{chunkId} {
      allow read: if true;
      allow create: if signedIn();
      allow update: if isAdmin();
    }

    match /playback_progress/{progressId} {
      allow read, write: if signedIn() && request.resource.data.uid == request.auth.uid;
    }

    match /favorites/{favoriteId} {
      allow read, write: if signedIn() && request.resource.data.uid == request.auth.uid;
    }

    match /app_config/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

## Faz 2 Uygulama Sirasi

1. Client icinde `services/libraryService.js` olustur.
2. `books` icin normalize helper ekle: `titleLower`, `authorLower`, `keywords`.
3. PDF yukleme icin `documentService.js` olustur.
4. PDF metin cikarma ve chunk olusturma akisini ekle.
5. `BookManagement.jsx` upload kaydini yeni semaya uyumlu hale getir.
6. Blind Mode icin `getPublishedBooks()` ekle.
7. Kitap secilince `getPublishedChapters(bookId)` veya `getBookTextChunks(bookId)` cagir.
8. Firestore hata durumunda mock fallback'i koru.
9. `app_config/public` yoksa client default ayarlari kullansin.

## MVP Icin Bilerek Ertelenenler

- Tam metin arama servisi.
- Cloud Function ile otomatik duration hesaplama.
- AI ses kalite analizi.
- Otomatik transkript.
- Detayli analytics dashboard.
- Offline IndexedDB senkronizasyonu.

Bu ertelemeler maliyet ve karmasiklik yuzunden bilincli karardir.
