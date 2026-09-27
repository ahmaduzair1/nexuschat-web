import { clsx } from 'clsx';
import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';

export function cn(...args) {
  return clsx(args);
}

export function directChatId(userA, userB) {
  const ids = [userA, userB].sort();
  return `d_${ids[0]}_${ids[1]}`;
}

export function pairKey(userA, userB) {
  const ids = [userA, userB].sort();
  return `${ids[0]}_${ids[1]}`;
}

export function normalizeSearch(value) {
  return (value || '').trim().toLowerCase();
}

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

/** Last 10 digits so +92 300… and 0300… match the same person. */
export function phoneMatchKey(value) {
  let digits = digitsOnly(value);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function defaultAvatarUrl(name) {
  const encoded = encodeURIComponent(name?.trim() || 'User');
  return `https://ui-avatars.com/api/?name=${encoded}&background=00C896&color=0A0E1A&size=256&bold=true&format=png`;
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatChatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd/MM/yyyy');
}

export function formatMessageTime(value) {
  const date = toDate(value);
  if (!date) return '';
  return format(date, 'HH:mm');
}

export function formatLastSeen(value) {
  const date = toDate(value);
  if (!date) return '';
  try {
    return `last seen ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  } catch {
    return '';
  }
}

export function formatCallDuration(startedAt, endedAt) {
  const start = toDate(startedAt);
  const end = toDate(endedAt);
  if (!start || !end) return '';
  const secs = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
