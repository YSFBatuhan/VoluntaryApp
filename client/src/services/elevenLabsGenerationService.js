import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';
import { GTU_DEPARTMENTS } from '../data/gtuAnnouncements';

const functions = getFunctions(app);
const generateCachedSpeechCallable = httpsCallable(functions, 'generateCachedSpeech');
const GTU_DEPARTMENT_PROMPT_TEXT = GTU_DEPARTMENTS
  .map((department, index) => `${index + 1}. ${department.name}`)
  .join('. ');

export const MENU_SPEECH_PROMPTS = [
  {
    id: 'blind_welcome',
    label: 'Dinleyici ekranı açılışı',
    text: 'Duyum dinleme moduna hoş geldiniz. Komut vermek için Enter tuşuna basabilir veya ekrandaki büyük mikrofon düğmesine dokunabilirsiniz. Kitapları duymak için kitapları listele deyin. GTÜ duyuruları için duyurular deyin. Yardım almak için yardım deyin.',
  },
  {
    id: 'command_help',
    label: 'Komut yardımı',
    text: 'Yardım rehberi. Komut vermek için Enter tuşuna basın veya büyük mikrofon düğmesine dokunun. Kitapları listelemek için kitapları listele deyin. Bir kitabı açmak için birinciyi aç veya kitap adını söyleyin. Dinlemek için dinle, durdurmak için duraklat deyin. PDF kitaplarda sonraki sayfa, önceki sayfa veya beşinci sayfaya git diyebilirsiniz. Duyurular için duyurular deyin. Geri dönmek için geri dön deyin. Klavyede Space dinle ve duraklat, sağ ok ileri, sol ok geri, H yardım komutudur.',
  },
  {
    id: 'library_mode',
    label: 'Kitap moduna dönüş',
    text: 'Kitap dinleme moduna dönüldü.',
  },
  {
    id: 'no_books',
    label: 'Boş kitaplık uyarısı',
    text: 'Listelenecek kitap bulunamadı.',
  },
  {
    id: 'speech_unsupported',
    label: 'Sesli komut desteklenmiyor',
    text: 'Bu tarayıcı sesli komutu desteklemiyor. Arama kutusunu kullanabilirsiniz.',
  },
  {
    id: 'progress_save_failed',
    label: 'İlerleme kaydı uyarısı',
    text: 'Kaldığınız yer bu cihazda kaydedildi, fakat hesabınıza yazılamadı.',
  },
  {
    id: 'no_bookmark',
    label: 'Kayıtlı yer yok',
    text: 'Bu kitap için kayıtlı kaldığınız yer yok.',
  },
  {
    id: 'no_page_info',
    label: 'Sayfa bilgisi yok',
    text: 'Sayfa bilgisi alınamadı.',
  },
  {
    id: 'no_page_to_bookmark',
    label: 'İşaretlenecek sayfa yok',
    text: 'İşaretlenecek sayfa bulunamadı.',
  },
  {
    id: 'text_speech_unsupported',
    label: 'Metin seslendirme desteklenmiyor',
    text: 'Bu tarayıcı metin seslendirmeyi desteklemiyor.',
  },
  {
    id: 'no_pdf_text',
    label: 'PDF metni yok',
    text: 'Bu PDF kitabı için okunacak metin bulunamadı.',
  },
  {
    id: 'pdf_read_error',
    label: 'PDF okuma hatası',
    text: 'PDF metni okunurken Firestore hatası oluştu. Daha sonra tekrar deneyin.',
  },
  {
    id: 'preview_completed',
    label: 'Önizleme tamamlandı',
    text: 'Kitap önizleme metni tamamlandı.',
  },
  {
    id: 'page_navigation_text_only',
    label: 'Sayfa gezinme metin uyarısı',
    text: 'Sayfa gezinme sadece PDF metin kitapları için kullanılır.',
  },
  {
    id: 'page_number_text_only',
    label: 'Sayfa numarası metin uyarısı',
    text: 'Sayfa numarası komutu sadece PDF metin kitapları için kullanılır.',
  },
  {
    id: 'no_text_chunks',
    label: 'Metin parçası yok',
    text: 'Bu kitapta metin parçası bulunamadı.',
  },
  {
    id: 'announcements_mode',
    label: 'Duyurular modu',
    text: `GTÜ duyuruları modu açıldı. ${GTU_DEPARTMENT_PROMPT_TEXT}. Bölüm seçmek için 1, 2 gibi sırasını; ya da Bilgisayar, Matematik gibi bölüm adını söyleyin.`,
  },
  {
    id: 'no_department_announcements',
    label: 'Bölüm duyurusu yok',
    text: 'Bu bölüm için duyuru bulunamadı.',
  },
  {
    id: 'no_options_at_index',
    label: 'Sıra bulunamadı',
    text: 'Bu sırada bir seçenek bulunamadı.',
  },
  {
    id: 'command_prompt',
    label: 'Komut istemi',
    text: 'Komut vermek için kitap adı, duyuru, dinle veya yardım yazabilirsiniz.',
  },
  {
    id: 'department_list_return',
    label: 'Bölüm listesine dönüş',
    text: 'Bölüm listesine dönüldü.',
  },
  {
    id: 'library_mode_already',
    label: 'Kitaplık modundasınız',
    text: 'Kitaplık modundasınız.',
  },
  {
    id: 'no_published_audio',
    label: 'Yayınlanmış ses yok',
    text: 'Bu sesli kitap için yayımlanmış ses dosyası bulunamadı. Admin onayından sonra tekrar deneyin.',
  },
  {
    id: 'audio_playback_error',
    label: 'Ses oynatma hatası',
    text: 'Ses dosyası oynatılamadı. Storage erişim izni veya dosya bağlantısı kontrol edilmeli.',
  },
  {
    id: 'audio_start_error',
    label: 'Ses başlatma hatası',
    text: 'Ses dosyası başlatılamadı. Tarayıcı izinlerini veya Storage ayarlarını kontrol edin.',
  },
  {
    id: 'forward_ten',
    label: 'On saniye ileri',
    text: 'On saniye ileri sarıldı.',
  },
  {
    id: 'backward_ten',
    label: 'On saniye geri',
    text: 'On saniye geri sarıldı.',
  },
  {
    id: 'playback_paused',
    label: 'Oynatma duraklatıldı',
    text: 'Oynatma duraklatıldı.',
  },
  {
    id: 'audio_stopped',
    label: 'Ses durduruldu',
    text: 'Ses durduruldu.',
  },
  {
    id: 'microphone_permission_denied',
    label: 'Mikrofon izni yok',
    text: 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundaki mikrofon iznini kontrol edin.',
  },
  {
    id: 'speech_service_unavailable',
    label: 'Ses tanıma servisi yok',
    text: 'Tarayıcının ses tanıma servisi bu ortamda çalışmıyor. Yazılı aramayı kullanabilirsiniz.',
  },
  {
    id: 'microphone_unavailable',
    label: 'Mikrofon bulunamadı',
    text: 'Mikrofon bulunamadı veya tarayıcı mikrofona erişemedi.',
  },
  {
    id: 'speech_recognition_network_error',
    label: 'Ses tanıma ağ hatası',
    text: 'Ses tanıma servisine bağlanılamadı. Bu özellik internet veya tarayıcı servisi gerektirebilir.',
  },
  {
    id: 'no_speech_detected',
    label: 'Ses algılanamadı',
    text: 'Ses algılanamadı. Mikrofona biraz daha yakın konuşup tekrar deneyin.',
  },
  {
    id: 'speech_command_aborted',
    label: 'Sesli komut iptal edildi',
    text: 'Sesli komut iptal edildi.',
  },
  {
    id: 'speech_recognition_language_unavailable',
    label: 'Türkçe ses tanıma yok',
    text: 'Türkçe ses tanıma bu tarayıcıda kullanılamıyor olabilir.',
  },
];

export async function generateCachedMenuSpeech(prompt, options = {}) {
  const result = await generateCachedSpeechCallable({
    text: prompt.text,
    language: 'tr-TR',
    promptId: prompt.id,
    model: options.model,
    voiceId: options.voiceId,
  });

  return result.data;
}

export async function generateCachedDynamicSpeech({
  text,
  language = 'tr-TR',
  model,
  voiceId,
  announcementId = '',
  announcementVariant = 'summary',
} = {}) {
  const result = await generateCachedSpeechCallable({
    text,
    language,
    model,
    voiceId,
    announcementId,
    announcementVariant,
  });

  return result.data;
}
