# 14. 8 Mayis 2026 Bugun Yapilacaklar

Bu dokuman bugunku uygulama planidir. Amac, projeyi takildigi Firebase Storage/Blaze noktasindan kurtarip calisan, anlasilir ve demo edilebilir bir MVP akisini guclendirmektir.

Onemli not: Bu plan onay dokumanidir. Kullanici onayi gelmeden kod degisikligine baslanmayacak.

## Bugunku Ana Karar

Firebase Storage su an Blaze plan istedigi icin MP3/ses dosyasi yuklemeyi canli ana akis olmaktan cikariyoruz.

Bugun ana MVP akisi su olacak:

```text
Gonullu PDF yukler
-> Sistem PDF metnini tarayicida cikarir
-> Firestore'a kitap + metin parcalari kaydedilir
-> Admin kalite kontrol eder
-> Onaylanan kitap Blind Mode icinde Web Speech API ile okunur
```

Ses kaydi ve hazir MP3 yukleme tamamen silinmeyecek. Sadece "depolama ayari bekliyor" durumuna alinacak. Boylece kullanici teknik hata gormeyecek, proje de Storage karari yuzunden durmayacak.

## Bugunku Hedef

Bugun sonunda uygulamada su his olmasi gerekiyor:

- Gonullu ne yapacagini hemen anlasin.
- Ana yol PDF/TTS oldugu icin arayuz bunu one cikarsin.
- Ses yukleme denemesinde kirmizi teknik hata yerine kontrollu ve insani bir mesaj gorunsun.
- Admin paneli PDF kitaplari rahat inceleyebilsin.
- Blind Mode, yayindaki PDF kitaplari daha guvenilir okuyabilsin.
- Proje demo icin "daginik deneme" degil, bilincli MVP gibi dursun.

## Kapsam Ici

- PDF yukleme akisini ana aksiyon yapmak.
- Ses yukleme/kayit ekranlarini gecici olarak pasif veya bilgilendirici moda almak.
- Gonullu panelinde metinleri daha netlestirmek.
- Kitaplarim ekraninda durum takibini cilalamak.
- Admin kalite kontrol ekraninda PDF metin onizlemesini daha kullanisli yapmak.
- Blind Mode PDF/TTS okuma deneyimini guclendirmek.
- Roadmap ve maliyet dokumanlarini bugunku karara gore guncellemek.
- Lint/build dogrulamasi yapmak.

## Kapsam Disi

- Firebase Blaze plana gecmek.
- Firebase Storage bucket olusturmak.
- Cloudinary'ye geri donmek.
- OCR ile taranmis PDF okuma.
- ElevenLabs veya baska ucretli TTS entegrasyonu.
- Tam backend/Cloud Functions yazmak.

## Uygulama Sirasi

### 1. Storage Bekleyen Ses Akisini Kontrollu Hale Getir

Hedef: Kullanici MP3 yukleyince CORS, bucket, Blaze veya teknik servis hatasi gormesin.

Yapilacaklar:

- [x] `Yeni Yukle` ses formunda teknik hata yerine "Ses yukleme yakinda aktif olacak" mesajini goster.
- [x] MP3 dropzone aktif gorunuyorsa bile upload butonunu kontrollu pasif hale getir.
- [x] Kullaniciyi PDF akisine yonlendiren net buton/metin ekle.
- [x] `Kayit Studyosu` ekraninda mikrofon kaydi alinabilsin ama kalite kontrole gonderme butonu Storage kurulumu bekliyor mesajina baglansin.
- [x] Ses duzeltme yukleme alanini da ayni sekilde Storage karari bekliyor durumuna al.
- [x] Teknik Firebase Storage hatalarini kullaniciya ham sekilde gostermemek icin mesajlari sadeleştir.

Beklenen sonuc:

- Kullanici kirmizi "CORS" veya "Storage unauthorized" hatasi gormez.
- Ses ozelligi kaybolmus gibi degil, planli sekilde ertelenmis gibi durur.

Tahmini dosyalar:

- `client/src/pages/BookManagement.jsx`
- `client/src/pages/RecordingStudio.jsx`
- `client/src/services/audioService.js`
- `client/src/index.css`

### 2. PDF Yukleme Akisini Ana MVP Yap

Hedef: Gonullu icin en net yol PDF eklemek olsun.

Yapilacaklar:

- [x] `Kitap Yonetimi` sekme sirasini gozden gecir; PDF akisini daha gorunur hale getir.
- [x] PDF formundaki yardim metnini sadeleştir: "Secilebilir metinli PDF yukle, sistem okuyacak metni cikarir."
- [x] Taranmis/gorsel PDF desteklenmiyorsa bunu yuklemeden once daha net anlat.
- [x] PDF yukleme sonrasi basari mesajini admin onay akisiyle uyumlu yap.
- [x] PDF metin onizlemesini gonullu icin daha okunur hale getir.
- [ ] PDF icin dosya boyutu ve metin cikarma hatalarini daha anlasilir Turkceye cevir.

Beklenen sonuc:

- Gonullu "Ben bu siteye ne yuklemeliyim?" sorusunun cevabini ekranda alir.
- PDF akisi profesyonel ve guvenilir hisseder.

Tahmini dosyalar:

- `client/src/pages/BookManagement.jsx`
- `client/src/services/pdfService.js`
- `client/src/index.css`

### 3. Kitaplarim ve Duzeltme Akisini Cilalama

Hedef: Gonullu, yukledigi icerigin nerede takildigini ve ne yapmasi gerektigini anlayabilsin.

Yapilacaklar:

- [x] `Kitaplarim` ekraninda durumlara gore kisa aciklama ekle.
- [x] `Duzeltme istendi` durumunda admin notunu daha one cikar.
- [ ] PDF icerik icin metadata duzeltip tekrar incelemeye gonderme akisini test et.
- [x] Sesli icerik icin "ses dosyasi degisimi su an kapali" mesajini goster.
- [x] Bos liste ekranini PDF yuklemeye yonlendirecek sekilde sadeleştir.

Beklenen sonuc:

- Gonullu paneli "acemice" degil, takip edilebilir bir is akisi gibi durur.

Tahmini dosyalar:

- `client/src/pages/BookManagement.jsx`
- `client/src/pages/Dashboard.jsx`
- `client/src/index.css`

### 4. Admin Kalite Kontrolu PDF Odakli Guclendir

Hedef: Admin, PDF metninin yayinlanabilir olup olmadigini daha hizli anlayabilsin.

Yapilacaklar:

- [x] Admin panel basligini tamamen Turkcelestir.
- [x] PDF kitaplarda ilk metin parcalarini daha okunur kartlar halinde goster.
- [x] Admin karar butonlarini daha net adlandir: `Yayinla`, `Duzeltme Iste`, `Reddet`.
- [x] Duzeltme/ret icin not alanini daha zorunlu veya daha belirgin hale getir.
- [x] Ses yuklemeleri icin Storage bekliyor notu goster.
- [ ] Karar sonrasi kuyruk yenilenmesini test et.

Beklenen sonuc:

- Admin panel, demo verisiyle bile gercek kalite kontrol paneli gibi hissettirir.

Tahmini dosyalar:

- `client/src/pages/AdminQcPanel.jsx`
- `client/src/services/libraryService.js`
- `client/src/index.css`

### 5. Blind Mode PDF/TTS Deneyimini Iyilestir

Hedef: Yayindaki PDF kitaplar dinleyici tarafinda daha sorunsuz okunsun.

Yapilacaklar:

- [ ] PDF kitap secilince ilk chunk hazirligini daha guvenilir yap.
- [ ] "Dinle" komutu PDF/TTS kitaplarda sayfa/parca bilgisini daha net soylesin.
- [ ] Duraklat, devam et, sonraki sayfa, onceki sayfa davranisini test et.
- [x] Ses dosyasi modu Storage bekledigi icin, audio_file kitapta net mesaj ver.
- [x] Kullaniciya teknik hata yerine "Bu sesli kitap henuz hazir degil" gibi mesaj don.

Beklenen sonuc:

- Gorme engelli kullanici icin ana demo: PDF kitabi sec, dinle, duraklat, sayfa gez.

Tahmini dosyalar:

- `client/src/pages/BlindMode.jsx`
- `client/src/services/libraryService.js`

### 6. Dashboard ve Yonlendirme Metinleri

Hedef: Gonullu panele girince dogru islere yonlensin.

Yapilacaklar:

- [x] Ana sayfada "bugun en iyi adim" metnini PDF odakli hale getir.
- [x] Ses kaydi/yukleme ifadelerini "yakinda" veya "depolama kurulumu sonrasi" diye ayrıştır.
- [x] Istatistiklerde PDF ve ses ayrimini daha anlamli goster.
- [x] Topluluk ekraninda kaynak/telif notu ve secilebilir PDF tavsiyesini one cikar.

Beklenen sonuc:

- Site akisi kullaniciya "once PDF ekle, admin onaylasin, Blind Mode okusun" yolunu ogretir.

Tahmini dosyalar:

- `client/src/pages/Dashboard.jsx`
- `client/src/pages/Statistics.jsx`
- `client/src/pages/Community.jsx`

### 7. Dokumantasyon Guncellemesi

Hedef: Teknik kararlar unutulmasin; yarin nereden devam edecegimiz belli olsun.

Yapilacaklar:

- [x] `docs/07_Yol_Haritasi.md` icinde 8 Mayis durumunu bugunku karara gore guncelle.
- [x] `docs/08_Maliyet_Stratejisi.md` icinde Firebase Storage/Blaze kararini "ertelendi" olarak isle.
- [x] `docs/13_Firebase_Storage_Ses_Yukleme_Notlari.md` icinde "beklemede" notunu ekle.
- [x] Bugun tamamlanan maddeleri bu dokumanda isaretle.

Beklenen sonuc:

- Storage yapilmadigi icin proje eksik degil; bilincli sekilde ertelenmis gorunur.

Tahmini dosyalar:

- `docs/07_Yol_Haritasi.md`
- `docs/08_Maliyet_Stratejisi.md`
- `docs/13_Firebase_Storage_Ses_Yukleme_Notlari.md`
- `docs/14_08_Mayis_2026_Bugun_Yapilacaklar.md`

### 8. Test ve Dogrulama

Hedef: Yapilan isler calisiyor mu net gormek.

Yapilacaklar:

- [x] `npm.cmd run lint`
- [x] `npm.cmd run build`
- [ ] Localhost sayfasinin acildigini kontrol et.
- [ ] Gonullu olarak PDF ekleme akisini dene.
- [ ] Admin olarak onay/duzeltme kararini dene.
- [ ] Blind Mode'da yayindaki PDF kitabi dinlemeyi dene.
- [ ] Bilinen limitleri final notuna yaz.

Beklenen sonuc:

- "Calisiyor mu?" sorusuna sadece tahminle degil, komut ve manuel akis kontroluyle cevap verilir.

## Bugunku Onceliklendirme

Mutlaka yapilacaklar:

1. Ses upload teknik hatasini kullanicidan gizle ve kontrollu bekleme durumuna al.
2. PDF/TTS akisini ana MVP olarak netlestir.
3. Admin QC ve Kitaplarim ekranini PDF odakli cilala.
4. Lint/build ile dogrula.

Zaman kalirsa:

1. Blind Mode komut metinlerini daha iyi hale getir.
2. Dashboard ve istatistik ekranlarini daha anlamli yap.
3. Dokumanlardaki eski Cloudinary/Firebase Storage ifadelerini toparla.

Bugun yapilmayacaklar:

1. Blaze plan acmak.
2. Storage bucket olusturmak.
3. Cloudinary kurmak.
4. OCR veya ucretli TTS eklemek.

## Onaydan Sonra Baslama Plani

Onay gelince uygulamaya su sirayla baslanacak:

1. Ses upload ekranlarini bekleme moduna alma.
2. PDF formunu ana akis olacak sekilde revize etme.
3. Admin QC metin/onizleme/durum kararlarini cilalama.
4. Blind Mode PDF/TTS davranisini test edip iyilestirme.
5. Dokumanlari ve bugunku checklist'i guncelleme.
6. Lint/build ve final rapor.

## Kabul Kriterleri

Bugunku is bitti sayilmasi icin:

- [ ] Ses upload denemesi teknik CORS/Storage hatasi gostermemeli.
- [ ] PDF yukleme akisi kullanici icin ana ve net yol olmali.
- [ ] Yuklenen PDF admin onay kuyruguna dusmeli.
- [ ] Admin onayladiginda kitap Blind Mode kutuphanesinde gorunmeli.
- [ ] Blind Mode PDF metnini Web Speech API ile okuyabilmeli.
- [ ] Gonullu kendi kitabinin durumunu `Kitaplarim` ekraninda anlayabilmeli.
- [ ] `npm.cmd run lint` basarili olmali.
- [ ] `npm.cmd run build` basarili olmali.

## Riskler

- Firestore security rules cok kisitliysa PDF kayit veya admin update hata verebilir.
- Taranmis PDF'lerde metin cikmayacagi icin kullaniciya net hata gostermek gerekir.
- Browser Web Speech API ses kalitesi cihaz/tarayiciya gore degisebilir.
- Admin rolu kullanici profilinde dogru atanmazsa `/admin/qc` acilmayabilir.

## Karar Kaydi

8 Mayis 2026 karari:

- Firebase Storage su an Blaze plan istedigi icin canli MVP akisi disina alindi.
- MP3/ses kaydi ozelligi silinmedi, ancak depolama karari verilene kadar pasif/beklemede tutulacak.
- PDF/TTS akisi bugunku ana deger onerisi olarak kabul edildi.
