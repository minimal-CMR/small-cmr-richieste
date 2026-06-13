import { isSameDay } from 'date-fns';

export const STATO_COLORS = {
  in_validazione:    '#f59e0b',
  approvato:         '#22c55e',
  non_approvato:     '#ef4444',
  in_attesa_conferma: '#f59e0b',
};

export const STATO_LABELS = {
  in_validazione:    'In Validazione',
  approvato:         'Approvato',
  non_approvato:     'Non Approvato',
  in_attesa_conferma: 'In Attesa di Conferma',
};

export const WEEKDAYS =['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// Algoritmo Gregoriano Anonimo per il calcolo della Pasqua
export function getEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}


// Festività italiane: domeniche + fisse + Pasqua/Pasquetta
export function isFestivo(date) {
  if (date.getDay() === 0 || date.getDay() === 6) return true; // domenica e sabato

  const m = date.getMonth() + 1;
  const d = date.getDate();
  const fisse = [[1,1],[1,6],[4,25],[5,1],[6,2],[8,15],[11,1],[12,8],[12,25],[12,26]];
  if (fisse.some(([fm, fd]) => fm === m && fd === d)) return true;

  const pasqua = getEaster(date.getFullYear());
  const pasquetta = new Date(pasqua);
  pasquetta.setDate(pasquetta.getDate() + 1);
  return isSameDay(date, pasqua) || isSameDay(date, pasquetta);
}