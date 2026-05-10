import { normalizeText } from './textUtils';

const NUMBER_WORDS = [
  ['bir', 'birinci', 'ilk', '1'],
  ['iki', 'ikinci', '2'],
  ['uc', 'ucuncu', 'üç', 'üçüncü', '3'],
  ['dort', 'dorduncu', 'dört', 'dördüncü', '4'],
  ['bes', 'besinci', 'beş', 'beşinci', '5'],
  ['alti', 'altinci', 'altı', 'altıncı', '6'],
  ['yedi', 'yedinci', '7'],
  ['sekiz', 'sekizinci', '8'],
  ['dokuz', 'dokuzuncu', '9'],
  ['on', 'onuncu', '10'],
];

const INTENT_PATTERNS = [
  { intent: 'help', phrases: ['yardim', 'yardım', 'ne diyebilirim', 'komutlar', 'nasil kullanilir', 'nasıl kullanılır'] },
  { intent: 'resume', phrases: ['kaldigim yerden', 'kaldığım yerden', 'devam et', 'devam ettir', 'son kaldigim', 'son kaldığım'] },
  { intent: 'bookmark', phrases: ['isaretle', 'işaretle', 'yerimi kaydet', 'kaldigim yeri kaydet', 'kaldığım yeri kaydet', 'burayi kaydet', 'burayı kaydet'] },
  { intent: 'home', phrases: ['ana menu', 'ana menü', 'ana sayfa', 'kitaplara don', 'kitaplara dön'] },
  { intent: 'next', phrases: ['sonraki', 'ileri', 'bir sonraki', 'devamindaki', 'devamındaki'] },
  { intent: 'previous', phrases: ['onceki', 'önceki', 'geri kitap', 'geri al', 'bir onceki', 'bir önceki'] },
  { intent: 'back', phrases: ['geri don', 'geri dön', 'geri', 'onceki menu', 'önceki menü'] },
  { intent: 'detail', phrases: ['detay', 'detaylari oku', 'detayları oku', 'tamamini oku', 'tamamını oku', 'hepsini oku'] },
  { intent: 'play', phrases: ['dinle', 'oku', 'baslat', 'başlat', 'oynat', 'cal', 'çal', 'devam'] },
  { intent: 'pause', phrases: ['dur', 'duraklat', 'sus', 'durdur', 'bekle', 'sessiz'] },
  { intent: 'list', phrases: ['liste', 'listele', 'kitaplar', 'kitapları listele', 'kitaplari say', 'kitapları say', 'secenekleri say', 'seçenekleri say'] },
  { intent: 'announcements', phrases: ['duyuru', 'duyurular', 'gtu duyurulari', 'gtü duyuruları', 'universite duyurulari', 'üniversite duyuruları'] },
  { intent: 'library', phrases: ['kitap', 'kitaplik', 'kitaplık', 'kutuphane', 'kütüphane'] },
];

export function parseVoiceCommand(rawCommand = '') {
  const raw = rawCommand.trim();
  const normalized = normalizeCommandText(raw);
  const numericIndex = parseNumericOnly(normalized);
  const ordinalIndex = parseOrdinalIndex(normalized);
  const pageNumber = parsePageNumber(normalized);
  const isPageNavigation = hasAny(normalized, ['sayfa', 'sayfaya', 'sayfadan']);
  const shouldAutoPlay = hasAny(normalized, ['oku', 'dinle', 'oynat', 'cal', 'çal', 'baslat', 'başlat']);

  return {
    raw,
    normalized,
    intent: detectIntent(normalized),
    numericIndex,
    ordinalIndex,
    pageNumber,
    isPageNavigation,
    shouldAutoPlay,
  };
}

export function isSelectionCommand(command) {
  if (command.numericIndex !== null || command.ordinalIndex !== null) return true;

  return command.ordinalIndex !== null
    || hasAny(command.normalized, ['ac', 'aç', 'sec', 'seç', 'oku', 'git', 'gir']);
}

function detectIntent(normalized) {
  if (!normalized) return 'empty';

  for (const pattern of INTENT_PATTERNS) {
    if (hasAny(normalized, pattern.phrases)) return pattern.intent;
  }

  return 'search';
}

function parseNumericOnly(normalized) {
  const match = normalized.match(/^(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) - 1;
}

function parseOrdinalIndex(normalized) {
  const index = NUMBER_WORDS.findIndex((words) => words.some((word) => includesPhrase(normalized, word)));
  if (index !== -1 && hasAny(normalized, ['ac', 'aç', 'sec', 'seç', 'oku', 'git', 'gir'])) return index;
  return null;
}

function parsePageNumber(normalized) {
  const digitMatch = normalized.match(/(\d{1,4})\s*(sayfa|sayfaya|sayfadan)/);
  if (digitMatch) return Number(digitMatch[1]);

  const wordIndex = NUMBER_WORDS.findIndex((words) =>
    words.some((word) => includesPhrase(normalized, `${word} sayfa`) || includesPhrase(normalized, `${word}inci sayfa`)),
  );

  return wordIndex === -1 ? null : wordIndex + 1;
}

function hasAny(normalized, phrases) {
  return phrases.some((phrase) => includesPhrase(normalized, phrase));
}

function includesPhrase(normalized, phrase) {
  return normalized.includes(normalizeCommandText(phrase));
}

function normalizeCommandText(value = '') {
  return normalizeText(value)
    .replace(/\bgtu\b/g, 'gtu')
    .replace(/\bcal\b/g, 'cal')
    .replace(/\s+/g, ' ')
    .trim();
}
