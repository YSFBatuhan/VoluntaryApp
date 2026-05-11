import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase/config';

const functions = getFunctions(app);
const generateCachedSpeechCallable = httpsCallable(functions, 'generateCachedSpeech');

export const MENU_SPEECH_PROMPTS = [
  {
    id: 'welcome',
    label: 'Açılış karşılama',
    text: 'Duyum dinleme moduna hoş geldiniz. Arama yapmak için Komut Ver düğmesine basın.',
  },
  {
    id: 'command_help',
    label: 'Komut yardımı',
    text: 'Kullanabileceğiniz komutlar: Dinle, duraklat, sonraki, önceki, sonraki sayfa, önceki sayfa, kaldığım yeri işaretle, kaldığım yerden devam et, kitapları listele, duyurular, geri dön ve yardım.',
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
    text: 'GTÜ duyuruları modu açıldı. Bölüm seçmek için sırayı ya da bölüm adını söyleyin.',
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
