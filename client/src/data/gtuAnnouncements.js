import { GENERATED_GTU_ANNOUNCEMENTS } from './generatedGtuAnnouncements';

export const GTU_DEPARTMENTS = [
  { id: 'gtu-genel', name: 'GTÜ Genel Duyurular', keywords: ['gtu', 'gtü', 'genel', 'duyuru', 'duyurular'] },
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', keywords: ['bilgisayar', 'computer'] },
  { id: 'elektronik', name: 'Elektronik Mühendisliği', keywords: ['elektronik', 'electronics'] },
  { id: 'makine', name: 'Makine Mühendisliği', keywords: ['makine', 'mechanical'] },
  { id: 'malzeme', name: 'Malzeme Bilimi ve Mühendisliği', keywords: ['malzeme', 'materials'] },
  { id: 'kimya-muhendisligi', name: 'Kimya Mühendisliği', keywords: ['kimya mühendisliği', 'kimya muhendisligi'] },
  { id: 'cevre', name: 'Çevre Mühendisliği', keywords: ['cevre', 'çevre'] },
  { id: 'harita', name: 'Harita Mühendisliği', keywords: ['harita', 'geomatics'] },
  { id: 'insaat', name: 'İnşaat Mühendisliği', keywords: ['insaat', 'inşaat', 'civil'] },
  { id: 'biyomuhendislik', name: 'Biyomühendislik', keywords: ['biyomuhendislik', 'biyomühendislik', 'bioengineering'] },
  { id: 'mimarlik', name: 'Mimarlık', keywords: ['mimarlik', 'mimarlık', 'architecture'] },
  { id: 'sehir-planlama', name: 'Şehir ve Bölge Planlama', keywords: ['sehir', 'şehir', 'planlama'] },
  { id: 'endustriyel-tasarim', name: 'Endüstriyel Tasarım', keywords: ['endustriyel', 'endüstriyel', 'tasarim', 'tasarım'] },
  { id: 'matematik', name: 'Matematik', keywords: ['matematik', 'math'] },
  { id: 'fizik', name: 'Fizik', keywords: ['fizik', 'physics'] },
  { id: 'kimya', name: 'Kimya', keywords: ['kimya', 'chemistry'] },
  { id: 'molekuler-biyoloji', name: 'Moleküler Biyoloji ve Genetik', keywords: ['molekuler', 'moleküler', 'biyoloji', 'genetik'] },
  { id: 'isletme', name: 'İşletme', keywords: ['isletme', 'işletme', 'business'] },
  { id: 'iktisat', name: 'İktisat', keywords: ['iktisat', 'economics'] },
  { id: 'strateji', name: 'Strateji Bilimi', keywords: ['strateji'] },
];

export const SAMPLE_GTU_ANNOUNCEMENTS = [
  {
    id: 'sample-1',
    departmentId: 'bilgisayar',
    title: 'Örnek duyuru: Bitirme projesi teslim takvimi',
    summary: 'Bu kayıt deneme verisidir. Gerçek GTÜ duyuruları Firestore veya kaynak import akışı ile beslenecektir.',
    dateText: 'Deneme',
    detailUrl: '',
  },
  {
    id: 'sample-2',
    departmentId: 'matematik',
    title: 'Örnek duyuru: Ara sınav salon bilgileri',
    summary: 'Bu kayıt deneme verisidir. Duyuru detayları sesli olarak okunabilir biçimde tasarlanmıştır.',
    dateText: 'Deneme',
    detailUrl: '',
  },
  {
    id: 'sample-3',
    departmentId: 'mimarlik',
    title: 'Örnek duyuru: Jüri programı bilgilendirmesi',
    summary: 'Bu kayıt deneme verisidir. Bölüm duyuruları hiyerarşik olarak gezilecektir.',
    dateText: 'Deneme',
    detailUrl: '',
  },
];

export const GTU_ANNOUNCEMENTS =
  GENERATED_GTU_ANNOUNCEMENTS.length > 0 ? GENERATED_GTU_ANNOUNCEMENTS : SAMPLE_GTU_ANNOUNCEMENTS;
