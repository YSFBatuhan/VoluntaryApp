# 10. PDF Yukleme ve Ucretsiz TTS Akisi

Bu akisin amaci, gonullunun elindeki PDF'i sisteme kazandirmasi ve gorme engelli kullanicinin bu icerigi ucretsiz sekilde dinleyebilmesidir.

## Temel Karar

PDF yuklenince sistem her zaman MP3 uretmeye calismayacak. MVP'de ana model:

```text
PDF -> tarayicida metin cikarma -> Firestore text chunks -> Web Speech API ile dinleme
```

Bu sayede:

- TTS API ucreti yok.
- Ses dosyasi depolama maliyeti yok.
- Cloud Function veya sunucu isleme maliyeti yok.
- Kitap metni parca parca okunur, Firestore read kontrol altinda kalir.

## Kullanici Akisi

### Gonullu

1. Gonullu panele girer.
2. "PDF ile Kitap Ekle" secenegini secer.
3. Kitap adi, yazar, kategori, dil bilgisi girer.
4. PDF dosyasini yukler.
5. Tarayici PDF metnini cikarmaya calisir.
6. Sistem metni sayfa ve chunk bazinda parcalar.
7. Gonullu ilk 2-3 chunk'i onizler.
8. Kaydi `pending` olarak Firestore'a gonderir.
9. Admin veya sorumlu gonullu kontrol ettikten sonra `published` yapar.

### Dinleyici

1. Blind Mode acilir.
2. Kullanici kitap arar veya kategoriden secer.
3. Kitap `readingMode == "tts_text"` ise player ses dosyasi beklemez.
4. Ilk 5 text chunk Firestore'dan okunur.
5. Web Speech API chunk'lari sirayla seslendirir.
6. Kullanici duraklatirsa `playback_progress` icinde `chunkOrder` ve `charOffset` saklanir.

## PDF Turleri

| PDF Turu | Destek | Not |
| --- | --- | --- |
| Secilebilir metinli PDF | Evet | MVP icin ana hedef. |
| Taranmis/gorsel PDF | Hayir | OCR gerekir, MVP'de maliyet ve karmasiklik yuzunden ertelenir. |
| Cok kolonlu akademik PDF | Kismi | Metin sirasi bozulabilir, admin kontrolu gerekir. |
| Tablo/form agirlikli PDF | Kismi | TTS deneyimi zayif olabilir. |

## Teknik Akis

```text
PDF file
  -> file size/type validation
  -> PDF text extraction in browser
  -> page text cleanup
  -> chunk builder
  -> books document
  -> book_text_chunks documents
  -> optional sourceFile metadata
```

## Chunk Kurallari

- Hedef chunk boyutu: 2.000 - 4.000 karakter.
- Chunk cumle ortasinda kesilmemeye calisilir.
- Her chunk `bookId`, `order`, `pageStart`, `pageEnd`, `text` alanlarini tasir.
- TTS okumasi chunk bazinda ilerler.
- Player gelecek chunk'lari kademeli ceker.

## Maliyet Koruma

1. PDF'in kendisi zorunlu olarak depolanmayabilir.
2. PDF depolanacaksa dosya limiti 20 MB ile baslar.
3. Metin Firestore'a parca parca yazilir; tek dev dokuman yok.
4. Dinleyici tum kitabi tek acilista okumaz; chunk'lar kademeli gelir.
5. Web Speech API ucretsiz ana seslendirme motorudur.
6. OCR ve AI duzeltme MVP disidir.

## Firestore Yazma Maliyeti

Ornek:

- 100 sayfalik bir PDF
- Sayfa basi ortalama 2.000 karakter
- Chunk basi 4.000 karakter
- Yaklasik 50 chunk

Bu kitap eklenirken:

- 1 `books` write
- 50 `book_text_chunks` write
- Opsiyonel 3-5 `chapters` write

Yani kitap ekleme aninda yazma maliyeti vardir, ama dinleme tarafinda okuma kontrolludur.

## Admin Kontrolu

PDF metni otomatik ciksa bile dogrudan yayinlanmamalidir. Kontrol edilmesi gerekenler:

- Metin bos mu?
- Sayfa sirasi mantikli mi?
- Turkce karakterler bozulmus mu?
- Telif veya izin problemi var mi?
- Kitap adi/yazar/kategori dogru mu?

## MVP'de Yapilmayacaklar

- OCR ile gorsel PDF okuma.
- PDF'i otomatik ses dosyasina cevirip MP3 depolama.
- AI ile metin temizleme.
- Sayfa layout'unu birebir koruma.
- Telif kontrolunu otomatik yapma.

## Faz 2 Cikis Kriteri

- Gonullu secilebilir metinli PDF yukleyebilir.
- Sistem PDF'ten metin cikarabilir.
- Metin chunk'lar halinde Firestore'a kaydedilebilir.
- Blind Mode `tts_text` kitaplari okuyabilir.
- Sesli okuma ucretli API kullanmaz.
- PDF metni cikmazsa kullanici net hata gorur.
