# 6. Akıllı Maliyet ve Çoklu Geri Bildirim Algoritmaları

Projenin kalbi olan "Maliyet/Erişilebilirlik Optimizasyonu" kısmıdır.

## 6.1. "Bir Kere Çevir, Sonsuza Kadar Dinlet" (TTS Caching) Algoritması
Gönüllülerin okumadığı ve sistemin mecburen yapay zeka ile okuması gereken metinler için maliyet önleyici algoritma:

1. Sistem bir metin (Örn: "Romanlar kategorisi") seslendirecektir.
2. Bu metnin özel bir şifresi (Hash) çıkarılır.
3. Veritabanındaki `tts_cache` koleksiyonuna sorulur: *"Bu metin daha önce hiç seslendirildi mi?"*
4. **EVET ise:** Süper! Sistem anında ilgili `.mp3` dosyasını çeker ve oynatır. (Sıfır işlem, sıfır API maliyeti).
5. **HAYIR ise:** Sistem metni Web Speech API (ücretsiz tarayıcı motoru) ile veya çok gerekliyse ElevenLabs (ücretsiz kota içinde) ile seslendirir. Elde edilen bu ses dosyasını bir daha uğraşmamak üzere hemen Storage'a kaydeder.

## 6.2. Duyusal Geri Bildirim Motoru (Sensory Feedback Engine)
Görme engelli kullanıcının güvenini kazanmak için yapılan her işlem fiziksel olarak hissettirilmelidir.

```javascript
// Temel Geri Bildirim Algoritması Örneği
function giveUserFeedback(actionType) {
  switch(actionType) {
    case 'FOCUS': 
      // Butona gelindiğinde hafif bir his
      if (navigator.vibrate) navigator.vibrate(50);
      playSound('soft_tick.mp3');
      break;
    case 'SUCCESS_ACTION': 
      // Bir işlem başarıldığında (Örn kitap bulunduğunda)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // İki kere titreme
      playSound('success_bell.mp3');
      break;
    case 'ERROR':
      // Ses anlaşılamadığında veya kitap bulunamadığında
      if (navigator.vibrate) navigator.vibrate([300]); // Uzun uyarı titreşimi
      playSound('error_buzz.mp3');
      break;
  }
}
```
