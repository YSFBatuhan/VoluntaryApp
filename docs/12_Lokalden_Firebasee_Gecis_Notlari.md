# 12. Lokalden Firebase'e Gecis Notlari

Bu dokuman, projede su anda lokal veya statik dosya olarak duran verilerin Firebase'e gecince nasil konumlanacagini aciklar. Amac, MVP hizini kaybetmeden ilerlemek ama final mimaride veriyi kullanici cihazina veya kod icine gomulu birakmamaktir.

## Temel Karar

Su anda lokal duran her sey kalici mimaride Firebase tarafina tasinacaktir.

Lokal dosyalar ve localStorage MVP icin gelistirme hizlandirici ve fallback katmanidir. Nihai akis:

```text
Firebase Auth
Firebase Firestore
Firebase Storage
Cloud Function veya admin/import script
Client uygulamasi
```

Client uygulamasi mumkun oldugunca Firestore'dan okur, Storage'dan dosya alir ve kullaniciya ait ilerlemeyi Firestore'a yazar.

## Lokal Kalan Seyler Ne Olacak?

### GTU Duyurulari

Mevcut durum:

- `client/src/data/generatedGtuAnnouncements.js` dosyasinda import edilmis duyurular var.
- `client/scripts/fetch-gtu-announcements.mjs` GTU sitesinden veri cekiyor.
- Blind Mode bu veriyi okuyabiliyor.

Firebase sonrasi hedef:

- Duyurular Firestore `announcements` koleksiyonunda tutulacak.
- Import script'i duyurulari dosyaya yazmak yerine Firestore'a yazabilecek.
- `generatedGtuAnnouncements.js` sadece fallback/demo verisi olarak kalacak.
- Admin panelinden veya planli bir isten import tetiklenebilecek.

### PDF Kitap Metinleri

Mevcut durum:

- PDF yuklenince metin client tarafinda cikariliyor.
- Metin parcalari `book_text_chunks` mantigiyla kullaniliyor.
- Okuma akisinda Web Speech API ile seslendiriliyor.

Firebase sonrasi hedef:

- PDF dosyasinin kendisi Firebase Storage'da tutulacak.
- Kitap metadata'si Firestore `books` koleksiyonunda tutulacak.
- Cikarilan metin parcalari Firestore `book_text_chunks` koleksiyonunda tutulacak.
- Kitabin yayinlanabilmesi icin admin/QC onayi gerekecek.

### Okuma Ilerlemesi ve Yer Imi

Mevcut durum:

- Kaldigi yer gibi bilgiler localStorage tarafinda tutulabiliyor.

Firebase sonrasi hedef:

- Kullanici bazli ilerleme Firestore `reading_progress` koleksiyonunda tutulacak.
- Alanlar: `userId`, `bookId`, `chunkIndex`, `pageNumber`, `updatedAt`.
- localStorage sadece offline/fallback amacli kullanilabilir.

### Kullanici ve Roller

Mevcut durum:

- Firebase Auth baglantisi var.
- Gonullu giris/kayit akisi bulunuyor.

Firebase sonrasi hedef:

- Firestore `users` koleksiyonunda kullanici profili tutulacak.
- Roller: `volunteer`, `admin`, `listener`.
- Admin/QC paneli sadece admin rolune acik olacak.

### Admin/QC Paneli

Mevcut durum:

- Henuz panel yok.

Firebase sonrasi hedef:

- Admin, yuklenen kitaplari `pending_review` durumunda gorecek.
- Kitap metninden ornek parcalar incelenecek.
- Admin `approved`, `rejected`, `needs_fix` durumuna alabilecek.
- Reddedilirse veya duzeltme istenirse `reviewNote` yazilacak.

### ElevenLabs

Mevcut durum:

- Ana okuma motoru Web Speech API.
- ElevenLabs henuz zorunlu degil.

Firebase sonrasi hedef:

- ElevenLabs client tarafindan direkt cagrilmayacak.
- API anahtari client koduna konmayacak.
- Gerekirse Cloud Function uzerinden cagrilacak.
- Uretilen ses dosyalari Storage'da cache'lenecek.
- Ayni metin icin tekrar ucretli istek atilmayacak.

## Fallback Mantigi

Firebase gecisinde uygulama tamamen kirilmamali. Bu yuzden gecici fallback sirasi:

1. Firestore verisi varsa onu kullan.
2. Firestore bos veya erisilemiyorsa generated/static veriyi kullan.
3. Kullaniciya veri bulunamadiysa bunu sesli ve yazili olarak bildir.

Bu fallback kalici ana mimari degil, demo ve gelistirme guvenligi icindir.

## Son Hedef

Final mimaride:

- Duyurular kod icinden degil Firestore'dan gelir.
- Kitaplar local dosyadan degil Storage + Firestore'dan gelir.
- Kullanici ilerlemesi localStorage'da kaybolmaz, Firestore'da kullaniciya bagli tutulur.
- Admin onayi olmayan kitap gorme engelli kullanicinin kitapligina dusmez.
- Ucretli servisler sadece cache'li ve kontrollu calisir.

