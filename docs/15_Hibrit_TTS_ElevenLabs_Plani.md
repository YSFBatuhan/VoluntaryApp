# 15. Hibrit TTS ve ElevenLabs Plani

Bu dokuman, Web Speech API'nin kalite olarak yetersiz kaldigi yerlerde ElevenLabs'i kontrollu ve maliyet sinirli kullanmak icin hazirlanan plandir.

## Karar

Tamamen ElevenLabs'a gecilmeyecek. Hibrit model kullanilacak:

```text
Varsayilan okuma: Web Speech API
Premium okuma: Admin onayli ElevenLabs uretimi
Fallback: Web Speech API
```

Bu sayede uygulama ucretsiz calismaya devam eder; sadece secilen ve degerli bulunan icerikler icin premium ses uretilir.

## Neden Hibrit?

- Web Speech API ucretsizdir ama ses kalitesi tarayiciya ve cihaza gore degisir.
- ElevenLabs daha dogal ses verir ama kredi harcar.
- Uzun kitaplarda her dinleme icin tekrar ElevenLabs cagirmak maliyetlidir.
- Bu nedenle ElevenLabs ciktisi mutlaka cache/depolama ile birlikte dusunulmelidir.

## Bugun Kurulacak Temel

Bugun gercek API key veya ses uretimi yapilmayacak. Bunun yerine:

- Admin panelinde TTS ayarlari tutulacak.
- Firestore `app_config/tts` dokumani olusturulacak.
- Kitap bazinda premium TTS durumu gosterilecek.
- Premium uretim aksiyonu "backend/storage bekliyor" olarak planlanacak.

## Firestore Config Modeli

Dokuman yolu:

```text
app_config/tts
```

Onerilen alanlar:

```js
{
  mode: "hybrid", // web_speech | elevenlabs | hybrid
  elevenLabsEnabled: false,
  monthlyCreditLimit: 10000,
  usedCreditsEstimate: 0,
  maxCharsPerBook: 5000,
  maxCharsPerRequest: 1200,
  requireAdminApproval: true,
  cacheRequired: true,
  defaultVoiceId: "",
  defaultModel: "eleven_multilingual_v2",
  fallbackEngine: "web_speech",
  updatedAt: serverTimestamp(),
  updatedBy: "uid"
}
```

## Kitap Bazli Premium TTS Durumlari

Kitap dokumaninda ileride kullanilacak alan:

```js
premiumTts: {
  status: "not_requested", // not_requested | planned | blocked_storage | ready | failed
  engine: "elevenlabs",
  requestedBy: "uid",
  requestedAt: timestamp,
  note: "Storage acilinca uretilecek"
}
```

## Admin Kurallari

- Admin varsayilan modu secebilir.
- Admin aylik kredi limitini belirleyebilir.
- Admin kitap basina maksimum karakter siniri koyabilir.
- Premium TTS sadece admin karariyla planlanir.
- Storage/cache hazir olmadan uzun kitap icin ElevenLabs uretimi yapilmaz.

## Gercek Entegrasyon Icin Gerekenler

1. ElevenLabs API key client'a konulmayacak.
2. Backend/Cloud Function/proxy gerekir.
3. Uretilen MP3 dosyalari Storage veya alternatif obje depolamaya yazilacak.
4. Firestore'da `chapters.audio.url` premium audio URL ile guncellenecek.
5. Kredi kullanimi tahmini Firestore config'e yazilacak.

## MVP Davranisi

Bugunku MVP'de:

- Web Speech API calisir.
- ElevenLabs ayarlari admin panelinde gorunur.
- Premium TTS talebi kaydedilebilir veya "depolama/backend bekliyor" olarak gosterilebilir.
- Dinleyici tarafinda premium audio yoksa Web Speech fallback kullanilir.

## Kabul Kriterleri

- Admin `/admin/tts` ekranindan TTS ayarlarini gorebilir.
- Admin ayarlari Firestore'a kaydedebilir.
- Varsayilan mod, kredi limiti, kitap karakter limiti ve voice/model alanlari duzenlenebilir.
- QC ekraninda secili kitap icin premium TTS durumu gorunur.
- Gercek ElevenLabs API key client bundle icine girmez.
