# 17. Duyum ElevenLabs Hibrit TTS Raporu

Bu rapor, Duyum icinde ElevenLabs'in en dusuk maliyetle nerelerde kullanilmasi gerektigini ve mevcut kod tabaninda hangi adimlarla entegre edilebilecegini tarif eder.

## Kisa Karar

ElevenLabs ana okuma motoru olmamali. Duyum icin en mantikli model:

```text
Varsayilan: Web Speech API
Premium: Admin onayli, cache'lenmis ElevenLabs MP3
Fallback: Premium ses yoksa Web Speech API
```

Sebep: Projenin ana hedefi ucretsiz/ucuz kalmak. Uzun PDF kitaplari her kullanici dinlediginde ElevenLabs ile okutmak maliyeti patlatir. ElevenLabs sadece tek sefer uretilip depolanan, cok dinlenecek veya kalite etkisi yuksek parcalarda kullanilmali.

## Mevcut Durum

Hazir olanlar:

- `docs/15_Hibrit_TTS_ElevenLabs_Plani.md` hibrit karari dogru sekilde tarif ediyor.
- `client/src/pages/AdminTtsSettings.jsx` admin tarafinda mod, limit, model, voice id ve cache zorunlulugu ayarlarini tutuyor.
- `client/src/services/ttsConfigService.js` `app_config/tts` dokumanini okuyup yazabiliyor.
- `client/src/pages/AdminQcPanel.jsx` kitap bazinda `premiumTts` durumunu gosteriyor.
- `client/src/pages/BlindMode.jsx` Web Speech ile PDF/metin chunk okuyor ve ses dosyasi varsa `audio_file` modunda oynatiyor.
- `client/src/services/libraryService.js` kitap, chapter ve text chunk semasini ElevenLabs ses URL'lerine uygun genisletilebilir sekilde tutuyor.

Eksik olanlar:

- ElevenLabs API key icin backend/proxy yok.
- Metin -> MP3 uretip depoya yazan is yok.
- Uretilen premium audio'yu `chapters.audio` altina baglayan servis yok.
- `tts_cache` benzeri hash tabanli tekrar kullanma sistemi yok.
- Premium uretim icin admin aksiyon butonu henuz gercek is baslatmiyor.

## Guncel Maliyet Mantigi

ElevenLabs resmi fiyat sayfasinda 11 Mayis 2026 itibariyla Free plan 10k kredi/ay, Starter 30k kredi/ay, Creator 121k kredi/ay, Pro 600k kredi/ay gorunuyor. Starter aylik 6 USD gorunuyor.

ElevenLabs dokumanlarina gore:

- Multilingual v2 gibi kalite odakli modellerde 1 text karakteri yaklasik 1 kredi tuketir.
- Flash/Turbo ailesinde maliyet daha dusuktur; Flash/Turbo modelleri 1 kredi ile 2 karakter uretebilir veya modele/plana gore karakter basina indirimli kredi tuketir.
- Flash v2.5 Turkce dahil 32 dili destekler, 40k karakterlik tek istek limitine sahiptir ve maliyet odakli senaryolarda daha mantiklidir.
- Multilingual v2 Turkce destekler, daha dogal ve stabil uzun-form kalite verir ama daha pahali taraftadir.

Pratik hesap:

```text
10.000 kredi:
- Multilingual v2 ile yaklasik 10.000 karakter
- Flash v2.5 ile yaklasik 20.000 karakter seviyesinde kullanim
```

Bir kitap/duyuru ortalama karakter hesabi:

```text
Kisa duyuru: 500-1.500 karakter
Ders duyurusu veya ozet: 1.500-4.000 karakter
Kisa ders notu bolumu: 5.000-15.000 karakter
Tam kitap: 200.000+ karakter
```

Sonuc: Free/Starter seviyesinde tam kitap seslendirmek mantikli degil. Kisa ve tekrar dinlenen bolumleri premium yapmak mantikli.

## Nerelerde Kullanalim?

### 1. Acilis ve Yonlendirme Metinleri

Oncelik: Yuksek

Blind Mode acilista, hata durumlarinda ve kritik komut cevaplarinda kullanici guveni cok onemli. Ancak bu metinler kisa ve sabit oldugu icin bir kez uretilip uygulama asset'i veya storage URL'i olarak cache'lenebilir.

Ornekler:

- "Duyum dinleme moduna hos geldiniz..."
- "Komut anlasilmadi, lutfen tekrar deneyin."
- "Kitap bulundu, dinlemek icin dinle komutunu verin."
- "Duyurular modu acildi."

Neden mantikli:

- Cok az kredi yer.
- Kullanici ilk izlenimini ciddi sekilde iyilestirir.
- Aynisi tekrar tekrar kullanilir, cache verimi cok yuksektir.

Model onerisi: `eleven_flash_v2_5`

### 2. GTU Duyurulari ve Bolum Duyurulari

Oncelik: Yuksek

Duyurular kisa, pratik ve ogrenci icin kritik. Web Speech burada calisir ama dogal ses farki kullanici deneyimini ciddi iyilestirir.

Kural:

- Sadece yayinlanmis ve temiz metinli duyurular.
- Her duyuru icin `sourceHash` veya text hash ile cache.
- Guncellenmeyen duyurular tekrar uretilmez.
- 2.000-3.000 karakter ustu duyurularda once admin onayi.

Model onerisi:

- Varsayilan: `eleven_flash_v2_5`
- Telefon, tarih, saat, sinav salonu gibi sayi yogun duyurularda metin on-normalizasyonu sart.

### 3. Admin Onayli Ders Notu Ozetleri

Oncelik: Orta-Yuksek

Tam PDF ders notunu ElevenLabs ile okutmak yerine, adminin onayladigi kisa "bolum girisi" veya "ders ozeti" uretilebilir.

Ornek:

- "Bu ders notunda limit ve sureklilik konusu anlatiliyor..."
- "Bu bolumde dikkat etmeniz gereken basliklar..."

Neden mantikli:

- Akademik PDF'lerde Web Speech uzun okumada yeterli olabilir.
- Premium ses kisa girislerde kalite ve yon bulma etkisi yaratir.
- Maliyet sinirli kalir.

Model onerisi: `eleven_flash_v2_5`; cok kaliteli tanitim/paragraf icin `eleven_multilingual_v2`.

### 4. Cok Dinlenen Kitaplarin Ilk 5-10 Dakikasi

Oncelik: Orta

Populer icerikte tamamen premium kitap yerine "ilk bolum/ilk 5 dakika premium" modeli olabilir. Kalan kisim Web Speech ile devam eder.

Neden mantikli:

- Kullanici kitaba guzel bir giris yapar.
- Tam kitap maliyetinden kacinilir.
- Ileride bagis/sponsor olursa kitabin devami da premium'a alinabilir.

Kural:

- Sadece admin karar verir.
- `listening_events` veya manuel populerlik sinyali geldikten sonra yapilir.
- Kitap basina premium limit 5.000-10.000 karakteri gecmez.

### 5. Gönüllü Kalite Kontrol Notlari

Oncelik: Dusuk-Orta

Admin notlarinin sesli okunmasi gonullu paneli icin gerekli degil, ama erisilebilir admin/gonullu deneyimi istenirse kisa notlarda kullanilabilir. MVP icin bekleyebilir.

## Nerelerde Kullanmayalim?

### Tam PDF Kitaplari Otomatik MP3'e Cevirmeyelim

Bu en pahali yol. Bir PDF kitap 200k-500k karakter olabilir. Free/Starter/Creator kotasini tek kitapta bitirebilir. Ayrica depolama maliyeti de dogurur.

### Her Dinlemede API Cagirmayalim

Kesinlikle yapilmamali. ElevenLabs sadece uretim aninda cagrilir, sonuc MP3 olarak saklanir. Dinleyici her zaman depolanmis audio URL'i oynatir.

### Client Tarafina API Key Koymayalim

API key asla React bundle icinde olmamali. Backend/proxy veya Cloud Function gerekir. Aksi halde key herkes tarafindan gorulebilir.

### Sesli Komut Tanima Icin ElevenLabs Kullanmayalim

Projede sesli komut Web Speech Recognition ile devam etmeli. ElevenLabs Scribe kaliteli olabilir ama bu projenin butce hedefi icin gereksiz maliyet ve ek karmasiklik getirir.

## Onerilen Teknik Mimari

```text
Admin premium uretim ister
  -> Backend/proxy tts job olusturur
  -> Metin normalize edilir
  -> Hash hesaplanir
  -> tts_cache kontrol edilir
  -> Cache varsa audio URL kullanilir
  -> Cache yoksa ElevenLabs cagrilir
  -> MP3 storage'a yazilir
  -> chapters.audio veya announcement.audio guncellenir
  -> books.premiumTts.status = ready
```

Yeni koleksiyon onerisi:

```js
tts_cache/{hash} {
  textHash: string,
  textPreview: string,
  language: "tr-TR",
  model: "eleven_flash_v2_5",
  voiceId: string,
  charCount: number,
  creditEstimate: number,
  audio: {
    provider: "firebase_storage" | "cloudinary",
    url: string,
    publicId: string,
    format: "audio/mpeg",
    bytes: number
  },
  createdAt: timestamp,
  createdBy: uid
}
```

Kitap icin ek alan:

```js
premiumTts: {
  status: "not_requested" | "planned" | "generating" | "ready" | "failed",
  engine: "elevenlabs",
  model: "eleven_flash_v2_5",
  voiceId: string,
  charCount: number,
  creditEstimate: number,
  audioUrl: string,
  generatedAt: timestamp
}
```

Duyuru icin ek alan:

```js
audio: {
  provider: "elevenlabs",
  url: string,
  summaryUrl: string,
  detailUrl: string,
  textHash: string,
  model: "eleven_flash_v2_5",
  charCount: number
}
```

11 Mayis 2026 uygulama notu:

- `client/src/services/cachedSpeechService.js` eklendi.
- Blind Mode artik sabit menu prompt'lari icin `promptId -> cached audio URL` bakiyor.
- Duyurularda `announcement.audio.summaryUrl`, `announcement.audio.detailUrl` veya `announcement.audio.url` varsa once bu MP3 oynatiliyor.
- Cache URL yoksa mevcut Web Speech fallback aynen devam ediyor.
- Bu sayede ElevenLabs uretimi backend hazir olunca sadece URL alanlarini dolduracak; dinleyici tarafinda tekrar API cagrisi olmayacak.

## Kredi Kontrol Kurallari

Baslangic limiti:

```js
monthlyCreditLimit: 30000
maxCharsPerRequest: 3000
maxCharsPerBook: 10000
maxCharsPerAnnouncement: 2500
requireAdminApproval: true
cacheRequired: true
```

Uretimden once:

1. `elevenLabsEnabled` true mu?
2. Kullanici admin mi?
3. Metin bos mu?
4. Metin karakteri limit icinde mi?
5. Aylik tahmini kredi limiti asiliyor mu?
6. Ayni text hash daha once uretilmis mi?
7. Storage/proxy saglikli mi?

## Model Secimi

Varsayilan:

```text
eleven_flash_v2_5
```

Sebep: Turkce destekli, dusuk gecikmeli, daha ucuz, kisa yonlendirme ve duyuru icin yeterli.

Kalite gereken secili icerik:

```text
eleven_multilingual_v2
```

Sebep: Daha dogal, uzun-form kalite daha iyi. Sadece sponsorlu/secili bolumlerde kullanilmali.

Kacinalim:

```text
eleven_v3
```

Sebep: Cok kaliteli olabilir ama bu proje icin ilk entegrasyonda pahali ve gereksiz karmasik.

## Uygulama Sirasi

1. Admin TTS ayarlarinda model varsayilanini `eleven_flash_v2_5` yap.
2. `monthlyCreditLimit`, `maxCharsPerRequest`, `maxCharsPerBook` icin daha gercekci baslangic limitleri koy.
3. Firestore semasina `tts_cache` ve `premiumTts.generating` durumunu ekle.
4. Admin QC paneline "Premium ses planla" butonu ekle; ilk etapta sadece `planned` yazsin.
5. Backend/proxy secimi yap: Firebase Functions, Vercel Function veya Cloudflare Worker.
6. ElevenLabs key'i backend ortam degiskenine koy.
7. Ilk gercek uretimi sadece sabit acilis/yonlendirme metinleri icin yap.
8. Sonra GTU duyurulari icin hash tabanli uretim ekle.
9. En son admin onayli PDF bolum girisleri veya populer kitap ilk bolumu ekle.

## Son Tavsiye

Duyum icin ElevenLabs'i "premium ses katmani" olarak konumlandiralim. Ana urun ucretsiz Web Speech ile calismaya devam etsin; ElevenLabs ise kisa, onayli, cache'li ve tekrar dinlenecek metinlere kalite versin. Bu yaklasim hem juri/sunum tarafinda profesyonel durur hem de ogrenci butcesini korur.

## Deploy Durumu - 11 Mayis 2026

Yapilanlar:

- Firebase CLI proje icine dev dependency olarak eklendi.
- `.firebaserc` default proje id'si gercek client projesi olan `gtu-echovoices` olarak dogrulandi.
- Firestore rules `gtu-echovoices` projesine deploy edildi.
- Storage rules `gtu-echovoices` projesine deploy edildi.
- Functions deploy on kontrolunde gerekli Google Cloud API'leri acilmaya baslandi.
- Functions runtime `node: 22` olarak guncellendi.
- `firebase-functions` ve `firebase-admin` paketleri guncellendi.

Blokajlar:

- Functions deploy oncesi `ELEVENLABS_API_KEY` secret'i tanimlanmali. Bos secret denemesi `Secret Payload cannot be empty` hatasi verdi.
- Functions deploy su anda `Cloud Secret Manager has no latest version of the secret defined by param ELEVENLABS_API_KEY` noktasinda duruyor.
- Functions kullanimi icin Firebase projesinde billing/Blaze durumu ve budget alert kontrol edilmeli.

Siradaki komutlar:

```bash
firebase functions:secrets:set ELEVENLABS_API_KEY
firebase deploy --only functions
```

Guvenlik notu:

- ElevenLabs API key asla `.env`, frontend kodu veya Firestore dokumanina yazilmayacak.
- Secret sadece Firebase Functions ortaminda okunacak.
