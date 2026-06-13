import React, { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import api from '../../api/client';

export default function BookingModal({ range, onClose, onSaved }) {
  const [tipo, setTipo] = useState('ferie');
  const [tuttoIlGiorno, setTuttoIlGiorno] = useState(true);
  const [ore, setOre] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) { setError('La nota è obbligatoria.'); return; }
    if (tipo === 'permesso' && !ore) { setError('Specificare il numero di ore.'); return; }
    if (tipo === 'ferie' && !tuttoIlGiorno && !ore) { setError('Specificare le ore oppure selezionare "tutto il giorno".'); return; }

    setSaving(true);
    setError('');
    try {
      await api.post('/api/bookings/', {
        tipo,
        data_inizio: format(range.start, 'yyyy-MM-dd'),
        data_fine: format(range.end, 'yyyy-MM-dd'),
        ore: tipo === 'permesso' || (tipo === 'ferie' && !tuttoIlGiorno) ? parseFloat(ore) : null,
        tutto_il_giorno: tipo === 'ferie' ? tuttoIlGiorno : false,
        note: note.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore nel salvataggio.');
      setSaving(false);
    }
  };

  const singleDay = isSameDay(range.start, range.end);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Nuova Prenotazione</h2>
        <p className="modal-dates">
          {format(range.start, 'dd/MM/yyyy')}
          {!singleDay && <> &rarr; {format(range.end, 'dd/MM/yyyy')}</>}
        </p>

        <div className="form-group">
          <label>Tipo</label>
          <div className="radio-group">
            <label>
              <input type="radio" value="ferie" checked={tipo === 'ferie'} onChange={() => setTipo('ferie')} />
              Ferie
            </label>
            <label>
              <input type="radio" value="permesso" checked={tipo === 'permesso'} onChange={() => setTipo('permesso')} />
              Permesso
            </label>
          </div>
        </div>

        {tipo === 'ferie' && (
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={tuttoIlGiorno}
                onChange={e => setTuttoIlGiorno(e.target.checked)}
              />
              &nbsp;Tutto il giorno
            </label>
            {!tuttoIlGiorno && (
              <input
                type="number"
                placeholder="Ore totali"
                min="0.5"
                max="24"
                step="0.5"
                value={ore}
                onChange={e => setOre(e.target.value)}
              />
            )}
          </div>
        )}

        {tipo === 'permesso' && (
          <div className="form-group">
            <label>Numero di ore</label>
            <input
              type="number"
              placeholder="Es. 2"
              min="0.5"
              max="8"
              step="0.5"
              value={ore}
              onChange={e => setOre(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label>Nota *</label>
          <textarea
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Descrizione obbligatoria..."
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
