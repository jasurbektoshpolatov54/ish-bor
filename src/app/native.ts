// Telefon imkoniyatlari (SPEC 13.2). Brauzerda sinashda oddiy o‘rinbosarlar ishlaydi.
import { Capacitor } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';
import { ActionSheet } from '@capacitor/action-sheet';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { AppLauncher } from '@capacitor/app-launcher';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { toCyrText } from '../ui/cyr';

export const native = Capacitor.isNativePlatform();
let cyr = false;
export const setScript = (c: boolean) => { cyr = c; };
const t = (s: string) => (cyr ? toCyrText(s) : s);

export async function prompt(title: string, message: string, value = '', input: 'text' | 'tel' = 'text'): Promise<string | null> {
  if (native) {
    const r = await Dialog.prompt({ title: t(title), message: t(message), inputText: value, okButtonTitle: t('Tayyor'), cancelButtonTitle: t('Bekor qilish'), inputPlaceholder: input === 'tel' ? '+998' : '' });
    return r.cancelled ? null : r.value;
  }
  return window.prompt(t(message), value);
}

export async function confirm(title: string, message: string, ok = 'Ha', cancel = 'Yo‘q'): Promise<boolean> {
  if (native) return (await Dialog.confirm({ title: t(title), message: t(message), okButtonTitle: t(ok), cancelButtonTitle: t(cancel) })).value;
  return window.confirm(t(message));
}

export async function alert(message: string, title = 'Ish bor') {
  if (native) await Dialog.alert({ title: t(title), message: t(message), buttonTitle: 'OK' });
  else window.alert(t(message));
}

/** Ro‘yxatdan bittasini tanlash. Tanlanmasa -1. */
export async function choose(title: string, options: string[]): Promise<number> {
  if (native) {
    const r = await ActionSheet.showActions({ title: t(title), options: [...options.map((o) => ({ title: t(o) })), { title: t('Bekor qilish'), style: 'CANCEL' as never }] });
    return r.index < options.length ? r.index : -1;
  }
  const a = window.prompt(t(title) + '\n' + options.map((o, i) => `${i + 1}. ${t(o)}`).join('\n'));
  const n = Number(a) - 1;
  return n >= 0 && n < options.length ? n : -1;
}

export const haptic = {
  ok: () => native && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  warn: () => native && Haptics.notification({ type: NotificationType.Warning }).catch(() => {}),
  tap: () => native && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
};

export async function open(url: string) {
  if (native) await AppLauncher.openUrl({ url }).catch(() => { window.open(url, '_system'); });
  else window.open(url, '_blank');
}

export async function locate(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (native) {
      const p = await Geolocation.requestPermissions().catch(() => null);
      if (p && p.location === 'denied') return null;
      const r = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      return { lat: r.coords.latitude, lng: r.coords.longitude };
    }
    return await new Promise((res) => navigator.geolocation.getCurrentPosition((r) => res({ lat: r.coords.latitude, lng: r.coords.longitude }), () => res(null), { timeout: 15000 }));
  } catch { return null; }
}

/* Bildirishnomalar (bot xabarlari o‘rnida) */
let notifyId = 1000;
export async function notifyInit(onOpen: (p?: string, action?: string, extra?: Record<string, string>) => void) {
  if (!native) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
    await LocalNotifications.registerActionTypes({ types: [
      { id: 'yesno', actions: [{ id: 'ha', title: 'Ha' }, { id: 'yoq', title: 'Yo‘q' }] },
      { id: 'yesno_c', actions: [{ id: 'ha', title: 'Ҳа' }, { id: 'yoq', title: 'Йўқ' }] },
    ] });
    await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
      const ex = (e.notification.extra || {}) as Record<string, string>;
      onOpen(ex.p, e.actionId, ex);
    });
  } catch { /* bildirishnoma bo‘lmasa ilova baribir ishlaydi */ }
}
export async function notify(title: string, body: string, extra: Record<string, string> = {}, yesno = false, at?: number, id?: number) {
  const nid = id ?? notifyId++;
  if (!native) { console.info('[bildirishnoma]', title, body, extra); return nid; }
  try {
    await LocalNotifications.schedule({ notifications: [{
      id: nid, title: t(title), body: t(body), extra,
      actionTypeId: yesno ? (cyr ? 'yesno_c' : 'yesno') : undefined,
      schedule: at ? { at: new Date(at), allowWhileIdle: true } : undefined,
      smallIcon: 'ic_stat_ishbor',
    }] });
  } catch { /* */ }
  return nid;
}
export async function cancelNotify(ids: number[]) {
  if (native && ids.length) await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => {});
}

/* Saqlash */
export async function loadText(key: string): Promise<string | null> {
  if (native) return (await Preferences.get({ key })).value;
  try { return localStorage.getItem(key); } catch { return null; }
}
export async function saveText(key: string, value: string) {
  if (native) await Preferences.set({ key, value });
  else try { localStorage.setItem(key, value); } catch { /* */ }
}

/* Ovozli izoh: telefon xotirasida fayl */
export async function saveVoice(id: string, dataUrl: string) {
  if (native) {
    await Filesystem.writeFile({ path: `voice/${id}.txt`, data: dataUrl, directory: Directory.Data, recursive: true, encoding: 'utf8' as never });
  } else try { localStorage.setItem('voice_' + id, dataUrl); } catch { /* */ }
}
export async function loadVoice(id: string): Promise<string | null> {
  try {
    if (native) return String((await Filesystem.readFile({ path: `voice/${id}.txt`, directory: Directory.Data, encoding: 'utf8' as never })).data);
    return localStorage.getItem('voice_' + id);
  } catch { return null; }
}
export async function wipeFiles() {
  if (native) await Filesystem.rmdir({ path: 'voice', directory: Directory.Data, recursive: true }).catch(() => {});
}

export async function shareFile(name: string, base64: string, title: string) {
  if (!native) {
    const a = document.createElement('a');
    a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + base64;
    a.download = name; a.click(); return;
  }
  const w = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache });
  await Share.share({ title: t(title), files: [w.uri], dialogTitle: t(title) }).catch(() => {});
}

/* Ovozli qidiruv */
export async function speechAvailable() {
  if (native) { try { return (await SpeechRecognition.available()).available; } catch { return false; } }
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
export async function listen(): Promise<string | null> {
  if (native) {
    try {
      const p = await SpeechRecognition.checkPermissions();
      if (p.speechRecognition !== 'granted') {
        const r = await SpeechRecognition.requestPermissions();
        if (r.speechRecognition !== 'granted') return null;
      }
      const r = await SpeechRecognition.start({ language: 'uz-UZ', maxResults: 1, popup: true, partialResults: false });
      return r.matches?.[0] ?? null;
    } catch { return null; }
  }
  const SR = (window as never as Record<string, new () => { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onerror: () => void; start: () => void }>).webkitSpeechRecognition
    || (window as never as Record<string, never>).SpeechRecognition;
  if (!SR) return null;
  return new Promise((res) => { const r = new SR(); r.lang = 'uz-UZ'; r.onresult = (e) => res(e.results[0][0].transcript); r.onerror = () => res(null); r.start(); });
}

/* Ovoz yozish (MediaRecorder) */
export const canRecord = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
let rec: MediaRecorder | null = null;
let chunks: Blob[] = [];
export async function recStart(onStop: (dataUrl: string, sec: number) => void): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks = [];
    const started = Date.now();
    rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((x) => x.stop());
      const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' });
      const fr = new FileReader();
      fr.onload = () => onStop(String(fr.result), Math.min(60, Math.round((Date.now() - started) / 1000)));
      fr.readAsDataURL(blob);
      rec = null;
    };
    rec.start();
    return true;
  } catch { return false; }
}
export const recStop = () => { if (rec && rec.state !== 'inactive') rec.stop(); };
export const recording = () => !!rec;

export function play(dataUrl: string) { new Audio(dataUrl).play().catch(() => {}); }
