import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import Calendar from '../components/Calendar/Calendar';

const STATI = ['in_validazione', 'approvato', 'non_approvato', 'in_attesa_conferma'];

const STATO_LABELS = {
  in_validazione:     'In Validazione',
  approvato:          'Approvato',
  non_approvato:      'Non Approvato',
  in_attesa_conferma: 'In Attesa di Conferma',
};

const STATO_COLORS = {
  in_validazione:     '#f59e0b',
  approvato:          '#22c55e',
  non_approvato:      '#ef4444',
  in_attesa_conferma: '#f59e0b',
};

// il rosso ha abbastanza contrasto per il bianco; giallo e verde reggono meglio il testo scuro
const STATO_TEXT = {
  in_validazione:     '#78350f',
  approvato:          '#14532d',
  non_approvato:      '#ffffff',
  in_attesa_conferma: '#78350f',
};

const statoSelectStyle = (stato) => stato ? {
  backgroundColor: STATO_COLORS[stato],
  color: STATO_TEXT[stato],
  borderColor: STATO_COLORS[stato],
  fontWeight: 600,
} : {};

export default function Approvazioni() {
  const [users, setUsers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [filters, setFilters] = useState({ nome: '', cognome: '', azienda: '', email: '', da: '', a: '', stato: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState([]);
  const [bulkStato, setBulkStato] = useState('approvato');
  const [exportIds, setExportIds] = useState([]);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);

  useEffect(() => { fetchUsers(); }, []);

  const fetchAllBookings = useCallback(async (da, a) => {
    const params = {};
    if (da) params.da = da;
    if (a) params.a = a;
    const r = await api.get('/api/bookings/all', { params });
    setAllBookings(r.data);
  }, []);

  // Initial fetch + refetch when date filters change
  useEffect(() => {
    fetchAllBookings(filters.da, filters.a);
  }, [filters.da, filters.a, fetchAllBookings]);

  useEffect(() => {
    if (selectedUser) fetchUserBookings(selectedUser.id);
  }, [selectedUser]);

  const fetchUsers = async () => {
    const r = await api.get('/api/users/');
    setUsers(r.data);
  };

  const fetchUserBookings = async (userId) => {
    const r = await api.get('/api/bookings/all', { params: { user_id: userId } });
    setUserBookings(r.data);
    setSelectedBookingIds([]);
  };

  const refreshAfterStateChange = () => {
    if (selectedUser) fetchUserBookings(selectedUser.id);
    fetchAllBookings(filters.da, filters.a);
    setCalendarRefreshTrigger(t => t + 1);
  };

  const getStatiForUser = (userId) => {
    const stati = new Set(allBookings.filter(b => b.user_id === userId).map(b => b.stato));
    return [...stati];
  };

  const handleBulkStato = async () => {
    if (!selectedBookingIds.length) return;
    await api.patch('/api/bookings/bulk/stato', { booking_ids: selectedBookingIds, stato: bulkStato });
    refreshAfterStateChange();
  };

  const handleSingleStato = async (bookingId, stato) => {
    await api.patch(`/api/bookings/${bookingId}/stato`, { stato });
    refreshAfterStateChange();
  };

  const handleExportCSV = async (ids) => {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('user_ids', id));
    const r = await api.get(`/api/bookings/export/csv?${params.toString()}`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleBooking = (id) =>
    setSelectedBookingIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Users who have at least one booking in the fetched range (when da/a are active)
  const usersWithBookings = (filters.da || filters.a)
    ? new Set(allBookings.map(b => b.user_id))
    : null;

  const filteredUsers = users.filter(u => {
    if (usersWithBookings && !usersWithBookings.has(u.id)) return false;
    if (filters.nome && !u.nome.toLowerCase().includes(filters.nome.toLowerCase())) return false;
    if (filters.cognome && !u.cognome.toLowerCase().includes(filters.cognome.toLowerCase())) return false;
    if (filters.azienda && !(u.azienda || '').toLowerCase().includes(filters.azienda.toLowerCase())) return false;
    if (filters.email && !u.email.toLowerCase().includes(filters.email.toLowerCase())) return false;
    if (filters.stato && !allBookings.some(b => b.user_id === u.id && b.stato === filters.stato)) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Approvazioni</h1>
        <button
          className="btn-secondary"
          onClick={() => handleExportCSV(exportIds.length ? exportIds : filteredUsers.map(u => u.id))}
        >
          Export CSV {exportIds.length ? `(${exportIds.length})` : 'tutti'}
        </button>
      </div>

      <div className="filters">
        {['nome', 'cognome', 'azienda', 'email'].map(f => (
          <input
            key={f}
            placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
            value={filters[f]}
            onChange={e => setFilters(p => ({ ...p, [f]: e.target.value }))}
          />
        ))}
        <input
          type="date"
          value={filters.da}
          onChange={e => setFilters(p => ({ ...p, da: e.target.value }))}
          title="Da"
        />
        <input
          type="date"
          value={filters.a}
          onChange={e => setFilters(p => ({ ...p, a: e.target.value }))}
          title="A"
        />
        <select
          value={filters.stato}
          onChange={e => setFilters(p => ({ ...p, stato: e.target.value }))}
          style={statoSelectStyle(filters.stato)}
        >
          <option value="">Tutti gli stati</option>
          {STATI.map(s => (
            <option key={s} value={s} style={{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }}>
              {STATO_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="approvazioni-layout">
        {/* User list */}
        <div className="users-list">
          {filteredUsers.map(u => (
            <div
              key={u.id}
              className={`user-row${selectedUser?.id === u.id ? ' selected' : ''}`}
              onClick={() => setSelectedUser(u)}
            >
              <input
                type="checkbox"
                checked={exportIds.includes(u.id)}
                onClick={e => e.stopPropagation()}
                onChange={e =>
                  setExportIds(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))
                }
              />
              <div className="user-info">
                <strong>{u.nome} {u.cognome}</strong>
                <small>{u.email}{u.azienda ? ` — ${u.azienda}` : ''}</small>
              </div>
              <div className="user-stati">
                {getStatiForUser(u.id).map(s => (
                  <span key={s} className="stato-dot" style={{ backgroundColor: STATO_COLORS[s] }} title={STATO_LABELS[s]} />
                ))}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && <p className="empty-state">Nessun utente trovato.</p>}
        </div>

        {/* User detail */}
        {selectedUser ? (
          <div className="user-detail">
            <div className="detail-header">
              <h2>{selectedUser.nome} {selectedUser.cognome}</h2>
              <button className="btn-sm" onClick={() => handleExportCSV([selectedUser.id])}>
                Export CSV
              </button>
            </div>

            {/* Calendar view (read-only, visual reference) */}
            <div className="calendar-section">
              <p className="section-title">Calendario</p>
              <Calendar
                userId={selectedUser.id}
                readOnly
                refreshTrigger={calendarRefreshTrigger}
                onStateChange={handleSingleStato}
              />
            </div>

            {/* Booking list with state management */}
            <p className="section-title">Gestione Prenotazioni</p>

            <div className="bulk-bar">
              <select
                value={bulkStato}
                onChange={e => setBulkStato(e.target.value)}
                style={statoSelectStyle(bulkStato)}
              >
                {STATI.map(s => (
                  <option key={s} value={s} style={{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }}>
                    {STATO_LABELS[s]}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                onClick={handleBulkStato}
                disabled={!selectedBookingIds.length}
              >
                Applica a {selectedBookingIds.length} selezionati
              </button>
            </div>

            <div className="bookings-list">
              {userBookings.length === 0 && <p className="empty-state">Nessuna prenotazione.</p>}
              {userBookings.map(b => (
                <div key={b.id} className="booking-item">
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.includes(b.id)}
                    onChange={() => toggleBooking(b.id)}
                  />
                  <span className="stato-dot" style={{ backgroundColor: STATO_COLORS[b.stato] }} />
                  <span className="booking-tipo">{b.tipo}</span>
                  <span className="booking-date">
                    {b.data_inizio}{b.data_inizio !== b.data_fine ? ` → ${b.data_fine}` : ''}
                  </span>
                  <span className="booking-ore">
                    {b.tutto_il_giorno ? 'Tutto il giorno' : b.ore ? `${b.ore}h` : '—'}
                  </span>
                  <span className="booking-note" title={b.note}>{b.note}</span>
                  <select
                    className="stato-select"
                    value={b.stato}
                    onChange={e => handleSingleStato(b.id, e.target.value)}
                    style={statoSelectStyle(b.stato)}
                  >
                    {STATI.map(s => (
                      <option key={s} value={s} style={{ backgroundColor: STATO_COLORS[s], color: STATO_TEXT[s] }}>
                        {STATO_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="detail-empty">Seleziona un utente per vedere le prenotazioni.</div>
        )}
      </div>
    </div>
  );
}
