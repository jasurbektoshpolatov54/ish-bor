import { describe, it, expect } from 'vitest';
import { freshDB } from '../../src/core/seed';
import { nearestDistrict, inShape } from '../../src/core/rules';
import { REGIONS, PLACES, SHAPES } from '../../src/core/places';

const db = freshDB();
const at = (lat: number, lng: number) => nearestDistrict(db, lat, lng).name;

describe('hududlar va lokatsiya', () => {
  it('butun O‘zbekiston: 14 hudud, har birida tuman/shahar bor', () => {
    expect(REGIONS).toHaveLength(14);
    for (const r of REGIONS) expect(db.districts.filter((d) => d.region === r.id).length).toBeGreaterThan(0);
    expect(new Set(db.districts.map((d) => d.name)).size).toBe(db.districts.length);
    for (const d of db.districts) expect(d.name).not.toMatch(/'/);
  });
  it('viloyat markazlari to‘g‘ri aniqlanadi', () => {
    expect(at(39.6542, 66.9597)).toBe('Samarqand sh.');
    expect(at(42.4600, 59.6100)).toBe('Nukus sh.');
    expect(at(37.2242, 67.2783)).toBe('Termiz sh.');
    expect(at(40.3842, 71.7843)).toBe('Farg‘ona sh.');
    expect(at(39.7747, 64.4286)).toBe('Buxoro sh.');
    expect(at(41.5500, 60.6314)).toBe('Urganch sh.');
    expect(at(38.8606, 65.7891)).toBe('Qarshi sh.');
    expect(at(40.1158, 67.8422)).toBe('Jizzax sh.');
  });
  it('Toshkent shahri tumanlari ishlashda davom etadi', () => {
    expect(at(41.275, 69.204)).toBe('Chilonzor');
    expect(at(41.364, 69.287)).toBe('Yunusobod');
    expect(at(41.338, 69.335)).toBe('Mirzo Ulug‘bek');
  });
  it('har bir shahar o‘z joyida aniqlanadi', () => {
    for (const [name, , , , lat, lng, f] of PLACES) if (f === 1) expect(at(lat, lng)).toBe(name);
    // markazi taxminiy (2) bo‘lganlar lokatsiyada tanlanmaydi, ro‘yxatda bor
    expect(PLACES.filter((p) => p[6] & 2).length).toBeLessThan(12);
  });
  it('tuman markazida — o‘sha tuman yoki uning ichidagi shahar', () => {
    for (const [name, , , region, lat, lng, f] of PLACES) {
      if (f || !SHAPES[name] || region === 'UZ-TK' || !inShape(name, lat, lng)) continue;
      const d = nearestDistrict(db, lat, lng);
      expect(d.region).toBe(region);
      if (d.name !== name) expect(d.city).toBe(true);
    }
  });
});
