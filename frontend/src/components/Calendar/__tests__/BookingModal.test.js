import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BookingModal from '../BookingModal.vue';
import api from '../../../api/client';

vi.mock('../../../api/client', () => ({
  default: { post: vi.fn() },
}));

const range = { start: new Date(2026, 5, 22), end: new Date(2026, 5, 26) };

describe('BookingModal.vue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra range di date in formato dd/MM/yyyy', () => {
    const w = mount(BookingModal, { props: { range } });
    expect(w.text()).toContain('22/06/2026');
    expect(w.text()).toContain('26/06/2026');
  });

  it('default tipo = ferie con "Tutto il giorno" attivo', () => {
    const w = mount(BookingModal, { props: { range } });
    expect(w.text()).toContain('Tutto il giorno');
  });

  it('mostra campo ore quando tipo = permesso', async () => {
    const w = mount(BookingModal, { props: { range } });
    const radios = w.findAll('input[type="radio"]');
    await radios[1].setValue();  // permesso
    expect(w.find('input[type="number"]').exists()).toBe(true);
  });

  it('mostra errore se nota mancante', async () => {
    const w = mount(BookingModal, { props: { range } });
    const buttons = w.findAll('button');
    const salva = buttons.find(b => b.text() === 'Salva');
    await salva.trigger('click');
    expect(w.text()).toContain('La nota è obbligatoria');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('posta booking con tutto_il_giorno=true per ferie giornaliere', async () => {
    api.post.mockResolvedValueOnce({});
    const w = mount(BookingModal, { props: { range } });
    await w.find('textarea').setValue('settimana off');
    const buttons = w.findAll('button');
    const salva = buttons.find(b => b.text() === 'Salva');
    await salva.trigger('click');
    await new Promise(r => setTimeout(r, 10));

    expect(api.post).toHaveBeenCalledWith('/api/bookings/', expect.objectContaining({
      tipo: 'ferie',
      data_inizio: '2026-06-22',
      data_fine: '2026-06-26',
      tutto_il_giorno: true,
      ore: null,
      note: 'settimana off',
    }));
    expect(w.emitted('saved')).toBeTruthy();
  });

  it('posta booking permesso con ore', async () => {
    api.post.mockResolvedValueOnce({});
    const w = mount(BookingModal, { props: { range: { start: range.start, end: range.start } } });
    const radios = w.findAll('input[type="radio"]');
    await radios[1].setValue();  // permesso
    await w.find('input[type="number"]').setValue('4');
    await w.find('textarea').setValue('medico');
    const buttons = w.findAll('button');
    await buttons.find(b => b.text() === 'Salva').trigger('click');
    await new Promise(r => setTimeout(r, 10));

    expect(api.post).toHaveBeenCalledWith('/api/bookings/', expect.objectContaining({
      tipo: 'permesso',
      ore: 4,
      note: 'medico',
    }));
  });

  it('emette close al click su Annulla', async () => {
    const w = mount(BookingModal, { props: { range } });
    const annulla = w.findAll('button').find(b => b.text() === 'Annulla');
    await annulla.trigger('click');
    expect(w.emitted('close')).toBeTruthy();
  });
});
