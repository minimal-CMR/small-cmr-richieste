import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, addMonths, subMonths,
  isWithinInterval, parseISO,
} from 'date-fns';
import { it } from 'date-fns/locale';
import BookingModal from './BookingModal';
import MonthPicker from './MonthPicker';
import api from '../../api/client';
import { isFestivo, WEEKDAYS, STATO_COLORS, STATO_LABELS, getEaster } from './calendarUtils';

export default function Calendar({ userId = null, readOnly = false, onBookingsChange, refreshTrigger = 0, onStateChange = null }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [rangeStart, setRangeStart] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);

  const fetchBookings = useCallback(async () => {
    try {
      const r = userId
        ? await api.get('/api/bookings/all', { params: { user_id: userId } })
        : await api.get('/api/bookings/my');
      setBookings(r.data);
    } catch (e) {
      console.error(e);
    }
    // refreshTrigger nei deps genera un nuovo riferimento di funzione ogni volta che
    // il parent lo incrementa, costringendo il useEffect qui sotto a ri-eseguire il fetch.
  }, [userId, refreshTrigger]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Mappa 'yyyy-MM' → stati unici presenti quel mese, così MonthPicker può disegnare
  // le barre colorate anche per prenotazioni multi-mese (itera ogni mese tra
  // data_inizio e data_fine, non solo il mese di inizio).
  const monthStati = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      try {
        const start = parseISO(b.data_inizio);
        const end = parseISO(b.data_fine);
        let cur = startOfMonth(start);
        while (cur <= end) {
          const key = format(cur, 'yyyy-MM');
          if (!map[key]) map[key] = new Set();
          map[key].add(b.stato);
          cur = addMonths(cur, 1);
        }
      } catch {}
    });
    const result = {};
    Object.entries(map).forEach(([k, v]) => { result[k] = [...v]; });
    return result;
  }, [bookings]);

  const getCells = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const cells = [];
    let day = start;
    while (day <= end) { cells.push(day); day = addDays(day, 1); }
    return cells;
  };

  const getBookingsForDay = (day) =>
    bookings.filter(b => {
      try {
        return isWithinInterval(day, { start: parseISO(b.data_inizio), end: parseISO(b.data_fine) });
      } catch { return false; }
    });

  const handleDayClick = (day) => {
    if (readOnly) return;
    setDetailBooking(null);
    if (!rangeStart) {
      setRangeStart(day);
    } else {
      const [start, end] = rangeStart <= day ? [rangeStart, day] : [day, rangeStart];
      setSelectedRange({ start, end });
      setRangeStart(null);
      setShowModal(true);
    }
  };

  const handleDayDoubleClick = (day) => {
    if (readOnly) return;
    setRangeStart(null);
    setDetailBooking(null);
    setSelectedRange({ start: day, end: day });
    setShowModal(true);
  };

  const handleDotClick = (e, booking) => {
    e.stopPropagation();
    setRangeStart(null);
    setDetailBooking(prev => prev?.id === booking.id ? null : booking);
  };

  const handleDeleteBooking = async () => {
    if (!detailBooking) return;
    try {
      await api.delete(`/api/bookings/${detailBooking.id}`);
      setDetailBooking(null);
      fetchBookings();
      onBookingsChange?.();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setSelectedRange(null);
    fetchBookings();
    onBookingsChange?.();
  };

  const cells = getCells();

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}>&#8249;</button>
        <span className="calendar-title" onClick={() => setShowMonthPicker(true)}>
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}>&#8250;</button>
      </div>

      {showMonthPicker && (
        <MonthPicker
          current={currentDate}
          monthStati={monthStati}
          onSelect={d => { setCurrentDate(d); setShowMonthPicker(false); }}
          onClose={() => setShowMonthPicker(false)}
        />
      )}

      <div className="calendar-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells.map((day, i) => {
          const dayBookings = getBookingsForDay(day);
          const inMonth = isSameMonth(day, currentDate);
          const isStart = rangeStart && isSameDay(day, rangeStart);
          return (
            <div
              key={i}
              className={`calendar-day${!inMonth ? ' faded' : ''}${isStart ? ' range-start' : ''}`}
              onClick={() => handleDayClick(day)}
              onDoubleClick={() => handleDayDoubleClick(day)}
            >
              <span className={`day-number${isFestivo(day) ? ' festivo' : ''}`}>{format(day, 'd')}</span>
              <div className="day-dots">
                {dayBookings.map(b => (
                  <span
                    key={b.id}
                    className="booking-dot"
                    style={{ backgroundColor: STATO_COLORS[b.stato] }}
                    title={`${b.tipo} — ${STATO_LABELS[b.stato]}`}
                    onClick={e => handleDotClick(e, b)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {rangeStart && (
        <p className="range-hint">
          Clicca su un secondo giorno per selezionare il range, oppure doppio-click per un giorno singolo.
        </p>
      )}

      {/* Booking creation modal */}
      {showModal && selectedRange && (
        <BookingModal
          range={selectedRange}
          onClose={() => { setShowModal(false); setSelectedRange(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Booking detail / delete modal */}
      {detailBooking && (
        <div className="modal-overlay" onClick={() => setDetailBooking(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dettaglio Prenotazione</h2>
              <button className="btn-close" onClick={() => setDetailBooking(null)}>×</button>
            </div>
            <div className="detail-grid">
              <span className="detail-label">Tipo</span>
              <span className="detail-value capitalize">{detailBooking.tipo}</span>

              <span className="detail-label">Date</span>
              <span className="detail-value">
                {detailBooking.data_inizio}
                {detailBooking.data_inizio !== detailBooking.data_fine && ` → ${detailBooking.data_fine}`}
              </span>

              <span className="detail-label">Durata</span>
              <span className="detail-value">
                {detailBooking.tutto_il_giorno ? 'Tutto il giorno' : detailBooking.ore ? `${detailBooking.ore} ore` : '—'}
              </span>

              <span className="detail-label">Stato</span>
              <span className={`stato-badge ${detailBooking.stato}`}>
                {STATO_LABELS[detailBooking.stato]}
              </span>

              <span className="detail-label">Nota</span>
              <span className="detail-value">{detailBooking.note}</span>

              {onStateChange && (
                <>
                  <span className="detail-label">Cambia Stato</span>
                  <select
                    className="stato-select"
                    value={detailBooking.stato}
                    onChange={async e => {
                      const newStato = e.target.value;
                      try {
                        await onStateChange(detailBooking.id, newStato);
                        setDetailBooking(prev => prev ? { ...prev, stato: newStato } : null);
                      } catch {}
                    }}
                  >
                    {Object.entries(STATO_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDetailBooking(null)}>Chiudi</button>
              {!readOnly && (
                <button className="btn-danger" onClick={handleDeleteBooking}>Elimina</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
