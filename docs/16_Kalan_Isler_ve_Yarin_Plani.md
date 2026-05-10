# 16. Kalan Isler ve Yarin Plani

Bu dokuman 8 Mayis 2026 sonunda projenin kalan islerini ve yarin devam ederken izlenecek oncelik sirasini tutar.

## Genel Durum

Proje artik temel MVP omurgasina sahip:

- Gonullu giris/kayit akisi var.
- Gonullu paneli ve kitap yonetimi var.
- PDF yukleme ve metin cikarma akisi var.
- Admin kalite kontrol paneli var.
- Admin TTS ayarlari ve hibrit ElevenLabs plani var.
- Blind Mode icinde PDF/TTS okuma, komut verme, sayfa gezme ve duyuru modu var.
- Firebase Auth ve Firestore baglantisi var.

Kalan islerin odagi yeni ozellik eklemekten cok, mevcut akisi guvenli, test edilmis ve demo edilebilir hale getirmektir.

## Yarin Icin Oncelik Sirasi

### 1. Firestore Security Rules

En kritik teknik borc budur.

Yapilacaklar:

- [ ] `users` koleksiyonunda kullanici sadece kendi profilini okuyup guncelleyebilsin.
- [ ] Admin kullanici tum gerekli koleksiyonlari okuyup guncelleyebilsin.
- [ ] Gonullu sadece kendi yukledigi kitaplari gorebilsin.
- [ ] Dinleyici veya public taraf sadece `published` kitaplari gorebilsin.
- [ ] `book_text_chunks` sadece yayindaki kitaplar veya admin tarafindan okunabilsin.
- [ ] `app_config/tts` sadece admin tarafindan yazilabilsin.
- [ ] Firestore rules taslagi dokumana eklensin.
- [ ] Rules test senaryolari yazilsin.

Tahmini dosyalar:

- `docs/09_Faz2_Database_Semasi.md`
- yeni `firestore.rules` veya dokuman taslagi

### 2. Admin Rol Yonetimi

Admin akisi var ama admin rolunun nasil verilecegi netlesmeli.

Yapilacaklar:

- [ ] Ilk admin nasil atanacak karar ver.
- [ ] Manuel Firebase Console yontemi dokumante edilsin.
- [ ] Gerekirse basit admin seed/script plani yazilsin.
- [ ] Admin olmayan kullanicinin `/admin/qc` ve `/admin/tts` ekranlarina giremedigi test edilsin.

Karar secenekleri:

- Firebase Console uzerinden `users/{uid}.role = "admin"` atamak.
- Lokal seed script ile ilk admini atamak.
- Ileride admin panelden rol yonetimi yapmak.

### 3. PDF/TTS Uctan Uca Demo Testi

Ana MVP akisi budur.

Test senaryosu:

- [ ] Gonullu olarak giris yap.
- [ ] Secilebilir metinli PDF yukle.
- [ ] PDF metin onizlemesini kontrol et.
- [ ] Kitap `pending` olarak Admin QC paneline dussun.
- [ ] Admin olarak giris yap.
- [ ] Admin metin onizlemesini incelesin.
- [ ] Admin kitabi `Yayinla` yapsin.
- [ ] Blind Mode acilsin.
- [ ] Kitap kutuphanede gorunsun.
- [ ] `Dinle`, `duraklat`, `sonraki sayfa`, `onceki sayfa` komutlari test edilsin.

Beklenen sonuc:

- Demo sirasinda hicbir Storage/Cloudinary/ElevenLabs karari gerekli olmadan calisan ana akis gosterilebilir.

### 4. Reading Progress Firestore'a Tasima

Su an yer imi/localStorage agirlikli calisiyor. Kalici ve cihazlar arasi deneyim icin Firestore'a alinmali.

Yapilacaklar:

- [ ] `reading_progress` koleksiyon modeli netlestir.
- [ ] `userId_bookId` dokuman id modeli dusun.
- [ ] Son chunk index, sayfa, tarih ve kitap bilgisi tutulacak.
- [ ] Blind Mode `kaldigim yeri isaretle` komutu Firestore'a yazsin.
- [ ] `kaldigim yerden devam et` Firestore'dan okusun.
- [ ] localStorage fallback olarak kalsin.

Onerilen model:

```js
{
  userId: "uid",
  bookId: "bookId",
  chunkIndex: 3,
  pageStart: 12,
  updatedAt: serverTimestamp()
}
```

### 5. Blind Mode Kalite Iyilestirmeleri

Gorme engelli kullanici icin ana deneyim burada.

Yapilacaklar:

- [ ] Okuma hizi ayari ekle.
- [ ] Ses secimi veya tarayici voice secimi dusun.
- [ ] Komut yardim metinlerini daha dogal Turkceye cek.
- [ ] Hata mesajlarini teknik olmayan dile cevir.
- [ ] Mobil ve klavye testleri yap.
- [ ] Ekran okuyucu etiketlerini gozden gecir.

### 6. UI ve Turkce Karakter Temizligi

Bazi dosyalarda terminal ciktilarinda mojibake gorunuyor. Tarayicida her sey duzgun olabilir ama kaynak dosyalar kontrol edilmeli.

Yapilacaklar:

- [ ] Sidebar, Dashboard, Admin QC, Recording Studio dosyalarinda Turkce karakterleri kontrol et.
- [ ] Tarayicida gorunen tum metinleri gez.
- [ ] Acemice veya teknik duran metinleri sadeleştir.
- [ ] Bos state, loading state ve error state'leri tutarli hale getir.
- [ ] Mobil responsive kontrol yap.

### 7. GTU Duyurulari Akisi

Duyuru modu var, ama import/otomasyon urunlesmedi.

Yapilacaklar:

- [ ] GTU duyuru import script'i tekrar calistirilabilir mi kontrol et.
- [ ] Firestore'a duyuru yazma karari ver.
- [ ] Admin panelinden duyuru yenileme butonu dusun.
- [ ] Duyuru kaynak linkleri ve tarih bilgileri iyilestir.
- [ ] Blind Mode duyuru komutlarini test et.

### 8. Storage ve ElevenLabs Gercek Entegrasyon Karari

Bugun sadece temelini kurduk. Gercek premium ses icin daha sonra karar gerekecek.

Yapilacaklar:

- [ ] Firebase Storage + Blaze mi, Cloudinary mi, baska depolama mi karar ver.
- [ ] ElevenLabs API key client'a konulmayacak; backend/proxy gerekecek.
- [ ] Premium TTS uretim kuyruğu tasarlanacak.
- [ ] Uretilen MP3 cache edilmeden uzun kitaplarda ElevenLabs kullanilmayacak.
- [ ] Admin TTS ayarlari gercek backend tarafina baglanacak.

### 9. Deploy ve Calistirma Dokumani

Projeyi baskasi calistiracaksa net dokuman gerekir.

Yapilacaklar:

- [ ] `.env.example` hazirla.
- [ ] Firebase proje kurulum adimlarini yaz.
- [ ] Admin yapma adimini yaz.
- [ ] Lokal calistirma komutlarini yaz.
- [ ] Vercel deploy notlarini yaz.
- [ ] Bilinen limitleri yaz: Storage bekliyor, OCR yok, ElevenLabs gercek uretim yok.

### 10. Son Demo Verisi

Demo icin temiz veri gerekir.

Yapilacaklar:

- [ ] Kisa ve secilebilir metinli 1-2 PDF sec.
- [ ] Bir gonullu kullanici ile yukle.
- [ ] Bir admin kullanici ile onayla.
- [ ] Blind Mode'da okunabilir hale getir.
- [ ] Gerekirse demo metinlerini ve kitap adlarini sadeleştir.

## Yarin Baslama Onerisi

Yarin su sirayla baslamak en mantiklisi:

1. Firestore Security Rules taslagi.
2. Admin rol atama dokumani veya seed plani.
3. PDF/TTS uctan uca demo testi.
4. Reading progress'i Firestore'a alma.
5. UI/Turkce karakter ve mobil cila.

## Ertelenenler

Su isler hemen yapilmayacak:

- Firebase Storage Blaze acmak.
- ElevenLabs gercek API entegrasyonu.
- OCR ile taranmis PDF okuma.
- Premium MP3 cache sistemi.
- Tam rol yonetim paneli.

Bu isler ana MVP saglamlastiktan sonra ele alinacak.
