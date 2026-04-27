# 4. Sistem Akışı (User Flow) ve Senaryolar

## Senaryo A: Görme Engelli Kullanıcının Kitap Dinlemesi
1. **Giriş:** Kullanıcı platform URL'sini açar. Sistem anında tatlı bir açılış müziği çalar ve ElevenLabs stüdyo kalitesiyle okunan: "GTÜ Sesli Kitaplığa hoş geldiniz. Arama yapmak için lütfen ekranın ortasına dokunarak komut verin." sesini çalar.
2. **Komut Verme:** Kullanıcı ekrana dokunur (Cihaz kısa titrer, "bip" sesi çalar). Kullanıcı: "Nutuk dinlemek istiyorum" der. (Web Speech STT bunu metne çevirir).
3. **Arama ve Bulma:** Sistem Firestore'da 'Nutuk' araması yapar.
4. **Geri Bildirim:** Cihaz çift titrer, olumlu bir tını çalar. Sistem okur: "Nutuk bulundu, birinci bölüm oynatılıyor."
5. **Oynatma:** MP3 dosyası başlar. Oynatma sırasında ekranda dev bir "DURAKLAT" butonu vardır, dokunulduğu an durur (titreşim eşliğinde).

## Senaryo B: Gönüllü Kullanıcının İçerik Üretmesi
1. **Giriş:** Gönüllü login paneli ile sisteme girer.
2. **Kategori ve Bilgi Seçimi:** "Yeni Sesli Kitap Yükle" der. Kitabın adını, yazarını ve kategorisini (Roman, Ders Notu, vb.) belirler.
3. **Ses Üretimi:** 
   - İsterse elindeki profesyonel `.mp3` dosyasını sürükleyip bırakarak yükler.
   - İsterse ekrandaki "Kayda Başla" butonuna basıp okumasını yapar, bitirince anında yükler.
4. **Yayınlama:** Dosya arka planda Firebase Storage'a yüklenirken progress bar dolar. Bittiğinde kitap anında görme engelli öğrencilerin sesli aramalarında çıkmaya başlar.
