import { describe, it, expect } from 'vitest';
import { toRuText as tr } from '../../src/ui/ru';

const latin = (s: string) => /[A-Za-z]{2,}/.test(s.replace(/TOP|Payme|Click|Uzum Bank|Paynet|Multicard|Telegram|username|GPS|OK/g, ''));

describe('rus tili', () => {
  it('xabarlar va tizim oynalari tarjima qilinadi', () => {
    for (const s of [
      'E’loningiz tursinmi, yangilaysizmi yoki o‘chirilsinmi?', 'Bugun e’loningizni yangilang, bo‘lmasa kechqurun ro‘yxatdan o‘chib ketadi.',
      'E’loningiz yangilanmagani uchun ro‘yxatdan o‘chirildi. Kerak bo‘lsa, yangi e’lon joylang.', 'Tursin', 'Yangilash', 'O‘chirish',
      'Bugun bo‘shmisiz?', 'E’loningiz joylandi.', 'TOP ertaga tugaydi. Uzaytirasizmi?', 'E’loningiz yopildi. Hali kerak bo‘lsa — qayta joylang.',
      '⚡ TOP yoqildi. 7 kun ro‘yxat boshidasiz.', 'E’loningiz butunlay o‘chiriladi. Ishonchingiz komilmi?', 'Ismingiz', 'Telefon raqamingiz (+998…)',
      'Raqam noto‘g‘ri. Masalan: +998 90 123 45 67', 'Mikrofonga ruxsat berilmadi.', 'Ish bor', 'Ilovani ochish', 'Qayta joylash', 'Uzaytirish',
      'E’loningiz chiqmadi. Sabab: yolg‘on ma’lumot.', 'Qoidalar buzilgani uchun hisobingiz cheklandi.',
    ]) expect(latin(tr(s)), s + ' → ' + tr(s)).toBe(false);
  });
  it('sana, son va vaqt', () => {
    expect(tr('3-noyabr, yakshanba')).toBe('3 ноября, воскресенье');
    expect(tr('29-oktabr 2026, 00:28')).toBe('29 октября 2026, 00:28');
    expect(tr('250 000 so‘m')).toBe('250 000 сум');
    expect(tr('5 ta e’lon')).toBe('5 объявлений');
    expect(tr('2 ta ishchi')).toBe('2 работника');
    expect(tr('Yuk tashish, 2 ta ishchi')).toBe('Грузоперевозка, 2 чел.');
    expect(tr('  Bugun  ')).toBe('  Сегодня  ');
  });
  it('foydalanuvchi matni o‘zgarmaydi', () => {
    expect(tr('Uy ko‘chirish, 3-qavatdan mebel tushirish')).toBe('Uy ko‘chirish, 3-qavatdan mebel tushirish');
  });
});
