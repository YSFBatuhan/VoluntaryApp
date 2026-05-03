# 11. GTU Duyurulari Erisilebilirlik Akisi

Bu akisin amaci, gorme engelli kullanicinin GTU genel duyurularina ve tum bolum duyurularina hiyerarsik, sesli ve kolay erisilebilir sekilde ulasmasidir.

## Kullanici Deneyimi

Blind Mode icinde iki ana kapi olur:

- `Kitaplik`
- `GTU Duyurulari`

`GTU Duyurulari` acilinca kullanici once bolum listesini gorur. Her bolum buyuk dokunma hedefidir. Kullanici:

- Ekrana dokunarak bolum secebilir.
- Klavyeyle Tab/Enter kullanabilir.
- Sesli olarak "Bilgisayar duyurulari", "Matematik duyurulari", "Duyurular" diyebilir.

## Hiyerarsi

```text
GTU Duyurulari
  -> Genel GTU Duyurulari
  -> Muhendislik Bolumleri
  -> Mimarlik Bolumleri
  -> Temel Bilimler Bolumleri
  -> Isletme Fakultesi Bolumleri
  -> Bolum Duyurulari
  -> Duyuru Detayi
```

MVP'de ilk seviye dogrudan bolum kartlariyla baslayabilir. Kullanici icin daha az adim bazen daha iyidir.

## Veri Stratejisi

Client tarafindan GTU sitesini dogrudan fetch etmek CORS yuzunden guvenilir degildir. Bu nedenle MVP icin onerilen yol:

1. GTU duyuru kaynaklari listesi tutulur.
2. Duyurular Firestore `announcements` koleksiyonuna yazilir.
3. Blind Mode sadece Firestore'dan okur.
4. Import islemi baslangicta manuel veya admin panelinden yapilir.

Bu yaklasim:

- Blind Mode'u hizli tutar.
- CORS sorununu kullaniciya yansitmaz.
- Duyuru detaylarini sesli okumaya uygun temiz metne cevirme sansi verir.
- Firestore read sayisini kontrol altinda tutar.

## Sesli Komutlar

Desteklenecek komutlar:

- "Duyurular"
- "GTU duyurulari"
- "Bilgisayar duyurulari"
- "Matematik duyurulari"
- "Kitaplik"
- "Geri don"
- "Duyuruyu oku"

## MVP Durumu

Kodda ilk erisilebilir hiyerarsi eklendi:

- GTU Duyurulari butonu
- Bolum listesi
- Bolum secme
- Ornek duyuru okuma
- Sesli komutta duyuru/bolum yakalama

Bir sonraki adim Firestore `announcements` koleksiyonunu gercek duyuru verisiyle beslemektir.
