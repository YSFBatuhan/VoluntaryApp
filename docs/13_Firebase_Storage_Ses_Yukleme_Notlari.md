# Firebase Storage Ses Yukleme Notlari

8 Mayis 2026 karari: Firebase Storage yeni bucket icin Blaze plan istedigi icin canli ses yukleme MVP ana akisi disina alindi.

10 Mayis 2026 guncellemesi: Proje Blaze plana alindiktan sonra ses yukleme kontrollu sekilde tekrar acildi. Ucretsiz kotayi korumak icin ilk MVP limiti tek ses dosyasi basina 25 MB olarak belirlendi.

Bu dokuman, daha sonra Firebase Storage acilmak istenirse uygulanacak teknik notlari tutar. Uygulama ekranlari su an ses yuklemeyi "depolama karari bekliyor" mesajiyla kontrollu sekilde durdurur.

## Uygulama Tarafi

- Firebase bucket olusturulursa `.env` icindeki `VITE_FIREBASE_STORAGE_BUCKET` degeriyle kullanilir.
- Dosyalar `audio_uploads/{uid}/{timestamp}-{fileName}` yoluna yuklenir.
- Firestore `chapters.audio.provider` degeri `firebase_storage` olarak kaydedilir.
- Firestore `chapters.audio.url` alaninda Firebase download URL tutulur.
- Frontend ve Storage Rules tek dosya icin 25 MB limit uygular.
- PDF/TTS akisi hala ana ve en ucuz MVP yoludur; ses yukleme kontrollu yan akistir.

## Minimum Storage Rules

Baslangic MVP icin repo kokundeki `storage.rules` dosyasi kullanilir:

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /audio_uploads/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == userId
        && request.resource.size <= 25 * 1024 * 1024
        && request.resource.contentType.matches('audio/(mpeg|mp3|mp4|aac|webm|ogg|wav|x-wav)');
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Not: `read: if true` yayinlanan sesleri dinleyici tarafinda kolay oynatmak icin aciktir. Daha siki modelde sadece `published` kitaplara okuma izni vermek icin download URL yerine Cloud Function veya kontrollu proxy gerekir.

## Kota Koruma Kararlari

- Tek dosya limiti: 25 MB.
- Onerilen format: MP3, M4A veya WebM.
- WAV kabul edilir ama buyuk dosya riski nedeniyle 25 MB ustu reddedilir.
- PDF limiti uygulama tarafinda 20 MB olarak kalir.
- Ses yukleme admin kalite kontrolune duser; otomatik yayin yoktur.
- ElevenLabs veya premium TTS ciktisi client tarafindan uretilmeyecek; ileride backend/proxy ve cache ile acilacak.
- Google Cloud Billing icinde 5-10 USD arasi butce alarmi kurulacak.

## Localhost CORS

Local gelistirme ortaminda `http://127.0.0.1:5173` adresinden upload yapabilmek icin bucket CORS ayari gerekir.

Repo kokunde `firebase-storage-cors.json` dosyasi bulunur. Google Cloud CLI kurulu ve yetkili hesaba giris yapilmisken:

```powershell
gcloud storage buckets update gs://gtu-echovoices.firebasestorage.app --cors-file=firebase-storage-cors.json
```

Kontrol etmek icin:

```powershell
gcloud storage buckets describe gs://gtu-echovoices.firebasestorage.app --format="default(cors_config)"
```
