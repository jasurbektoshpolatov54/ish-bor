export type Kind = 'bor' | 'kerak';
export type ForWhom = 'erkak' | 'ayol' | 'farqi';
export type Gender = 'erkak' | 'ayol';
export type PayType = 'kun' | 'soat' | 'kelishiladi';
export type Status = 'tekshirilmoqda' | 'faol' | 'yopilgan' | 'rad_etilgan' | 'yashirin' | 'ochirilgan';
export type Script = 'lat' | 'cyr';
export type Theme = 'dark' | 'light' | 'auto';

export interface User {
  id: string;
  name: string;
  surname?: string;
  username?: string;
  phone?: string;
  district?: string;
  lat?: number;
  lng?: number;
  /** 0..4: 1–5, 5–10, 10–20, 20–35, 35+ */
  radius?: number;
  blocked?: boolean;
  blockReason?: string;
  verified?: boolean;
  createdAt: number;
  lastSeen?: number;
  script: Script;
  theme: Theme;
  lastPayApp?: string;
  lastKind?: Kind;
  test?: boolean;
  role?: 'beruvchi' | 'ishchi';
}

export interface Listing {
  id: string;
  kind: Kind;
  owner: string;
  jobs: string[];
  anyJob?: boolean;
  izoh?: string;
  extra?: string;
  voice?: string;
  voiceSec?: number;
  district: string;
  lat: number;
  lng: number;
  radius: number;
  when?: number;
  people: number;
  forWhom?: ForWhom;
  gender?: Gender;
  payType: PayType;
  pay?: number;
  days: number[];
  traits: string[];
  showPhone: boolean;
  busy?: boolean;
  status: Status;
  reviewReason?: string;
  rejectReason?: string;
  hiddenUntil?: number;
  topUntil?: number;
  topStarted?: number;
  topPausedLeft?: number;
  createdAt: number;
  closedAt?: number;
  confirmAt?: number;
  askedAt?: number;
  calls: number;
  views: number;
  notified?: Record<string, number>;
}

export interface Complaint {
  id: string; listingId: string; by: string; reason: number; note?: string; voice?: string; at: number; resolved?: boolean;
}

export interface Payment {
  id: string; order: string; listingId: string; userId: string; app: string; amount: number; days: number;
  status: 'kutilmoqda' | 'otdi' | 'otmadi' | 'qaytarildi'; at: number; test: boolean;
}

export interface Support { id: string; userId: string; text: string; at: number; answered?: boolean; }
export interface Audit { at: number; action: string; obj?: string; before?: string; after?: string; }
export interface AutoAct { id: string; at: number; rule: string; listingId: string; undone?: boolean; prev?: Status; }
export interface LoginLog { at: number; device: string; ok: boolean; }
export interface JobType { id: string; name: string; icon: string; hidden?: boolean; }
export interface District { name: string; cyr: string; lat: number; lng: number; enabled: boolean; }

export interface Settings {
  topPrice: number; topDays: number; complaintThreshold: number; moneyThreshold: number;
  sessionMin: number; maxAttempts: number; lockMin: number; kerakDays: number;
  stopPosting: boolean; paymentsOff: boolean; maintenance: boolean;
}

export interface AdminAuth { salt: string; hash: string; iter: number; fails: number; lockUntil?: number; }

export interface Note { id: string; to: string; text: string; btns?: string[]; p?: string; at: number; }

export interface DB {
  v: number;
  users: User[];
  listings: Listing[];
  complaints: Complaint[];
  payments: Payment[];
  support: Support[];
  audit: Audit[];
  auto: AutoAct[];
  logins: LoginLog[];
  jobTypes: JobType[];
  districts: District[];
  words: string[];
  settings: Settings;
  admin?: AdminAuth;
  ownerId?: string;
  acting?: string;
  timeOffset: number;
  seq: number;
  orderSeq: number;
  notes: Note[];
  drafts: Record<string, unknown>;
}
