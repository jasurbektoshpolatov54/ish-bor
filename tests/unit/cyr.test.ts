import { it, expect } from 'vitest';
import { toCyrText } from '../../src/ui/cyr';
it('lotindan kirillga', () => {
  expect(['Yorug‘', 'Yozuv', 'Yo‘q', 'Qorong‘i', 'E’lon', 'O‘zingiz', 'Yangi', 'shikoyat', 'TOP', 'Payme'].map(toCyrText))
    .toEqual(['Ёруғ', 'Ёзув', 'Йўқ', 'Қоронғи', 'Эълон', 'Ўзингиз', 'Янги', 'шикоят', 'TOP', 'Payme']);
});
