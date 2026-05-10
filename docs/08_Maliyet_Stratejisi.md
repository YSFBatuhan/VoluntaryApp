# 8. Sifir Maliyet Stratejisi

Bu projenin temel kisiti ogrenci butcesidir. Bu nedenle MVP ve beta sureci boyunca kredi karti isteyen, kullandikca ucret yazabilen veya ucretsiz kotasi kolayca asilan servisler zorunlu bagimlilik haline getirilmeyecektir.

## Ana Ilke

GTU EchoVoices once tamamen calisan, dusuk trafikte ucretsiz kalabilen ve gerektiğinde servis degistirebilen bir mimariyle kurulacaktir.

## Ucretsiz Kalacak Servisler

| Ihtiyac | Tercih | Kural |
| --- | --- | --- |
| Hosting | Vercel Hobby | Sadece statik React build yayinlanacak. Serverless function zorunlu olmadikca kullanilmayacak. |
| Kimlik dogrulama | Firebase Auth Spark | E-posta/sifre veya Google girisi. Telefon/SMS dogrulama kullanilmayacak. |
| Veritabani | Firestore Spark | Tek ucretsiz database, kontrollu read/write, realtime listener minimum. |
| Sesli okuma | Web Speech API | Tarayicinin SpeechSynthesis destegi ana TTS motoru olacak. |
| Sesli komut | Web Speech API | SpeechRecognition desteklenirse kullanilacak, desteklenmezse buyuk buton/yazili arama fallback olacak. |
| Ses depolama | Beklemede | Firebase Storage Blaze plan istedigi icin MP3/ses upload MVP ana akisi disina alindi. |
| PDF okuma | Browser-side PDF text extraction | Sunucu/OCR/AI kullanmadan secilebilir metinli PDF'ler islenecek. |

## Bilerek Kacinilacaklar

- ElevenLabs veya benzeri ucretli TTS servisleri MVP icin kullanilmayacak.
- Firebase Cloud Functions kullanilmayacak.
- Firebase Storage Blaze plana gecmeden zorunlu tutulmayacak.
- Otomatik video/ses donusturme, arka plan isleme veya AI analizleri MVP kapsaminda olmayacak.
- OCR ile taranmis PDF okuma MVP kapsaminda olmayacak.
- PDF'leri otomatik MP3'e cevirip depolama MVP kapsaminda olmayacak.
- Buyuk ses dosyalari kontrolsuz yuklenmeyecek; depolama karari verilene kadar canli ses upload kapali kalacak.
- Firestore'da surekli acik realtime listener sadece gercek ihtiyac varsa kullanilacak.

## Kota Koruma Kurallari

1. Dinleyici tarafinda once local/mock veriyle deneyim kanitlanacak.
2. Firestore baglandiginda kitap listeleri sayfali cekilecek.
3. Arama icin `titleLower`, `authorLower` ve `keywords` gibi hazir alanlar tutulacak.
4. Sik kullanilan statik metinler uygulama icinde tutulacak; TTS icin dis API cagrisi yapilmayacak.
5. Ses yukleme ozelligi depolama karari verilene kadar kontrollu bekleme mesajina baglanacak.
6. PDF yuklemede dosya boyutu limiti baslangicta 20 MB olacak.
7. PDF metni Firestore'a chunk'lar halinde yazilacak, tum kitap tek dokumanda tutulmayacak.
8. Beta oncesi Firebase Storage, Cloudinary veya alternatif depolama secenekleri maliyet/kota olarak tekrar karsilastirilacak.

## Faz 0 Cikis Kriteri

- Projede ucretli servis zorunlulugu yok.
- Yeni gelistirilecek ozelliklerin maliyet etkisi dokumanda gorunur.
- Blind Mode MVP servis bagimliligi olmadan calisir.
- Ucretli bir servis gerekirse once alternatifleri ve riskleri yazilir, sonra karar verilir.
