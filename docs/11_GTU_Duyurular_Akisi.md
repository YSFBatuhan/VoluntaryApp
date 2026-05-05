# 11. GTU Duyurulari Erisilebilirlik Akisi

Bu akisin amaci, gorme engelli kullanicinin GTU genel duyurularina ve bolum duyurularina hiyerarsik, sesli ve kolay erisilebilir sekilde ulasmasidir.

## Kullanici Deneyimi

Blind Mode icinde iki ana kapi vardir:

- Kitap dinleme modu
- GTU Duyurulari modu

Kullanici `GTU Duyurulari` butonuna basabilir veya `duyurular`, `GTU duyurulari`, `Bilgisayar duyurulari` gibi komutlar verebilir.

GTU Duyurulari acilinca uygulama bolumleri numarali olarak okur. Kullanici:

- Ekrana dokunarak bolum secebilir.
- Klavyeyle Tab/Enter kullanabilir.
- `1`, `2`, `birinciyi ac` gibi sira komutlari kullanabilir.
- `Bilgisayar`, `Matematik`, `GTU genel` gibi bolum adi soyleyebilir veya yazabilir.

Bolum secilince uygulama bulunan duyuru sayisini ve ilk basliklari kisa kisa okur. Kullanici:

- `1`, `2`, `ikinciyi ac` gibi komutla duyuru secebilir.
- Duyuru basligindan bir kelime soyleyebilir.
- `listele` diyerek basliklari tekrar dinleyebilir.
- Secili duyuruda `oku`, `dinle`, `detay oku` diyerek daha uzun metni dinleyebilir.
- `sonraki`, `onceki` diyerek duyurular arasinda gezebilir.
- `geri` diyerek bolum listesine donebilir.

## Hiyerarsi

```text
GTU Duyurulari
  -> Bolum listesi
      -> GTU Genel Duyurular
      -> Bilgisayar Muhendisligi
      -> Elektronik Muhendisligi
      -> Makine Muhendisligi
      -> Malzeme Bilimi ve Muhendisligi
      -> Matematik
      -> Mimarlik
      -> diger bolumler
  -> Bolum duyuru listesi
  -> Duyuru ozeti
  -> Duyuru detayi
```

MVP'de bolum kartlari dogrudan ilk seviyede gosterilir. Bu, gorme engelli kullanici icin adim sayisini azaltir.

## Veri Stratejisi

Client tarafindan GTU sitesini dogrudan fetch etmek CORS ve kaynak degisikligi yuzunden guvenilir degildir. Bu nedenle import islemi uygulama disinda script olarak yapilir.

Mevcut akista:

1. `client/scripts/fetch-gtu-announcements.mjs` GTU kaynaklarini okur.
2. Genel duyuru detaylarini temiz metne cevirir.
3. Secili bolum ana sayfalarindaki duyuru bloklarini toplar.
4. PDF baglantili bolum duyurularinda PDF metnini cikarir ve okunabilir metne cevirir.
5. Sonucu `client/src/data/generatedGtuAnnouncements.js` dosyasina yazar.
6. Blind Mode bu dosyadaki veriyi okur.
7. Veri yoksa `SAMPLE_GTU_ANNOUNCEMENTS` fallback olarak kullanilir.

Bugunku import sonucu 42 duyuru uretilmistir:

- GTU genel: 12 duyuru
- Bilgisayar: 5 duyuru
- Elektronik: 5 duyuru
- Makine: 5 duyuru
- Malzeme: 5 duyuru
- Matematik: 5 duyuru
- Mimarlik: 5 duyuru

## Sonraki Veri Adimi

Firebase fazinda bu dosya tabanli veri Firestore `announcements` koleksiyonuna tasinmalidir.

Onerilen alanlar:

- `id`
- `departmentId`
- `departmentName`
- `title`
- `summary`
- `bodyText`
- `dateText`
- `detailUrl`
- `sourceUrl`
- `sourceHash`
- `language`
- `status`
- `createdAt`
- `updatedAt`

Firestore'a gecince Blind Mode once Firestore'dan okumali; hata veya bos veri durumunda generated dosyasini fallback olarak kullanmalidir.

## Sesli Komutlar

Desteklenen ana komutlar:

- `duyurular`
- `GTU duyurulari`
- `Bilgisayar duyurulari`
- `Matematik duyurulari`
- `1`, `2`, `birinciyi ac`, `ikinciyi oku`
- `listele`
- `detay oku`
- `sonraki`
- `onceki`
- `geri`
- `kitaplar`

## Riskler

- GTU sayfa HTML yapisi degisirse parser bozulabilir.
- Tum bolumlerin kaynak URL'leri henuz dogrulanmis degil.
- PDF baglantili bolum duyurularinda metin cikariliyor; fakat tablo yapisi karmasik PDF'lerde okuma sirasi kusursuz olmayabilir.
- Bazi bolum duyurulari sayfada modal buton olarak duruyor ve GTU HTML'i detay metnini sunucu cevabina koymuyor. Bu durumda uygulama "ayri detay metni bulunamadi" bilgisini okur.
- Duyuru importu manuel calistiriliyor; otomasyon/admin tetikleme sonraki faza birakildi.
