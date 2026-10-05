import type { Kind, Theme, Translations } from '../types/designTypes'

export const sample = {
  fonts: {
    rounded: ['Friendly rounded', 'ui-rounded,"SF Pro Rounded","Avenir Next",system-ui,sans-serif'],
    serif: ['Classic serif', 'Georgia,"Times New Roman",serif'],
    modern: ['Clean modern', '"Helvetica Neue",Arial,system-ui,sans-serif'],
    type: ['Typewriter', '"American Typewriter","Courier New",monospace'],
  } as Record<string, [string, string]>,
  themes: {
    sunrise: { name: 'Sunrise', acc: '#D6432B', sup: '#FFC83D', bg: '#FFFFFF', ink: '#1E2328', hf: 'rounded', bf: 'rounded', r: 14, mode: 'light', auto: true, shade: 4, grad: 'soft', sh: 'soft' },
    meadow: { name: 'Meadow', acc: '#2E7D4F', sup: '#F2B600', bg: '#FFFFFF', ink: '#1B2A21', hf: 'serif', bf: 'modern', r: 6, mode: 'light', auto: true, shade: 3, grad: 'none', sh: 'none' },
    midnight: { name: 'Midnight', acc: '#F2B600', sup: '#FF6F61', bg: '#FFFFFF', ink: '#1E2328', hf: 'modern', bf: 'modern', r: 22, mode: 'dark', auto: true, shade: 5, grad: 'strong', sh: 'strong' },
  } as Record<string, Theme>,
  swatches: ['#D6432B', '#2E7D4F', '#2F6BDB', '#8A3FBF', '#F2B600', '#0B7A75'],
  translations: {
    'home.title': { en: 'Bake with us on Saturdays', de: 'Backen Sie samstags mit uns', ar: 'اخبز معنا أيام السبت' },
    'home.intro': { en: 'Small classes, warm ovens, and a loaf to take home.', de: 'Kleine Kurse, warme Öfen und ein Brot zum Mitnehmen.', ar: 'دروس صغيرة وأفران دافئة ورغيف تأخذه معك إلى البيت.' },
    'home.book': { en: 'Book a class', de: 'Kurs buchen', ar: 'احجز درسًا' },
    'home.see': { en: 'See all classes', de: 'Alle Kurse ansehen', ar: 'شاهد كل الدروس' },
    'menu.classes': { en: 'Classes', de: 'Kurse', ar: 'الدروس' },
    'menu.about': { en: 'About us', de: 'Über uns', ar: 'من نحن' },
    'menu.contact': { en: 'Contact', de: 'Kontakt', ar: 'تواصل معنا' },
    'footer.address': { en: '14 Mill Lane, open Tuesday to Saturday', de: '14 Mill Lane, Dienstag bis Samstag geöffnet', ar: '' },
    'book.pay': { en: 'Pay and book', de: 'Bezahlen und buchen', ar: '' },
    'class.1': { en: 'Sourdough basics', de: 'Sauerteig für Einsteiger', ar: '' },
    'class.2': { en: 'Croissants from scratch', de: 'Croissants von Grund auf', ar: '' },
    'class.3': { en: 'Flatbreads and dips', de: '', ar: '' },
  } as Translations,
  content: {
    classes: [
      { key: 'class.1', name: 'Sourdough basics', when: 'Sat 11 Oct, 10:00', price: '£45' },
      { key: 'class.2', name: 'Croissants from scratch', when: 'Sun 12 Oct, 9:00', price: '£55' },
      { key: 'class.3', name: 'Flatbreads and dips', when: 'Sat 18 Oct, 10:00', price: '£40' },
    ],
    staff: [
      { cls: 'Sourdough basics', day: 'Sat 11 Oct', people: 6 },
      { cls: 'Croissants from scratch', day: 'Sun 12 Oct', people: 4 },
      { cls: 'Flatbreads and dips', day: 'Sat 18 Oct', people: 8 },
    ],
  },
  pages: {
    pub: [['home', 'Home', 'Welcome and the next classes'], ['classes', 'Classes', 'Every class with its date and price'], ['booking', 'Booking', 'Pick a class and pay to book']] as [string, string, string][],
    staff: [['staff', 'Bookings', 'Who is coming to each class']] as [string, string, string][],
  },
  apps: { pub: 'Booking page', staff: 'Staff area' } as Record<string, string>,
  kinds: { button: 'buttons', heading: 'headings', text: 'body text', card: 'cards' } as Record<Kind, string>,
}
