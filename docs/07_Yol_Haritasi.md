# 7. Yol Haritasi ve 1 Haftalik Bitirme Plani

Bu dokuman, 5 Mayis 2026 itibariyla projenin kalan bir haftalik is planini gosterir. Hedef sunum degil; calisan, erisilebilir ve maliyeti kontrol altinda bir MVP cikarmaktir.

## Mevcut Durum

Tamamlanan ana isler:

- React/Vite istemci uygulamasi ve Firebase baglantisi kuruldu.
- Gonullu kayit/giris akisi hazir.
- Blind Mode icinde yuksek kontrastli, buyuk dokunma hedefli erisilebilir arayuz var.
- Sesli komut ve yazili komut ayni komut isleyicisini kullaniyor.
- PDF yukleme, PDF metnini cikarma, parcalara bolme ve Web Speech API ile okutma akisi eklendi.
- PDF icinde sonraki/onceki sayfa, sayfa numarasina gitme ve yer imi komutlari eklendi.
- GTU duyurulari modu eklendi.
- GTU genel duyurulari ve secili bolum ana sayfa duyurulari yerel import script'i ile cekilebiliyor.
- Duyurularda bolum secme, basliklari sesli listeleme, numara/baslik ile duyuru acma ve detay okuma destekleniyor.

## Kritik Eksikler

- Firestore veri modeli son haliyle uygulanmali ve demo verileri gercek koleksiyonlara tasinmali.
- Lokal/statik verilerin Firebase'e tasinma karari `docs/12_Lokalden_Firebasee_Gecis_Notlari.md` dosyasinda takip edilmeli.
- Yer imi ve okuma ilerlemesi su an agirlikli olarak localStorage tarafinda; kullanici bazli Firestore ilerleme kaydi gerekir.
- Admin/QC paneli yok: yuklenen PDF kitaplarin onaylanmasi, reddedilmesi ve kalite kontrol durumu yonetilmeli.
- GTU duyuru importu su an manuel script ile calisiyor; admin panelinden veya planli is olarak tetiklenebilir hale gelmeli.
- ElevenLabs entegrasyonu zorunlu degil; maliyetli oldugu icin sadece cache'li ve sinirli kullanimla opsiyonel kalmali.
- Mobil ve ekran okuyucu testleri genisletilmeli.

## Gun Gun Plan

### 5 Mayis 2026 - GTU Duyurulari

Hedef: gorme engelli kullanicinin duyurulari ekrana bakmadan gezebilmesi.

- GTU duyuru import script'ini calistir.
- Genel duyurulara ek olarak bolum ana sayfalarindan duyuru bloklarini cek.
- Bolum seciminde numara ve bolum adi komutlarini dogrula.
- Duyuru listesini kisa basliklarla okut.
- Numara, sira ve baslik kelimesi ile duyuru acmayi dogrula.
- Roadmap ve GTU duyuru dokumanini guncelle.

### 6 Mayis 2026 - Firebase ve Kalici Veri

Hedef: demo verisinden gercek veriye gecis.

- `books`, `book_text_chunks`, `reading_progress`, `announcements`, `users` koleksiyonlarini son semaya gore netlestir.
- Okuma ilerlemesi ve yer imini Firestore'a yaz.
- Firestore security rules taslagini hazirla.
- Import edilen duyurulari Firestore'a yazacak servis veya script ekle.

### 7 Mayis 2026 - Admin/QC Paneli

Hedef: gonullunun yukledigi kitaplarin kontrolsuz yayina cikmamasini saglamak.

- [x] Admin/QC gunluk todo listesini netlestir ve bu bolumu isaretlenebilir takip listesi olarak kullan.
- [x] Firestore servis katmanina bekleyen kitaplari okuma, inceleme onizlemesi alma ve review status guncelleme fonksiyonlari ekle.
- [x] `/admin/qc` route'unu ekle ve sadece admin rolundeki kullanicilara ac.
- [x] Sidebar'da admin kullanicilar icin QC Panel linkini goster.
- [x] Onay bekleyen kitaplar listesini; yukleyen, kaynak tipi, kategori, parca/sure bilgisiyle goster.
- [x] Secilen kitap icin PDF metin ornegi ve temel metadata onizlemesi goster.
- [x] `published`, `rejected`, `needs_fix` durumlarini review notu ile yonet.
- [x] PDF yuklemede MVP test icin hemen yayinlama secenegini kapat; kitaplar varsayilan olarak onaya gitsin.
- [x] `npm run build` ile istemci derlemesini dogrula.

- Admin rol kontrolu ekle.
- Onay bekleyen kitaplar listesi ekle.
- Kitap detayinda PDF metin ornegi, sayfa/parca sayisi ve durum goster.
- `approved`, `rejected`, `needs_fix` durumlarini yonet.
- Gerekirse ret nedeni alanini ekle.

### 8 Mayis 2026 - Gonullu Kitap Akisi

Hedef: gonullunun kendi katkisini takip edebilmesi.

- [x] Firebase Storage/Blaze karari nedeniyle ses upload'u canli ana akistan cikartildi; ekranlar kontrollu bekleme moduna alindi.
- [x] PDF/TTS akisi 8 Mayis ana MVP yolu olarak netlestirildi.
- [x] 8 Mayis gonullu kitap akisi todo listesini netlestir.
- [x] Firestore servis katmanina kullanicinin kendi kitaplarini okuyan fonksiyon ekle.
- [x] "Kitaplarim" sekmesini gercek veriye bagla; PDF ve ses yuklemelerini durumlariyla goster.
- [x] Durum etiketlerini gonullunun anlayacagi dile cevir: onay bekliyor, yayinda, duzeltme istendi, reddedildi.
- [x] Admin review notunu gonullu ekraninda goster.
- [x] Yukleme sonrasi basari/uyari mesajlarini QC akisiyle uyumlu hale getir.
- [x] Eksik metadata alanlarini toparla: dil, kategori, kaynak, telif/izin notu.
- [x] `npm run lint` ve `npm run build` ile istemciyi dogrula.

### 9 Mayis 2026 - Erisilebilirlik ve Mobil Test

Hedef: uygulamayi gercek cihazda daha guvenilir kullanmak.

- Telefon/LAN testleri yap.
- Buton sirasi, odak halkalari, klavye ile gezinti ve ekran okuyucu etiketlerini kontrol et.
- Sesli komutlar calismadiginda yazili komut fallback'inin yeterli oldugunu dogrula.
- Uzun duyuru/kitap okumada durdurma ve devam etme davranisini test et.

### 10 Mayis 2026 - Maliyet Kontrollu ElevenLabs

Hedef: dogal sesi sadece mantikli yerde kullanmak.

- Web Speech API varsayilan okuma motoru olarak kalsin.
- ElevenLabs sadece kisa sistem mesajlari veya secili demo metinleri icin opsiyonel olsun.
- Olusturulan sesler cache'lensin; ayni metin icin tekrar API cagrisi yapilmasin.
- API anahtari client'a koyulmasin; gerekiyorsa backend/Cloud Function uzerinden cagrilsin.

### 11 Mayis 2026 - Stabilizasyon

Hedef: son hafta panigini azaltmak.

- Lint/build calistir.
- Kritik kullanici senaryolarini uctan uca test et.
- README calistirma adimlarini guncelle.
- Bilinen limitleri dokumante et.

### 12 Mayis 2026 - Son Paket

Hedef: teslim edilebilir, anlatilabilir ve calisir surum.

- Temiz commit ve push.
- Final demo verisini kontrol et.
- Proje ozeti, mimari, maliyet stratejisi ve erisilebilirlik kazanimi netlesmis olsun.

## Oncelik Sirasi

1. Erisilebilir temel akisin calismasi.
2. Kitap/PDF okuma ve duyuru okuma senaryolarinin kopmamasini saglamak.
3. Firebase kalici veri ve admin/QC.
4. Mobil ve ekran okuyucu kalitesi.
5. ElevenLabs gibi maliyetli iyilestirmeler.
