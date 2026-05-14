import { GENERATED_GTU_ANNOUNCEMENTS } from './generatedGtuAnnouncements';

export const GTU_DEPARTMENTS = [
  { id: 'gtu-genel', name: 'GTÜ Genel Duyurular', keywords: ['gtu', 'gtü', 'genel', 'duyuru', 'duyurular'] },
  { id: 'bilgisayar', name: 'Bilgisayar Mühendisliği', keywords: ['bilgisayar', 'computer'] },
  { id: 'biyomuhendislik', name: 'Biyomühendislik', keywords: ['biyomuhendislik', 'biyomühendislik', 'bioengineering'] },
  { id: 'cevre', name: 'Çevre Mühendisliği', keywords: ['cevre', 'çevre', 'environmental'] },
  { id: 'elektronik', name: 'Elektronik Mühendisliği', keywords: ['elektronik', 'electronics'] },
  { id: 'endustri', name: 'Endüstri Mühendisliği', keywords: ['endustri', 'endüstri', 'industrial'] },
  { id: 'harita', name: 'Harita Mühendisliği', keywords: ['harita', 'geomatics'] },
  { id: 'insaat', name: 'İnşaat Mühendisliği', keywords: ['insaat', 'inşaat', 'civil'] },
  { id: 'kimya-muhendisligi', name: 'Kimya Mühendisliği', keywords: ['kimya mühendisliği', 'kimya muhendisligi', 'chemical engineering'] },
  { id: 'makine', name: 'Makine Mühendisliği', keywords: ['makine', 'mechanical'] },
  { id: 'malzeme', name: 'Malzeme Bilimi ve Mühendisliği', keywords: ['malzeme', 'materials'] },
  { id: 'ucak', name: 'Uçak Mühendisliği', keywords: ['ucak', 'uçak', 'havacılık', 'aerospace', 'aircraft'] },
  { id: 'mimarlik', name: 'Mimarlık', keywords: ['mimarlik', 'mimarlık', 'architecture'] },
  { id: 'sehir-planlama', name: 'Şehir ve Bölge Planlama', keywords: ['sehir', 'şehir', 'planlama'] },
  { id: 'endustriyel-tasarim', name: 'Endüstriyel Tasarım', keywords: ['endustriyel', 'endüstriyel', 'tasarim', 'tasarım'] },
  { id: 'fizik', name: 'Fizik', keywords: ['fizik', 'physics'] },
  { id: 'kimya', name: 'Kimya', keywords: ['kimya', 'chemistry'] },
  { id: 'matematik', name: 'Matematik', keywords: ['matematik', 'math'] },
  { id: 'molekuler-biyoloji', name: 'Moleküler Biyoloji ve Genetik', keywords: ['molekuler', 'moleküler', 'biyoloji', 'genetik'] },
  { id: 'veri-bilimi', name: 'Veri Bilimi ve Analitiği', keywords: ['veri', 'veri bilimi', 'analitik', 'analytics', 'data science'] },
  { id: 'isletme', name: 'İşletme', keywords: ['isletme', 'işletme', 'business'] },
  { id: 'iktisat', name: 'İktisat', keywords: ['iktisat', 'economics'] },
  { id: 'strateji', name: 'Strateji Bilimi', keywords: ['strateji'] },
  { id: 'ybs', name: 'Yönetim Bilişim Sistemleri', keywords: ['yonetim bilisim', 'yönetim bilişim', 'ybs', 'mis'] },
  { id: 'siber-guvenlik', name: 'Siber Güvenlik Meslek Yüksekokulu', keywords: ['siber', 'siber güvenlik', 'cybersecurity'] },
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
