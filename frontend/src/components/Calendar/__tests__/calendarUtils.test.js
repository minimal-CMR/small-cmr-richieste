import { describe, it, expect } from 'vitest';
import { isFestivo, getEaster, WEEKDAYS, STATO_COLORS, STATO_LABELS } from '../calendarUtils';

describe('calendarUtils (richieste)', () => {
  it('WEEKDAYS inizia da Lun', () => {
    expect(WEEKDAYS[0]).toBe('Lun');
    expect(WEEKDAYS).toHaveLength(7);
  });

  it('STATO_LABELS e STATO_COLORS coprono i 4 stati', () => {
    ['in_validazione', 'approvato', 'non_approvato', 'in_attesa_conferma'].forEach(s => {
      expect(STATO_LABELS[s]).toBeTruthy();
      expect(STATO_COLORS[s]).toMatch(/^#/);
    });
  });

  it('getEaster 2026 = 5 aprile', () => {
    const e = getEaster(2026);
    expect(e.getMonth()).toBe(3);
    expect(e.getDate()).toBe(5);
  });

  it('isFestivo riconosce sabato, domenica, Natale, Capodanno, Pasquetta', () => {
    expect(isFestivo(new Date(2026, 5, 13))).toBe(true);   // sab
    expect(isFestivo(new Date(2026, 5, 14))).toBe(true);   // dom
    expect(isFestivo(new Date(2026, 11, 25))).toBe(true);  // Natale
    expect(isFestivo(new Date(2026, 0, 1))).toBe(true);    // Capodanno
    expect(isFestivo(new Date(2026, 3, 6))).toBe(true);    // Pasquetta 2026
  });

  it('giorno feriale comune non festivo', () => {
    expect(isFestivo(new Date(2026, 5, 16))).toBe(false);
  });
});
