// Ma’lumotdan oyna ko‘rinishini (vm) yasash.
import type { Listing, User } from '../core/types';
import type { LcData } from '../ui/kit';
import { A } from '../ui/kit';
import { db, now, userById } from './store';
import { title, jobIcon, jobName, isTop, distanceTo, genderLabel, personTitle } from '../core/rules';
import { money, dist, ago, dayName, hhmm, whenLabel, daysLabel } from '../core/format';
import { RADII, TRAITS_3P } from '../core/seed';

export const payText = (l: Listing) => (l.payType === 'kelishiladi' || !l.pay ? 'Kelishiladi' : money(l.pay));
export const payUnit = (l: Listing) => (l.payType === 'kun' ? 'so‘m/kun' : l.payType === 'soat' ? 'so‘m/soat' : '');
export const haqLabel = (l: Listing) => (l.payType === 'kun' ? 'Haq / kun' : l.payType === 'soat' ? 'Haq / soat' : 'Haq');
export const letter = (u?: User) => (u?.name?.trim()?.[0] || '').toUpperCase();
export const payOn = () => !db.settings.paymentsOff;

export function locText(l: Listing, viewer?: User) {
  const d = distanceTo(db, viewer, l);
  return d != null && (viewer?.district || viewer?.lat != null) ? `${l.district} · ${dist(d)}` : l.district;
}

export function jobsShort(l: Listing) {
  if (l.anyJob) return 'Istalgan ish';
  const n = l.jobs.map((j) => jobName(db, j));
  return n.length > 1 ? `${n[0]} +${n.length - 1}` : n[0] || '';
}
export const jobsLong = (l: Listing) => (l.anyJob ? 'Istalgan ish' : l.jobs.map((j) => jobName(db, j)).join(' · '));

export function lcFor(l: Listing, viewer: User | undefined, where: 'home' | 'list'): LcData {
  const t = now();
  const top = isTop(l, t);
  if (l.kind === 'bor') {
    const w = l.when ? (where === 'home' ? dayName(l.when, t) : `${dayName(l.when, t)} ${hhmm(l.when)}`) : '';
    const tags: [string, string?][] = [[genderLabel(l.forWhom), l.forWhom === 'ayol' ? 'mint' : undefined]];
    if (w) tags.push([w]);
    if (l.people > 1 && where === 'list') tags.push([`${l.people} kishi`]);
    const a = ago(l.createdAt, t);
    return { ic: jobIcon(db, l.jobs[0]), t: title(db, l), loc: locText(l, viewer), p: payText(l), u: payUnit(l), top, tags, tm: where === 'home' && a !== 'hozir' ? `${a} oldin` : a, a: 'open', v: l.id };
  }
  const tags: [string, string?][] = [[jobsShort(l)], [genderLabel(l.gender), l.gender === 'ayol' ? 'mint' : undefined]];
  if (l.busy) tags.push(['Band', 'grey']);
  return { ic: 'user', t: title(db, l), loc: locText(l, viewer), p: payText(l), u: payUnit(l), top, tags, tm: ago(l.createdAt, t), a: 'open', v: l.id };
}

export function statusTags(l: Listing): [string, string?][] {
  const s: [string, string?][] = [];
  if (l.status === 'faol') s.push(['Faol', 'mint']);
  else if (l.status === 'tekshirilmoqda') s.push(['Tekshirilmoqda', 'grey']);
  else if (l.status === 'yopilgan') s.push(['Yopilgan', 'grey']);
  else if (l.status === 'rad_etilgan') s.push(['Rad etildi', 'grey']);
  else if (l.status === 'yashirin') s.push(['Yashirin', 'grey']);
  if (l.kind === 'kerak' && l.busy && l.status === 'faol') s.push(['Band', 'grey']);
  return s;
}

export function lcMine(l: Listing): LcData {
  const t = now();
  const top = isTop(l, t);
  const acts: string[] = [];
  if (l.status === 'faol') {
    if (payOn()) acts.push(`<span${A('top', l.id)}>${top ? 'TOPni uzaytirish' : 'TOP qilish'}</span>`);
    acts.push(l.kind === 'bor' ? `<span${A('found', l.id)}>Odam topdim</span>` : `<span${A('busy', l.id)}>Band</span>`);
  } else if (l.status === 'yopilgan' || l.status === 'rad_etilgan') {
    acts.push(`<span${A('repost', l.id)}>Qayta joylash</span>`);
  }
  return {
    ic: l.kind === 'bor' ? jobIcon(db, l.jobs[0]) : 'user', t: title(db, l), loc: l.district, p: payText(l), u: payUnit(l), top,
    tags: statusTags(l), tm: acts.join(' · '), a: 'mine', v: l.id,
  };
}

export function radiusSub(l: Listing) {
  if (l.kind === 'bor') return l.radius === 4 ? 'Ishchilar istalgan joydan' : `Ishchilar ${RADII[l.radius].split('–').pop()!.replace(' km', '')} km gacha`;
  return l.radius === 4 ? 'Uzoqqa ham boraman' : `${RADII[l.radius]} ichida ishlayman`;
}

export function traitTags(l: Listing): [string, string?][] {
  return l.traits.map((t) => { const i = Number(t); return [TRAITS_3P[i], i === 0 ? 'mint' : undefined] as [string, string?]; });
}

export const posterName = (l: Listing) => personTitle(userById(l.owner));
export const whenText = (l: Listing) => (l.when ? whenLabel(l.when, now()) : '—');
export const daysText = (l: Listing) => daysLabel(l.days);
